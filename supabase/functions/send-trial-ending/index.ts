import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TrialEndingRequest {
  email: string;
  fullName: string;
  daysLeft: number;
  planName: string;
  planPrice: string;
  manageSubscriptionUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, fullName, daysLeft, planName, planPrice, manageSubscriptionUrl }: TrialEndingRequest = await req.json();

    console.log(`[TRIAL-ENDING] Sending trial ending email to: ${email} (${daysLeft} days left)`);

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
              <h1 style="color: #1a1a1a; font-size: 28px; font-weight: bold; margin: 0 0 24px;">Your trial is ending soon</h1>
              
              <p style="color: #484848; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                Hi ${fullName},
              </p>

              <p style="color: #484848; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                We hope you've been enjoying Regimen! Your 14-day free trial will end in <strong>${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}</strong>.
              </p>

              <div style="margin: 32px 0; padding: 24px; background-color: #d4edda; border-radius: 8px; border-left: 4px solid #28a745;">
                <p style="color: #155724; font-size: 15px; line-height: 1.8; margin: 0;">
                  <strong>What happens next?</strong><br><br>
                  Your ${planName} subscription (${planPrice}) will begin automatically.<br><br>
                  You can cancel anytime before then to avoid being charged.
                </p>
              </div>

              <div style="margin: 32px 0; padding: 24px; background-color: #f8f9fa; border-radius: 8px;">
                <h2 style="color: #1a1a1a; font-size: 20px; font-weight: 600; margin: 0 0 16px;">Your Progress So Far:</h2>
                <p style="color: #484848; font-size: 15px; line-height: 1.6; margin: 0;">
                  You've been building healthy habits with Regimen. Keep it up! 💪
                </p>
              </div>

              <div style="text-align: center; margin: 32px 0;">
                <a href="${manageSubscriptionUrl}" style="background-color: #8B5CF6; border-radius: 8px; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; display: inline-block; padding: 14px 32px;">
                  Manage Subscription
                </a>
              </div>

              <p style="color: #484848; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                Have questions? We're here to help. Just reply to this email.
              </p>

              <p style="color: #8a8a8a; font-size: 14px; line-height: 1.6; margin-top: 32px;">
                Thank you for choosing Regimen,<br>
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
      subject: `Your Regimen trial ends in ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}`,
      html,
    });

    console.log("[TRIAL-ENDING] Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("[TRIAL-ENDING] Error:", error);
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
