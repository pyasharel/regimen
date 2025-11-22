import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('[CREATE-CHECKOUT] Function invoked');

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    console.log('[CREATE-CHECKOUT] Authenticating user');
    const authHeader = req.headers.get("Authorization")!;
    if (!authHeader) {
      console.error('[CREATE-CHECKOUT] No authorization header');
      throw new Error("No authorization header");
    }
    
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) {
      console.error('[CREATE-CHECKOUT] User not authenticated');
      throw new Error("User not authenticated or email not available");
    }
    
    console.log('[CREATE-CHECKOUT] User authenticated:', user.email);

    const body = await req.json();
    console.log('[CREATE-CHECKOUT] Request body:', body);
    const { plan, promoCode } = body;
    
    console.log('[CREATE-CHECKOUT] Initializing Stripe');
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    console.log('[CREATE-CHECKOUT] Checking for existing customer');
    // Check if customer exists or create new one
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log('[CREATE-CHECKOUT] Found existing customer:', customerId);
    } else {
      console.log('[CREATE-CHECKOUT] Creating new customer');
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id }
      });
      customerId = customer.id;
      console.log('[CREATE-CHECKOUT] Created customer:', customerId);
      
      await supabaseClient
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('user_id', user.id);
    }

    // Price IDs from Stripe
    const monthlyPriceId = "price_1SOtyVCSTxWkewOuVMpDVjQ3";
    const annualPriceId = "price_1SOtzeCSTxWkewOutkH2RmTq";
    const priceId = plan === 'annual' ? annualPriceId : monthlyPriceId;
    console.log('[CREATE-CHECKOUT] Using price:', priceId, 'for plan:', plan);

    // Determine redirect base URL (always use web app URL to avoid invalid native schemes)
    const redirectBaseUrl = 'https://348ffbba-c097-44d8-bbbe-a7cee13c09a9.lovableproject.com';
    console.log('[CREATE-CHECKOUT] Using redirect base:', redirectBaseUrl);

    // Build session parameters
    const sessionParams: any = {
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${redirectBaseUrl}/today?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${redirectBaseUrl}/today`,
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          supabase_user_id: user.id,
          promo_code: promoCode || '',
        },
      },
      // Only add allow_promotion_codes if no specific promo is being applied
      ...(promoCode ? {} : { allow_promotion_codes: true })
    };

    // If promo code provided, try to apply it
    if (promoCode) {
      console.log('[CREATE-CHECKOUT] Looking up promo code:', promoCode);
      const promoCodes = await stripe.promotionCodes.list({
        code: promoCode.toUpperCase(),
        active: true,
        limit: 1,
      });
      
      if (promoCodes.data.length > 0) {
        console.log('[CREATE-CHECKOUT] Found promo code:', promoCodes.data[0].id);
        sessionParams.discounts = [{ promotion_code: promoCodes.data[0].id }];
      } else {
        console.log('[CREATE-CHECKOUT] Promo code not found');
      }
    }

    console.log('[CREATE-CHECKOUT] Creating checkout session');
    const session = await stripe.checkout.sessions.create(sessionParams);
    console.log('[CREATE-CHECKOUT] Session created:', session.id);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error('[CREATE-CHECKOUT] Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
