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
}

async function findUserByEmail(normalizedEmail: string): Promise<boolean> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const res = await fetch(
    `${supabaseUrl}/auth/v1/admin/users?page=1&per_page=1&filter=${encodeURIComponent(normalizedEmail)}`,
    {
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
      },
    }
  );

  if (!res.ok) {
    console.error('[PASSWORD-RESET] Admin users API error:', res.status);
    return false;
  }

  const { users } = await res.json();
  // The filter is substring-based, so verify exact email match
  return users?.some((u: any) => u.email?.toLowerCase() === normalizedEmail);
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email }: PasswordResetRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    console.log(`[PASSWORD-RESET] Generating code for: ${normalizedEmail}`);

    // Check if user exists via REST API (don't reveal to client)
    const userExists = await findUserByEmail(normalizedEmail);

    if (!userExists) {
      console.log('[PASSWORD-RESET] User not found, returning success silently');
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Create admin client for DB operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Rate limit: max 3 codes per email per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabaseAdmin
      .from('password_reset_codes')
      .select('*', { count: 'exact', head: true })
      .eq('email', normalizedEmail)
      .gte('created_at', oneHourAgo);

    if (recentCount && recentCount >= 3) {
      console.log('[PASSWORD-RESET] Rate limited');
      return new Response(
        JSON.stringify({ error: 'Too many reset attempts. Please try again later.' }),
        { status: 429, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Invalidate any previous unused codes for this email
    await supabaseAdmin
      .from('password_reset_codes')
      .update({ used: true })
      .eq('email', normalizedEmail)
      .eq('used', false);

    // Generate secure 6-digit code
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    const code = String(array[0] % 1000000).padStart(6, '0');

    // Store code with 15-minute expiry
    const { error: insertError } = await supabaseAdmin
      .from('password_reset_codes')
      .insert({
        email: normalizedEmail,
        code,
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      });

    if (insertError) {
      console.error('[PASSWORD-RESET] Error storing code:', insertError);
      throw insertError;
    }

    console.log(`[PASSWORD-RESET] Code generated, sending email`);

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

              <p style="color: #484848; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
                Your password reset code is:
              </p>

              <div style="text-align: center; margin: 32px 0; padding: 24px; background-color: #f0f0f0; border-radius: 12px;">
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                  <tr>
                    ${code.split('').map(d => `<td style="padding: 0 6px; font-size: 36px; font-weight: bold; color: #1a1a1a; font-family: 'Courier New', monospace;">${d}</td>`).join('')}
                  </tr>
                </table>
              </div>

              <p style="color: #484848; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                Enter this code in the Regimen app to set a new password.
              </p>

              <p style="color: #484848; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                This code expires in <strong>15 minutes</strong>.
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
      to: [normalizedEmail],
      subject: "Your Regimen Password Reset Code",
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
