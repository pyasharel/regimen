import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, couponId } = await req.json();
    
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Check if promo code already exists
    const existing = await stripe.promotionCodes.list({
      code: code.toUpperCase(),
      limit: 1,
    });

    if (existing.data.length > 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Promo code already exists",
        promoCode: existing.data[0]
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Create the promotion code
    const promoCode = await stripe.promotionCodes.create({
      code: code.toUpperCase(),
      coupon: couponId,
      active: true,
    });

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Promo code created successfully",
      promoCode 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error('Error creating promo code:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
