import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface VerifyResetCodeRequest {
  email: string;
  code: string;
  new_password: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, code, new_password }: VerifyResetCodeRequest = await req.json();

    if (!email || !code || !new_password) {
      return new Response(
        JSON.stringify({ error: 'Email, code, and new password are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (new_password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 6 characters' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    console.log(`[VERIFY-RESET] Verifying code for: ${normalizedEmail}`);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Rate limit: max 5 verification attempts per email per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentAttempts } = await supabaseAdmin
      .from('password_reset_codes')
      .select('*', { count: 'exact', head: true })
      .eq('email', normalizedEmail)
      .gte('created_at', oneHourAgo);

    if (recentAttempts && recentAttempts >= 10) {
      console.log('[VERIFY-RESET] Rate limited');
      return new Response(
        JSON.stringify({ error: 'Too many attempts. Please try again later.' }),
        { status: 429, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Look up valid code
    const { data: codeRecord, error: lookupError } = await supabaseAdmin
      .from('password_reset_codes')
      .select('*')
      .eq('email', normalizedEmail)
      .eq('code', code)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lookupError) {
      console.error('[VERIFY-RESET] Lookup error:', lookupError);
      throw lookupError;
    }

    if (!codeRecord) {
      console.log('[VERIFY-RESET] Invalid or expired code');
      return new Response(
        JSON.stringify({ error: 'Invalid or expired code. Please request a new one.' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Find user by email
    const { data: userData } = await supabaseAdmin.auth.admin.listUsers();
    const user = userData?.users?.find(
      (u) => u.email?.toLowerCase() === normalizedEmail
    );

    if (!user) {
      console.error('[VERIFY-RESET] User not found for email');
      return new Response(
        JSON.stringify({ error: 'Unable to reset password. Please contact support.' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Reset password via admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: new_password }
    );

    if (updateError) {
      console.error('[VERIFY-RESET] Password update error:', updateError);
      throw updateError;
    }

    // Mark code as used
    await supabaseAdmin
      .from('password_reset_codes')
      .update({ used: true })
      .eq('id', codeRecord.id);

    console.log(`[VERIFY-RESET] Password reset successful for: ${normalizedEmail}`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("[VERIFY-RESET] Error:", error);
    return new Response(
      JSON.stringify({ error: 'An error occurred. Please try again.' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
};

serve(handler);
