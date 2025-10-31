import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import React from "npm:react@18.3.1";
import { renderAsync } from "npm:@react-email/components@0.0.22";
import { PaymentFailedEmail } from "../_templates/payment-failed-email.tsx";

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
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, fullName, amount, currency, invoiceUrl, updatePaymentUrl }: PaymentFailedRequest = await req.json();

    console.log(`[PAYMENT-FAILED] Sending payment failed email to: ${email}`);

    const html = await renderAsync(
      React.createElement(PaymentFailedEmail, {
        fullName,
        amount,
        currency,
        invoiceUrl,
        updatePaymentUrl,
      })
    );

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
