import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Backend promo codes (synced with activate-beta-access)
// These provide beta access when validated through this function
const BACKEND_PROMO_CODES: Record<string, { days: number; description: string }> = {
  'BETATESTER': { days: 90, description: '3 months free' },
  'REDDIT30': { days: 30, description: '1 month free' },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code } = await req.json();
    const upperCode = code.toUpperCase();
    
    console.log(`[VALIDATE-PROMO] Checking code: ${upperCode}`);
    
    // FIRST: Check if this is a VIP lifetime code
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );
    
    const { data: lifetimeCode, error: lifetimeError } = await supabaseClient
      .from('lifetime_codes')
      .select('id, code, redeemed_at')
      .eq('code', upperCode)
      .maybeSingle();
    
    if (lifetimeError) {
      console.error(`[VALIDATE-PROMO] Error checking lifetime codes:`, lifetimeError);
    }
    
    if (lifetimeCode) {
      // Check if already redeemed
      if (lifetimeCode.redeemed_at) {
        console.log(`[VALIDATE-PROMO] Lifetime code already redeemed: ${upperCode}`);
        return new Response(JSON.stringify({
          valid: false,
          message: 'This code has already been redeemed'
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      
      console.log(`[VALIDATE-PROMO] Found valid VIP lifetime code: ${upperCode}`);
      return new Response(JSON.stringify({
        valid: true,
        type: 'lifetime',
        duration: 0, // Lifetime = forever
        discount: 100,
        planType: 'both',
        isBackendCode: true,
        isLifetime: true,
        description: 'Lifetime VIP access'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    
    // SECOND: Check if this is a backend promo code (for backwards compatibility)
    // This allows old app versions to validate codes like REDDIT30
    if (BACKEND_PROMO_CODES[upperCode]) {
      const promoConfig = BACKEND_PROMO_CODES[upperCode];
      console.log(`[VALIDATE-PROMO] Found backend promo code: ${upperCode}`, promoConfig);
      
      // Return as valid with special type to indicate this is a backend code
      // The frontend will then call activate-beta-access to apply it
      return new Response(JSON.stringify({
        valid: true,
        type: 'beta_access',
        duration: promoConfig.days,
        discount: 100, // 100% off (free)
        planType: 'both',
        isBackendCode: true, // Flag so frontend knows to call activate-beta-access
        description: promoConfig.description
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    
    // SECOND: Check Stripe promo codes
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    const promoCodes = await stripe.promotionCodes.list({
      code: upperCode,
      active: true,
      limit: 1,
    });

    if (promoCodes.data.length === 0) {
      console.log(`[VALIDATE-PROMO] No promo code found for: ${upperCode}`);
      return new Response(JSON.stringify({ valid: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const promoCode = promoCodes.data[0];
    const coupon = promoCode.coupon;
    
    // Determine which plan this promo applies to based on the price ID
    const applicablePrices = promoCode.restrictions?.applicable_products || [];
    const monthlyPriceId = "price_1SOtyVCSTxWkewOuVMpDVjQ3";
    const annualPriceId = "price_1SOtzeCSTxWkewOutkH2RmTq";
    
    let planType = 'both'; // default if no restrictions
    if (applicablePrices.length > 0) {
      const hasMonthly = applicablePrices.includes(monthlyPriceId);
      const hasAnnual = applicablePrices.includes(annualPriceId);
      
      if (hasMonthly && !hasAnnual) planType = 'monthly';
      else if (hasAnnual && !hasMonthly) planType = 'annual';
    }

    console.log(`[VALIDATE-PROMO] Stripe promo code valid: ${upperCode}`);

    return new Response(JSON.stringify({
      valid: true,
      type: coupon.percent_off === 100 ? 'free' : 'discount',
      duration: coupon.duration_in_months || 12,
      discount: coupon.percent_off || 0,
      planType, // Add which plan this code applies to
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error(`[VALIDATE-PROMO] Error: ${error.message}`);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});