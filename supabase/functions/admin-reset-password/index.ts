import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Missing auth token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with caller's token to verify identity
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userError } = await supabaseAuth.auth.getUser();
    
    if (userError || !userData?.user?.id) {
      console.error("[ADMIN] Auth verification failed:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const callerId = userData.user.id;
    console.log(`[ADMIN] Request from user: ${callerId}`);

    // Create admin client for role check and password reset
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verify caller has admin role
    const { data: hasAdminRole, error: roleError } = await supabaseAdmin.rpc("has_role", {
      _user_id: callerId,
      _role: "admin",
    });

    if (roleError) {
      console.error("[ADMIN] Role check error:", roleError);
      return new Response(
        JSON.stringify({ error: "Failed to verify permissions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!hasAdminRole) {
      console.warn(`[ADMIN] Unauthorized attempt by non-admin user: ${callerId}`);
      return new Response(
        JSON.stringify({ error: "Forbidden: Admin role required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { user_id, new_password } = await req.json();

    if (!user_id || !new_password) {
      throw new Error("user_id and new_password are required");
    }

    console.log(`[ADMIN] Admin ${callerId} resetting password for user: ${user_id}`);

    // Reset the user's password using admin API
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      user_id,
      { password: new_password }
    );

    if (error) {
      console.error("[ADMIN] Password reset error:", error);
      throw error;
    }

    console.log(`[ADMIN] Password reset successful for user: ${user_id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Password reset successfully",
        email: data.user?.email 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("[ADMIN] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
