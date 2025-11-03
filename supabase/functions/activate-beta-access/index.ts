import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VALID_BETA_CODES = ["BETATESTER"];
const BETA_DURATION_DAYS = 90;

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
    
    if (!VALID_BETA_CODES.includes(code.toUpperCase())) {
      return new Response(JSON.stringify({ 
        valid: false,
        message: "Invalid beta code"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check if user already has beta access
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('beta_access_end_date')
      .eq('user_id', user.id)
      .single();

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
    endDate.setDate(endDate.getDate() + BETA_DURATION_DAYS);

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
