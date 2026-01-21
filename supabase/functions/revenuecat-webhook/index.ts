import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("[REVENUECAT-WEBHOOK] Received webhook request");

  try {
    // Validate authorization header
    const authHeader = req.headers.get("authorization");
    const expectedSecret = Deno.env.get("REVENUECAT_WEBHOOK_SECRET");

    if (!expectedSecret) {
      console.error("[REVENUECAT-WEBHOOK] REVENUECAT_WEBHOOK_SECRET not configured");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (authHeader !== expectedSecret) {
      console.error("[REVENUECAT-WEBHOOK] Invalid authorization header");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[REVENUECAT-WEBHOOK] Authorization validated");

    // Parse the webhook payload
    const payload = await req.json();
    console.log("[REVENUECAT-WEBHOOK] Event type:", payload.event?.type);
    console.log("[REVENUECAT-WEBHOOK] App user ID:", payload.event?.app_user_id);

    const event = payload.event;
    if (!event) {
      console.error("[REVENUECAT-WEBHOOK] No event in payload");
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // The app_user_id should be the Supabase user ID (we set this during RevenueCat login)
    const userId = event.app_user_id;
    
    // Skip anonymous RevenueCat IDs - they won't have a profile
    if (!userId || userId.startsWith("$RCAnonymousID")) {
      console.log("[REVENUECAT-WEBHOOK] Skipping anonymous user:", userId);
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Determine subscription status based on event type
    let subscriptionStatus: string | null = null;
    let subscriptionType: string | null = null;
    let subscriptionStartDate: string | null = null;
    let subscriptionEndDate: string | null = null;

    // RevenueCat event types: https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields
    switch (event.type) {
      case "INITIAL_PURCHASE":
      case "RENEWAL":
      case "PRODUCT_CHANGE":
      case "UNCANCELLATION":
        subscriptionStatus = "active";
        subscriptionType = event.product_id?.includes("annual") ? "annual" : "monthly";
        subscriptionStartDate = event.purchased_at_ms 
          ? new Date(event.purchased_at_ms).toISOString() 
          : new Date().toISOString();
        subscriptionEndDate = event.expiration_at_ms 
          ? new Date(event.expiration_at_ms).toISOString() 
          : null;
        console.log("[REVENUECAT-WEBHOOK] Setting active subscription:", { subscriptionType, subscriptionEndDate });
        break;

      case "CANCELLATION":
        // User cancelled but still has access until expiration
        subscriptionStatus = "active";
        subscriptionEndDate = event.expiration_at_ms 
          ? new Date(event.expiration_at_ms).toISOString() 
          : null;
        console.log("[REVENUECAT-WEBHOOK] Subscription cancelled, expires:", subscriptionEndDate);
        break;

      case "EXPIRATION":
      case "BILLING_ISSUE":
        subscriptionStatus = "none";
        console.log("[REVENUECAT-WEBHOOK] Subscription expired/billing issue");
        break;

      case "SUBSCRIBER_ALIAS":
        // User identity changed, no status update needed
        console.log("[REVENUECAT-WEBHOOK] Subscriber alias event, no action needed");
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      default:
        console.log("[REVENUECAT-WEBHOOK] Unhandled event type:", event.type);
        return new Response(JSON.stringify({ success: true, unhandled: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // Update the user's profile
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (subscriptionStatus !== null) {
      updateData.subscription_status = subscriptionStatus;
    }
    if (subscriptionType !== null) {
      updateData.subscription_type = subscriptionType;
    }
    if (subscriptionStartDate !== null) {
      updateData.subscription_start_date = subscriptionStartDate;
    }
    if (subscriptionEndDate !== null) {
      updateData.subscription_end_date = subscriptionEndDate;
    }

    console.log("[REVENUECAT-WEBHOOK] Updating profile for user:", userId, updateData);

    const { error: updateError } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("user_id", userId);

    if (updateError) {
      console.error("[REVENUECAT-WEBHOOK] Error updating profile:", updateError);
      return new Response(JSON.stringify({ error: "Database update failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[REVENUECAT-WEBHOOK] Successfully updated profile");

    // Mark partner code redemption as converted on initial purchase
    if (event.type === "INITIAL_PURCHASE") {
      console.log("[REVENUECAT-WEBHOOK] Checking for partner code redemption to mark as converted");
      
      const { data: redemption } = await supabase
        .from("partner_code_redemptions")
        .select("id")
        .eq("user_id", userId)
        .eq("offer_applied", false)
        .order("redeemed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (redemption) {
        console.log("[REVENUECAT-WEBHOOK] Found pending redemption, marking as converted:", redemption.id);
        
        await supabase
          .from("partner_code_redemptions")
          .update({
            offer_applied: true,
            converted_at: new Date().toISOString(),
            subscription_id: event.original_transaction_id || event.transaction_id
          })
          .eq("id", redemption.id);
          
        console.log("[REVENUECAT-WEBHOOK] Partner redemption marked as converted");
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[REVENUECAT-WEBHOOK] Unexpected error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
