import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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
