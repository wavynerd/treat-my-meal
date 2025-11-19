import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      throw new Error('Stripe secret key not configured');
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
    });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, ...params } = await req.json();

    if (action === 'initialize') {
      const { foodItemId, buyerEmail, buyerNote } = params;

      // Get food item details
      const { data: foodItem, error: itemError } = await supabase
        .from('food_items')
        .select('*, profiles!food_items_user_id_fkey(full_name)')
        .eq('id', foodItemId)
        .single();

      if (itemError || !foodItem) {
        throw new Error('Food item not found');
      }

      const serviceFeePercent = 5;
      const serviceFee = foodItem.price * (serviceFeePercent / 100);
      const totalAmount = foodItem.price + serviceFee;

      // Create Stripe checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: (foodItem.currency || 'USD').toLowerCase(),
              product_data: {
                name: foodItem.name,
                description: `Gift for ${foodItem.profiles?.full_name || 'someone special'}`,
              },
              unit_amount: Math.round(foodItem.price * 100), // Convert to cents
            },
            quantity: 1,
          },
          {
            price_data: {
              currency: (foodItem.currency || 'USD').toLowerCase(),
              product_data: {
                name: 'Service Fee',
                description: `${serviceFeePercent}% platform fee`,
              },
              unit_amount: Math.round(serviceFee * 100), // Convert to cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${req.headers.get('origin')}/payment/success?reference={CHECKOUT_SESSION_ID}&provider=stripe`,
        cancel_url: `${req.headers.get('origin')}/wishlist/${foodItem.user_id}`,
        customer_email: buyerEmail,
        metadata: {
          foodItemId,
          recipientId: foodItem.user_id,
          buyerEmail,
          buyerNote: buyerNote || '',
          itemPrice: foodItem.price.toString(),
          serviceFee: serviceFee.toString(),
          totalAmount: totalAmount.toString(),
          currency: foodItem.currency || 'USD',
        },
      });

      // Create pending transaction
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          payment_intent_id: session.id,
          food_item_id: foodItemId,
          recipient_id: foodItem.user_id,
          buyer_email: buyerEmail,
          buyer_note: buyerNote,
          item_price: foodItem.price,
          service_fee: serviceFee,
          total_amount: totalAmount,
          currency: foodItem.currency || 'USD',
          status: 'pending',
        });

      if (transactionError) {
        console.error('Transaction creation error:', transactionError);
      }

      return new Response(
        JSON.stringify({ 
          checkout_url: session.url,
          session_id: session.id,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'verify') {
      const { reference } = params;

      // Retrieve the checkout session
      const session = await stripe.checkout.sessions.retrieve(reference);

      if (session.payment_status === 'paid') {
        // Update transaction status
        const { error: updateError } = await supabase
          .from('transactions')
          .update({ status: 'completed' })
          .eq('payment_intent_id', reference);

        if (updateError) {
          console.error('Transaction update error:', updateError);
        }

        // Send email notifications
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

        return new Response(
          JSON.stringify({ status: 'completed', session }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ status: 'failed', session }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action');
  } catch (error: any) {
    console.error('Stripe payment error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
