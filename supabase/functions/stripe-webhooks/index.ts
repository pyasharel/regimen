import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
});

const cryptoProvider = Stripe.createSubtleCryptoProvider();

serve(async (req) => {
  const signature = req.headers.get("Stripe-Signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!signature || !webhookSecret) {
    return new Response("No signature or webhook secret", { status: 400 });
  }

  try {
    const body = await req.text();
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider
    );

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log(`Processing webhook: ${event.type}`);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.subscription_data?.metadata?.supabase_user_id;
        
        if (userId && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          await updateSubscriptionInDb(supabaseClient, userId, subscription);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata.supabase_user_id;
        
        if (userId) {
          await updateSubscriptionInDb(supabaseClient, userId, subscription);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata.supabase_user_id;
        
        if (userId) {
          await supabaseClient
            .from('profiles')
            .update({
              subscription_status: 'canceled',
              subscription_end_date: new Date(subscription.current_period_end * 1000).toISOString(),
            })
            .eq('user_id', userId);
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
          const userId = subscription.metadata.supabase_user_id;
          
          if (userId) {
            await updateSubscriptionInDb(supabaseClient, userId, subscription);
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
          const userId = subscription.metadata.supabase_user_id;
          
          if (userId) {
            await supabaseClient
              .from('profiles')
              .update({
                subscription_status: 'past_due',
                last_payment_attempt: new Date().toISOString(),
              })
              .eq('user_id', userId);
          }
        }
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("Webhook error:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }
});

async function updateSubscriptionInDb(supabaseClient: any, userId: string, subscription: Stripe.Subscription) {
  const status = subscription.status;
  const subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
  const trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null;
  
  const priceId = subscription.items.data[0].price.id;
  const subscriptionType = priceId.toLowerCase().includes('annual') || priceId.toLowerCase().includes('year') 
    ? 'annual' 
    : 'monthly';

  let mappedStatus: 'none' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'paused' = 'none';
  
  if (status === 'trialing') mappedStatus = 'trialing';
  else if (status === 'active') mappedStatus = 'active';
  else if (status === 'past_due') mappedStatus = 'past_due';
  else if (status === 'canceled') mappedStatus = 'canceled';
  else if (status === 'paused') mappedStatus = 'paused';

  await supabaseClient
    .from('profiles')
    .update({
      subscription_status: mappedStatus,
      subscription_type: subscriptionType,
      subscription_end_date: subscriptionEnd,
      trial_end_date: trialEnd,
      stripe_customer_id: subscription.customer as string,
      stripe_subscription_id: subscription.id,
    })
    .eq('user_id', userId);
}
