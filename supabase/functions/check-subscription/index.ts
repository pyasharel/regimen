import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    logStep("Authenticating user with token");
    
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found, updating unsubscribed state");
      
      await supabaseClient
        .from('profiles')
        .update({ 
          subscription_status: 'none',
          subscription_type: null,
          subscription_end_date: null,
          trial_end_date: null
        })
        .eq('user_id', user.id);

      return new Response(JSON.stringify({ subscribed: false, status: 'none' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      logStep("No subscription found");
      await supabaseClient
        .from('profiles')
        .update({ 
          subscription_status: 'none',
          subscription_type: null,
          subscription_end_date: null,
          trial_end_date: null
        })
        .eq('user_id', user.id);

      return new Response(JSON.stringify({ subscribed: false, status: 'none' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const subscription = subscriptions.data[0];
    const status = subscription.status;
    const subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
    const trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null;
    
    // Determine subscription type from price
    const priceId = subscription.items.data[0].price.id;
    const subscriptionType = priceId.includes('annual') ? 'annual' : 'monthly';

    let mappedStatus: 'none' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'paused' = 'none';
    
    if (status === 'trialing') {
      mappedStatus = 'trialing';
    } else if (status === 'active') {
      mappedStatus = 'active';
    } else if (status === 'past_due') {
      mappedStatus = 'past_due';
    } else if (status === 'canceled') {
      mappedStatus = 'canceled';
    } else if (status === 'paused') {
      mappedStatus = 'paused';
    }

    logStep("Subscription found", { status: mappedStatus, type: subscriptionType });

    // Update profile
    await supabaseClient
      .from('profiles')
      .update({ 
        subscription_status: mappedStatus,
        subscription_type: subscriptionType,
        subscription_end_date: subscriptionEnd,
        trial_end_date: trialEnd,
        stripe_customer_id: customerId
      })
      .eq('user_id', user.id);

    const isSubscribed = mappedStatus === 'active' || mappedStatus === 'trialing';

    return new Response(JSON.stringify({
      subscribed: isSubscribed,
      status: mappedStatus,
      subscription_type: subscriptionType,
      subscription_end: subscriptionEnd,
      trial_end: trialEnd
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
