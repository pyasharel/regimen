import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentFailedRequest {
  email: string;
  fullName: string;
  amount: string;
  currency: string;
  invoiceUrl: string;
  updatePaymentUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, fullName, amount, currency, invoiceUrl, updatePaymentUrl }: PaymentFailedRequest = await req.json();

    console.log(`[PAYMENT-FAILED] Sending payment failed email to: ${email}`);

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
              <h1 style="color: #dc3545; font-size: 28px; font-weight: bold; margin: 0 0 24px;">Payment Failed</h1>
              
              <p style="color: #484848; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                Hi ${fullName},
              </p>

              <p style="color: #484848; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                We were unable to process your payment of ${currency.toUpperCase()} ${amount} for your Regimen subscription.
              </p>

              <div style="margin: 32px 0; padding: 20px; background-color: #f8d7da; border-radius: 8px; border-left: 4px solid #dc3545;">
                <p style="color: #721c24; font-size: 14px; line-height: 1.8; margin: 0;">
                  <strong>What happens next?</strong><br><br>
                  • Your subscription will remain active for a limited time<br>
                  • We'll retry the payment automatically<br>
                  • If payment continues to fail, your access may be suspended
                </p>
              </div>

              <p style="color: #484848; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                To avoid any interruption to your service, please update your payment method:
              </p>

              <div style="text-align: center; margin: 32px 0;">
                <a href="https://getregimen.app/settings" style="background-color: #dc3545; border-radius: 8px; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; display: inline-block; padding: 14px 32px;">
                  Update Payment Method
                </a>
              </div>

              <p style="color: #484848; font-size: 14px; text-align: center; margin: 16px 0;">
                Or view your invoice: <a href="${invoiceUrl}" style="color: #FF6B6B; text-decoration: underline;">View Invoice</a>
              </p>

              <div style="margin: 32px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
                <p style="color: #484848; font-size: 14px; line-height: 1.8; margin: 0;">
                  <strong>Common reasons for payment failure:</strong><br><br>
                  • Insufficient funds<br>
                  • Expired card<br>
                  • Card blocked for international transactions<br>
                  • Incorrect billing information
                </p>
              </div>

              <p style="color: #484848; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                If you have any questions or need assistance, please don't hesitate to reach out.
              </p>

              <p style="color: #8a8a8a; font-size: 14px; line-height: 1.6; margin-top: 32px;">
                We're here to help,<br>
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
      subject: "Action Required: Payment Failed for Your Regimen Subscription",
      html,
    });

    console.log("[PAYMENT-FAILED] Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("[PAYMENT-FAILED] Error:", error);
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
