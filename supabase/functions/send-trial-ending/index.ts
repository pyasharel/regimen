import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import React from "npm:react@18.3.1";
import { renderAsync } from "npm:@react-email/components@0.0.22";
import { TrialEndingEmail } from "../_templates/trial-ending-email.tsx";

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
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, fullName, daysLeft, planName, planPrice, manageSubscriptionUrl }: TrialEndingRequest = await req.json();

    console.log(`[TRIAL-ENDING] Sending trial ending email to: ${email} (${daysLeft} days left)`);

    const html = await renderAsync(
      React.createElement(TrialEndingEmail, {
        fullName,
        daysLeft,
        planName,
        planPrice,
        manageSubscriptionUrl,
      })
    );

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
