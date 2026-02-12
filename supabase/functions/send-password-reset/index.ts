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
  platform?: string; // 'native' or 'web'
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, platform }: PasswordResetRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log(`[PASSWORD-RESET] Generating recovery link for: ${email}, platform: ${platform}`);

    // Create admin client to generate recovery link
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Use custom scheme for native apps, https for web
    const redirectTo = platform === 'native'
      ? 'regimen://auth?mode=reset'
      : 'https://getregimen.app/auth?mode=reset';

    // Generate the recovery link via admin API
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo,
      },
    });

    if (linkError) {
      console.error('[PASSWORD-RESET] Error generating link:', linkError);
      // Don't reveal if user exists or not
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // The generated link contains the token - extract and build our redirect URL
    const recoveryLink = linkData?.properties?.action_link;
    if (!recoveryLink) {
      console.error('[PASSWORD-RESET] No action_link in response');
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log(`[PASSWORD-RESET] Recovery link generated, sending email`);

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
                <a href="${recoveryLink}" style="background-color: #FF6B6B; border-radius: 8px; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; display: inline-block; padding: 14px 32px; mso-padding-alt: 0; text-underline-color: #FF6B6B;">
                  <!--[if mso]><i style="letter-spacing: 32px; mso-font-width: -100%; mso-text-raise: 21pt;">&nbsp;</i><![endif]-->
                  <span style="mso-text-raise: 10pt;">Reset Password</span>
                  <!--[if mso]><i style="letter-spacing: 32px; mso-font-width: -100%;">&nbsp;</i><![endif]-->
                </a>
              </div>

              <p style="color: #484848; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                This link will expire in 1 hour for security reasons.
              </p>

              <p style="color: #484848; font-size: 13px; line-height: 1.6; margin: 0 0 24px; word-break: break-all;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${recoveryLink}" style="color: #FF6B6B;">${recoveryLink}</a>
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

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("[PASSWORD-RESET] Error:", error);
    // Always return success to not reveal user existence
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
