import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Promo codes with their durations in days
const PROMO_CODES: Record<string, { days: number; description: string }> = {
  "BETATESTER": { days: 90, description: "3 months beta access" },
  "REDDIT30": { days: 30, description: "1 month free" },
  "ANDROID90": { days: 90, description: "3 months beta access" },
};

// Far future date for lifetime access
const LIFETIME_END_DATE = '2099-12-31T23:59:59.999Z';

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('[ACTIVATE-BETA] Function invoked');

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    {
      auth: {
        persistSession: false,
      }
    }
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    if (!authHeader) {
      throw new Error("No authorization header");
    }
    
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user) {
      throw new Error("User not authenticated");
    }
    
    console.log('[ACTIVATE-BETA] User authenticated:', user.email);

    const { code } = await req.json();
    console.log('[ACTIVATE-BETA] Checking code:', code);
    
    const upperCode = code.toUpperCase();
    
    // FIRST: Check if this is a VIP lifetime code
    const { data: lifetimeCode, error: lifetimeError } = await supabaseClient
      .from('lifetime_codes')
      .select('id, code, redeemed_at, redeemed_by')
      .eq('code', upperCode)
      .maybeSingle();
    
    if (lifetimeError) {
      console.error('[ACTIVATE-BETA] Error checking lifetime codes:', lifetimeError);
    }
    
    if (lifetimeCode) {
      // Check if already redeemed
      if (lifetimeCode.redeemed_at) {
        console.log('[ACTIVATE-BETA] Lifetime code already redeemed:', upperCode);
        return new Response(JSON.stringify({ 
          valid: false,
          message: "This code has already been redeemed"
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      
      console.log('[ACTIVATE-BETA] Valid VIP lifetime code found:', upperCode);
      
      // Mark the code as redeemed
      const { error: redeemError } = await supabaseClient
        .from('lifetime_codes')
        .update({ 
          redeemed_at: new Date().toISOString(),
          redeemed_by: user.id
        })
        .eq('id', lifetimeCode.id);
      
      if (redeemError) {
        console.error('[ACTIVATE-BETA] Error marking code as redeemed:', redeemError);
        throw redeemError;
      }
      
      // Grant lifetime access to user
      const { data: updateData, error: updateError } = await supabaseClient
        .from('profiles')
        .update({ 
          is_lifetime_access: true,
          beta_access_end_date: LIFETIME_END_DATE
        })
        .eq('user_id', user.id)
        .select();
      
      if (updateError) {
        console.error('[ACTIVATE-BETA] Error granting lifetime access:', updateError);
        throw updateError;
      }
      
      if (!updateData || updateData.length === 0) {
        console.error('[ACTIVATE-BETA] No rows updated! User may not have a profile.');
        throw new Error('Failed to update profile - user profile may not exist');
      }
      
      console.log('[ACTIVATE-BETA] Lifetime VIP access granted to user:', user.id);
      
      return new Response(JSON.stringify({ 
        valid: true,
        activated: true,
        isLifetime: true,
        message: "Lifetime VIP access activated successfully",
        endDate: LIFETIME_END_DATE
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    
    // SECOND: Check if this is a partner promo code (for Android/Web fallback)
    const { data: partnerCode, error: partnerError } = await supabaseClient
      .from('partner_promo_codes')
      .select('*')
      .eq('code', upperCode)
      .eq('is_active', true)
      .maybeSingle();
    
    if (partnerError) {
      console.error('[ACTIVATE-BETA] Error checking partner codes:', partnerError);
    }
    
    if (partnerCode) {
      console.log('[ACTIVATE-BETA] Valid partner promo code found:', upperCode, {
        partner: partnerCode.partner_name,
        freeDays: partnerCode.free_days
      });
      
      // Check if user already has beta access or lifetime access
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('beta_access_end_date, is_lifetime_access')
        .eq('user_id', user.id)
        .single();

      // Don't allow promo codes for lifetime users
      if (profile?.is_lifetime_access) {
        console.log('[ACTIVATE-BETA] User already has lifetime access');
        return new Response(JSON.stringify({ 
          valid: true,
          alreadyActive: true,
          message: "You already have lifetime VIP access"
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      if (profile?.beta_access_end_date) {
        const endDate = new Date(profile.beta_access_end_date);
        if (endDate > new Date()) {
          console.log('[ACTIVATE-BETA] User already has active beta access');
          return new Response(JSON.stringify({ 
            valid: true,
            alreadyActive: true,
            message: "Beta access already active",
            endDate: profile.beta_access_end_date
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }
      }

      // Activate beta access using partner code's free_days
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + partnerCode.free_days);

      console.log('[ACTIVATE-BETA] Activating partner beta access for user:', user.id);
      console.log('[ACTIVATE-BETA] Setting beta_access_end_date to:', endDate.toISOString());

      const { data: updateData, error: updateError } = await supabaseClient
        .from('profiles')
        .update({ 
          beta_access_end_date: endDate.toISOString(),
        })
        .eq('user_id', user.id)
        .select();

      if (updateError) {
        console.error('[ACTIVATE-BETA] Update error:', updateError);
        throw updateError;
      }

      if (!updateData || updateData.length === 0) {
        console.error('[ACTIVATE-BETA] No rows updated! User may not have a profile.');
        throw new Error('Failed to update profile - user profile may not exist');
      }

      // Save partner attribution
      const { error: attrError } = await supabaseClient
        .from('partner_code_redemptions')
        .insert({
          code_id: partnerCode.id,
          user_id: user.id,
          platform: 'android', // This flow is for Android/Web
          offer_applied: true // Beta access granted immediately
        });
      
      if (attrError) {
        console.error('[ACTIVATE-BETA] Failed to save partner attribution:', attrError);
        // Don't fail the whole operation for attribution error
      }

      console.log('[ACTIVATE-BETA] Partner beta access activated until:', endDate);

      return new Response(JSON.stringify({ 
        valid: true,
        activated: true,
        message: `Beta access activated! Enjoy ${partnerCode.free_days} days free from ${partnerCode.partner_name}`,
        endDate: endDate.toISOString(),
        partnerName: partnerCode.partner_name
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    
    // THIRD: Check regular promo codes
    const promoConfig = PROMO_CODES[upperCode];
    
    if (!promoConfig) {
      return new Response(JSON.stringify({ 
        valid: false,
        message: "Invalid promo code"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    
    console.log('[ACTIVATE-BETA] Valid code found:', upperCode, promoConfig);

    // Check if user already has beta access or lifetime access
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('beta_access_end_date, is_lifetime_access')
      .eq('user_id', user.id)
      .single();

    // Don't allow promo codes for lifetime users
    if (profile?.is_lifetime_access) {
      console.log('[ACTIVATE-BETA] User already has lifetime access');
      return new Response(JSON.stringify({ 
        valid: true,
        alreadyActive: true,
        message: "You already have lifetime VIP access"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (profile?.beta_access_end_date) {
      const endDate = new Date(profile.beta_access_end_date);
      if (endDate > new Date()) {
        console.log('[ACTIVATE-BETA] User already has active beta access');
        return new Response(JSON.stringify({ 
          valid: true,
          alreadyActive: true,
          message: "Beta access already active",
          endDate: profile.beta_access_end_date
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    // Activate beta access
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + promoConfig.days);

    console.log('[ACTIVATE-BETA] Attempting to update user:', user.id);
    console.log('[ACTIVATE-BETA] Setting beta_access_end_date to:', endDate.toISOString());

    const { data: updateData, error: updateError } = await supabaseClient
      .from('profiles')
      .update({ 
        beta_access_end_date: endDate.toISOString(),
      })
      .eq('user_id', user.id)
      .select();

    console.log('[ACTIVATE-BETA] Update result:', { data: updateData, error: updateError });

    if (updateError) {
      console.error('[ACTIVATE-BETA] Update error:', updateError);
      throw updateError;
    }

    if (!updateData || updateData.length === 0) {
      console.error('[ACTIVATE-BETA] No rows updated! User may not have a profile.');
      throw new Error('Failed to update profile - user profile may not exist');
    }

    console.log('[ACTIVATE-BETA] Beta access activated until:', endDate);

    return new Response(JSON.stringify({ 
      valid: true,
      activated: true,
      message: "Beta access activated successfully",
      endDate: endDate.toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error('[ACTIVATE-BETA] Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
