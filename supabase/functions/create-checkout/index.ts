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

      // Keep profiles in sync even when customer already existed
      await supabaseClient
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('user_id', user.id);
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

    // Production Price IDs from Stripe
    const monthlyPriceId = "price_1SXdIJCSTxWkewOuuThCXMmx";
    const annualPriceId = "price_1SXdEcCSTxWkewOumNEu40U9";
    const priceId = plan === 'annual' ? annualPriceId : monthlyPriceId;
    console.log('[CREATE-CHECKOUT] Using price:', priceId, 'for plan:', plan);

    // Use web URLs for Stripe redirect (custom URL schemes not supported by Stripe)
    // IMPORTANT: In native, we must use the production domain that is configured for Universal Links,
    // otherwise Stripe will redirect to a normal web page inside the in-app browser and it won't auto-return.
    const originHeader = req.headers.get("origin") || "";

    // Some clients (older builds) may not send platform. Detect native by origin.
    const originLooksNative =
      originHeader.startsWith("capacitor://") ||
      originHeader.startsWith("ionic://") ||
      originHeader === "http://localhost" ||
      originHeader.startsWith("http://localhost:");

    const platform = body?.platform === "native" || originLooksNative ? "native" : "web";

    const origin = platform === 'native'
      ? "https://getregimen.app"
      : (originHeader || "https://getregimen.app");

    // Use the React routes for both native and web
    // The static HTML approach (checkout-success.html) doesn't work because hosting routes everything through SPA
    // The React CheckoutSuccess component will handle the deep link and Browser.close()
    const successUrl = `${origin}/checkout/success`;
    const cancelUrl = `${origin}/checkout/cancel`;
    console.log('[CREATE-CHECKOUT] Using checkout return URLs:', { platform, origin, successUrl, cancelUrl });

    // Build session parameters
    const sessionParams: any = {
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
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
