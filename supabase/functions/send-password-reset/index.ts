import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface PasswordResetRequest {
  email: string;
  resetLink: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication - user must be logged in
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('[PASSWORD-RESET] No authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Create authenticated client to verify the user
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error('[PASSWORD-RESET] Invalid token:', claimsError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const userId = claimsData.claims.sub;
    const userEmail = claimsData.claims.email;

    const { email, resetLink }: PasswordResetRequest = await req.json();

    // Create admin client to check admin role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Security: Verify email matches authenticated user OR user is admin
    const { data: isAdmin } = await supabaseAdmin.rpc('has_role', {
      _user_id: userId,
      _role: 'admin'
    });

    if (email !== userEmail && !isAdmin) {
      console.error(`[PASSWORD-RESET] Email mismatch: requested ${email}, authenticated as ${userEmail}`);
      return new Response(
        JSON.stringify({ error: 'Can only send emails to your own address' }),
        { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log(`[PASSWORD-RESET] Sending password reset email to: ${email} (by user: ${userId})`);

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color: #f6f9fc;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background-color: #ffffff; border-radius: 8px; padding: 40px;">
              <h1 style="color: #1a1a1a; font-size: 28px; font-weight: bold; margin: 0 0 24px;">Reset Your Password</h1>
              
              <p style="color: #484848; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                We received a request to reset your password for your Regimen account.
              </p>

              <p style="color: #484848; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                Click the button below to create a new password:
              </p>

              <div style="text-align: center; margin: 32px 0;">
                <a href="https://getregimen.app/auth" style="background-color: #FF6B6B; border-radius: 8px; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; display: inline-block; padding: 14px 32px;">
                  Reset Password
                </a>
              </div>

              <p style="color: #484848; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                This link will expire in 1 hour for security reasons.
              </p>

              <div style="margin: 32px 0; padding: 20px; background-color: #fff3cd; border-radius: 8px; border-left: 4px solid #f0ad4e;">
                <p style="color: #856404; font-size: 14px; line-height: 1.6; margin: 0;">
                  <strong>Didn't request this?</strong><br>
                  If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
                </p>
              </div>

              <p style="color: #8a8a8a; font-size: 14px; line-height: 1.6; margin-top: 32px;">
                Stay secure,<br>
                The Regimen Team
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: "Regimen <hello@mail.helloregimen.com>",
      to: [email],
      subject: "Reset Your Regimen Password",
      html,
    });

    console.log("[PASSWORD-RESET] Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("[PASSWORD-RESET] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
