import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

  try {
    const { email, fullName }: WelcomeEmailRequest = await req.json();

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
                  <li style="color: #484848; font-size: 15px; line-height: 1.8; margin-bottom: 12px; padding-left: 32px; position: relative;">
                    <svg style="position: absolute; left: 0; top: 2px;" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="10" cy="10" r="8" stroke="#FF6B6B" stroke-width="2" fill="none"/>
                      <path d="M6 10L9 13L14 7" stroke="#FF6B6B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Track your daily doses with smart reminders
                  </li>
                  <li style="color: #484848; font-size: 15px; line-height: 1.8; margin-bottom: 12px; padding-left: 32px; position: relative;">
                    <svg style="position: absolute; left: 0; top: 2px;" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="3" y="3" width="14" height="14" rx="2" stroke="#FF6B6B" stroke-width="2" fill="none"/>
                      <path d="M7 10h6M10 7v6" stroke="#FF6B6B" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    Manage multiple compounds with custom schedules
                  </li>
                  <li style="color: #484848; font-size: 15px; line-height: 1.8; margin-bottom: 12px; padding-left: 32px; position: relative;">
                    <svg style="position: absolute; left: 0; top: 2px;" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="3" y="3" width="14" height="14" rx="2" stroke="#FF6B6B" stroke-width="2" fill="none"/>
                      <circle cx="7.5" cy="7.5" r="1.5" fill="#FF6B6B"/>
                      <path d="M3 14L7 10L11 12L17 8" stroke="#FF6B6B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Document progress with photos and metrics
                  </li>
                  <li style="color: #484848; font-size: 15px; line-height: 1.8; margin-bottom: 12px; padding-left: 32px; position: relative;">
                    <svg style="position: absolute; left: 0; top: 2px;" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10 2L12 7.5L17.5 8.5L13.5 13L14.5 18.5L10 15.5L5.5 18.5L6.5 13L2.5 8.5L8 7.5L10 2Z" stroke="#FF6B6B" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Build streaks and stay motivated
                  </li>
                  <li style="color: #484848; font-size: 15px; line-height: 1.8; padding-left: 32px; position: relative;">
                    <svg style="position: absolute; left: 0; top: 2px;" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 14L7 10L11 12L17 6" stroke="#FF6B6B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      <circle cx="17" cy="6" r="2" stroke="#FF6B6B" stroke-width="2" fill="none"/>
                    </svg>
                    Visualize your journey with insights
                  </li>
                </ul>
              </div>

              <div style="text-align: center; margin: 32px 0;">
                <a href="https://getregimen.app/today" style="background-color: #FF6B6B; border-radius: 8px; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; display: inline-block; padding: 14px 32px;">
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
      from: "Regimen <hello@mail.helloregimen.com>",
      to: [email],
      subject: "Welcome to Regimen! 🎉",
      html,
    });

    console.log("[WELCOME-EMAIL] Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("[WELCOME-EMAIL] Error:", error);
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
