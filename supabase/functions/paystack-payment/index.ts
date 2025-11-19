import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PaymentRequest {
  action: "initialize" | "verify";
  foodItemId?: string;
  buyerEmail?: string;
  buyerNote?: string;
  reference?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackSecretKey) {
      throw new Error("PAYSTACK_SECRET_KEY not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, foodItemId, buyerEmail, buyerNote, reference }: PaymentRequest = await req.json();

    if (action === "initialize") {
      // Fetch food item details
      const { data: foodItem, error: foodError } = await supabase
        .from("food_items")
        .select("*, profiles!inner(currency)")
        .eq("id", foodItemId)
        .single();

      if (foodError || !foodItem) {
        console.error("Food item not found:", foodError);
        return new Response(
          JSON.stringify({ error: "Food item not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const serviceFeePercent = 0.05; // 5% service fee
      const serviceFee = foodItem.price * serviceFeePercent;
      const totalAmount = foodItem.price + serviceFee;

      // Convert amount to kobo (smallest currency unit for Paystack)
      const amountInKobo = Math.round(totalAmount * 100);

      // Initialize Paystack payment
      const paystackResponse = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: buyerEmail,
          amount: amountInKobo,
          currency: foodItem.currency || "NGN",
          metadata: {
            food_item_id: foodItemId,
            recipient_id: foodItem.user_id,
            buyer_note: buyerNote || "",
            item_price: foodItem.price,
            service_fee: serviceFee,
            total_amount: totalAmount,
          },
        }),
      });

      const paystackData = await paystackResponse.json();
      console.log("Paystack initialization response:", paystackData);

      if (!paystackData.status) {
        throw new Error(paystackData.message || "Payment initialization failed");
      }

      // Create transaction record with pending status
      const { error: transactionError } = await supabase
        .from("transactions")
        .insert({
          food_item_id: foodItemId,
          recipient_id: foodItem.user_id,
          buyer_email: buyerEmail,
          buyer_note: buyerNote,
          item_price: foodItem.price,
          service_fee: serviceFee,
          total_amount: totalAmount,
          currency: foodItem.currency || "NGN",
          status: "pending",
          payment_intent_id: paystackData.data.reference,
        });

      if (transactionError) {
        console.error("Error creating transaction:", transactionError);
      }

      return new Response(
        JSON.stringify({
          authorization_url: paystackData.data.authorization_url,
          reference: paystackData.data.reference,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "verify") {
      // Verify Paystack payment
      const paystackResponse = await fetch(
        `https://api.paystack.co/transaction/verify/${reference}`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${paystackSecretKey}`,
          },
        }
      );

      const paystackData = await paystackResponse.json();
      console.log("Paystack verification response:", paystackData);

      if (!paystackData.status) {
        throw new Error("Payment verification failed");
      }

      const paymentStatus = paystackData.data.status === "success" ? "completed" : "failed";

      // Update transaction status
      const { error: updateError } = await supabase
        .from("transactions")
        .update({ status: paymentStatus })
        .eq("payment_intent_id", reference);

      if (updateError) {
        console.error("Error updating transaction:", updateError);
      }

      // Send email notifications if payment was successful
      if (paymentStatus === "completed") {
        try {
          const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
          
          // Get transaction details for emails
          const { data: txData } = await supabase
            .from("transactions")
            .select(`
              *,
              food_items:food_item_id (name),
              profiles:recipient_id (full_name, email)
            `)
            .eq("payment_intent_id", reference)
            .single();

          if (txData) {
            const getCurrencySymbol = (currency: string) => {
              const symbols: { [key: string]: string } = {
                USD: "$", EUR: "€", GBP: "£", NGN: "₦"
              };
              return symbols[currency] || "$";
            };

            const currencySymbol = getCurrencySymbol(txData.currency);
            const recipientName = txData.profiles?.full_name || "there";
            const itemName = txData.food_items?.name || "gift";

            // Email to buyer
            await resend.emails.send({
              from: "LunchBuddy <onboarding@resend.dev>",
              to: [txData.buyer_email],
              subject: "Gift Purchase Confirmed! 🎁",
              html: `
                <h1>Thank you for your generous gift!</h1>
                <p>Your gift purchase has been confirmed.</p>
                <h2>Order Details:</h2>
                <ul>
                  <li><strong>Item:</strong> ${itemName}</li>
                  <li><strong>Recipient:</strong> ${recipientName}</li>
                  <li><strong>Amount:</strong> ${currencySymbol}${Number(txData.total_amount).toFixed(2)}</li>
                </ul>
                ${txData.buyer_note ? `<p><strong>Your message:</strong> "${txData.buyer_note}"</p>` : ""}
                <p>The recipient will be notified about your thoughtful gift.</p>
                <p>Best regards,<br>The LunchBuddy Team</p>
              `,
            });

            // Email to recipient
            await resend.emails.send({
              from: "LunchBuddy <onboarding@resend.dev>",
              to: [txData.profiles?.email],
              subject: "You received a gift! 🎉",
              html: `
                <h1>Great news, ${recipientName}!</h1>
                <p>Someone just bought you a gift from your wishlist!</p>
                <h2>Gift Details:</h2>
                <ul>
                  <li><strong>Item:</strong> ${itemName}</li>
                  <li><strong>From:</strong> ${txData.buyer_email}</li>
                </ul>
                ${txData.buyer_note ? `<p><strong>Their message:</strong> "${txData.buyer_note}"</p>` : ""}
                <p>Enjoy your gift!</p>
                <p>Best regards,<br>The LunchBuddy Team</p>
              `,
            });

            console.log("Email notifications sent successfully");

            // Mark food item as fulfilled
            const { error: fulfillError } = await supabase
              .from("food_items")
              .update({ fulfilled: true, fulfilled_at: new Date().toISOString() })
              .eq("id", txData.food_item_id);

            if (fulfillError) {
              console.error("Error marking item as fulfilled:", fulfillError);
            }
          }
        } catch (emailError) {
          console.error("Error sending emails:", emailError);
          // Don't fail the request if emails fail
        }
      }

      return new Response(
        JSON.stringify({
          status: paymentStatus,
          data: paystackData.data,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in paystack-payment function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
