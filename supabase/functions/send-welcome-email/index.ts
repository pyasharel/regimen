import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface WelcomeEmailRequest {
  email: string;
  fullName: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Create admin client for database operations
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    // Verify authentication - user must be logged in
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('[WELCOME-EMAIL] No authorization header');
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
      console.error('[WELCOME-EMAIL] Invalid token:', claimsError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const userId = claimsData.claims.sub;
    const userEmail = claimsData.claims.email;

    const { email, fullName }: WelcomeEmailRequest = await req.json();

    // Security: Verify email matches authenticated user OR user is admin
    const { data: isAdmin } = await supabaseAdmin.rpc('has_role', {
      _user_id: userId,
      _role: 'admin'
    });

    if (email !== userEmail && !isAdmin) {
      console.error(`[WELCOME-EMAIL] Email mismatch: requested ${email}, authenticated as ${userEmail}`);
      return new Response(
        JSON.stringify({ error: 'Can only send emails to your own address' }),
        { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log(`[WELCOME-EMAIL] Request received for: ${email} (by user: ${userId})`);

    // Atomically record that we're sending this email. The UNIQUE constraint
    // on user_email guarantees that only the first insert succeeds.
    const { data: insertResult, error: insertError } = await supabaseAdmin
      .from('welcome_emails_sent')
      .insert({ user_email: email })
      .select('sent_at')
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        // Another concurrent request already recorded (and is sending) this email
        console.log(`[WELCOME-EMAIL] Email already recorded for ${email}, skipping send`);
        return new Response(
          JSON.stringify({ message: 'Welcome email already sent' }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          }
        );
      }

      console.error('[WELCOME-EMAIL] Error inserting welcome_emails_sent row:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to record welcome email send' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    console.log(`[WELCOME-EMAIL] Sending welcome email to: ${email}`);

    // Simple HTML email without React Email for now
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; background-color: #f6f9fc;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background-color: #ffffff; border-radius: 8px; padding: 40px;">
              <h1 style="color: #1a1a1a; font-size: 28px; font-weight: bold; margin: 0 0 24px; line-height: 1.3;">Welcome to Regimen, ${fullName}! 🎉</h1>
              
              <p style="color: #484848; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                We're excited to have you on board! Regimen is your personal health companion for tracking compounds, logging doses, and measuring progress.
              </p>

              <div style="background-color: #f8f9fa; border-radius: 8px; padding: 24px; margin: 32px 0;">
                <h2 style="color: #1a1a1a; font-size: 20px; font-weight: 600; margin: 0 0 16px;">Here's what you can do:</h2>
                <ul style="margin: 0; padding: 0; list-style: none;">
                  <li style="color: #484848; font-size: 15px; line-height: 1.8; margin-bottom: 12px;">
                    <span style="color: #FF6B6B; font-weight: bold;">✓</span> Track your daily doses with smart reminders
                  </li>
                  <li style="color: #484848; font-size: 15px; line-height: 1.8; margin-bottom: 12px;">
                    <span style="color: #FF6B6B; font-weight: bold;">✓</span> Manage multiple compounds with custom schedules
                  </li>
                  <li style="color: #484848; font-size: 15px; line-height: 1.8; margin-bottom: 12px;">
                    <span style="color: #FF6B6B; font-weight: bold;">✓</span> Document progress with photos and metrics
                  </li>
                  <li style="color: #484848; font-size: 15px; line-height: 1.8; margin-bottom: 12px;">
                    <span style="color: #FF6B6B; font-weight: bold;">✓</span> Build streaks and stay motivated
                  </li>
                  <li style="color: #484848; font-size: 15px; line-height: 1.8;">
                    <span style="color: #FF6B6B; font-weight: bold;">✓</span> Visualize your journey with insights
                  </li>
                </ul>
              </div>

              <div style="text-align: center; margin: 32px 0;">
                <a href="https://helloregimen.com" style="background-color: #FF6B6B; border-radius: 8px; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; display: inline-block; padding: 14px 32px;">
                  Get Started Now
                </a>
              </div>

              <p style="color: #484848; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                Need help? Email us at <a href="mailto:support@helloregimen.com" style="color: #FF6B6B; text-decoration: none;">support@helloregimen.com</a>
              </p>

              <p style="color: #8a8a8a; font-size: 14px; line-height: 1.6; margin: 32px 0 0;">
                Stay consistent,<br>
                The Regimen Team
              </p>

              <div style="margin-top: 32px; padding: 16px; background-color: #fef3cd; border-radius: 6px; border-left: 3px solid #f0ad4e;">
                <p style="color: #8a8a8a; font-size: 12px; line-height: 1.5; margin: 0;">
                  <strong>Important:</strong> Regimen is a tracking tool only and does not provide medical advice. Always consult with healthcare professionals regarding your health decisions.
                </p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: 'Regimen <hello@mail.helloregimen.com>',
      to: [email],
      subject: 'Welcome to Regimen! 🎉',
      html,
    });

    console.log('[WELCOME-EMAIL] Email sent successfully:', emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error('[WELCOME-EMAIL] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);
