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
  'ANDROID90': { days: 90, description: '3 months free' },
};

// Apple App ID for Regimen
const APPLE_APP_ID = '6753905449';

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, platform } = await req.json();
    const upperCode = code.toUpperCase();
    
    console.log(`[VALIDATE-PROMO] Checking code: ${upperCode}, platform: ${platform || 'not specified'}`);
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );
    
    // FIRST: Check if this is a VIP lifetime code
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
    
    // SECOND: Check if this is a partner Apple Offer Code
    const { data: partnerCode, error: partnerError } = await supabaseClient
      .from('partner_promo_codes')
      .select('*')
      .eq('code', upperCode)
      .eq('is_active', true)
      .maybeSingle();
    
    if (partnerError) {
      console.error(`[VALIDATE-PROMO] Error checking partner codes:`, partnerError);
    }
    
    if (partnerCode) {
      console.log(`[VALIDATE-PROMO] Found valid partner promo code: ${upperCode}`, {
        partner: partnerCode.partner_name,
        partnerCodeId: partnerCode.id,
        platform: platform || 'not specified'
      });
      
      // Check if max redemptions reached
      if (partnerCode.max_redemptions !== null && partnerCode.redemption_count >= partnerCode.max_redemptions) {
        console.log(`[VALIDATE-PROMO] Partner code max redemptions reached`);
        return new Response(JSON.stringify({
          valid: false,
          message: 'This promo code has reached its maximum redemptions'
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      
      // For iOS: Use Safari redirect flow with Apple Offer Code
      if (platform === 'ios') {
        console.log(`[VALIDATE-PROMO] iOS platform - returning Safari redirect flow`);
        return new Response(JSON.stringify({
          valid: true,
          type: 'partner_code',
          isPartnerCode: true,
          useNativePurchase: false, // Use Safari redirect for Apple Offer Code redemption
          redemptionUrl: `https://apps.apple.com/redeem?ctx=offercodes&id=${APPLE_APP_ID}&code=${upperCode}`,
          planType: partnerCode.plan_type,
          partnerName: partnerCode.partner_name,
          partnerCodeId: partnerCode.id,
          description: partnerCode.description
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      
      // For Android: Use Google Play developer-determined offer (native subscription)
      if (platform === 'android') {
        console.log(`[VALIDATE-PROMO] Android platform - returning Google Play offer flow`);
        return new Response(JSON.stringify({
          valid: true,
          type: 'partner_code',
          isPartnerCode: true,
          useNativePurchase: true,
          googleOfferId: 'partner-1mo-free',
          planType: partnerCode.plan_type,
          partnerName: partnerCode.partner_name,
          partnerCodeId: partnerCode.id,
          description: partnerCode.description
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      
      // For Web: Fall back to backend beta access (no Google Play billing on web)
      console.log(`[VALIDATE-PROMO] Web platform - returning beta access fallback`);
      return new Response(JSON.stringify({
        valid: true,
        type: 'beta_access',
        duration: partnerCode.free_days,
        discount: 100,
        planType: 'both',
        isBackendCode: true,
        partnerName: partnerCode.partner_name,
        partnerCodeId: partnerCode.id,
        description: partnerCode.description
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    
    // THIRD: Check if this is a backend promo code (for backwards compatibility)
    if (BACKEND_PROMO_CODES[upperCode]) {
      const promoConfig = BACKEND_PROMO_CODES[upperCode];
      console.log(`[VALIDATE-PROMO] Found backend promo code: ${upperCode}`, promoConfig);
      
      return new Response(JSON.stringify({
        valid: true,
        type: 'beta_access',
        duration: promoConfig.days,
        discount: 100,
        planType: 'both',
        isBackendCode: true,
        description: promoConfig.description
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    
    // FOURTH: Check Stripe promo codes
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
    
    let planType = 'both';
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
      planType,
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
