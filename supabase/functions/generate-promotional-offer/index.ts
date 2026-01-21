import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { encode as b64Encode, decode as b64Decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[GENERATE-PROMO-OFFER] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

// Convert raw ECDSA signature (64 bytes: R || S) to DER format required by Apple
function rawToDer(rawSignature: Uint8Array): Uint8Array {
  const r = rawSignature.slice(0, 32);
  const s = rawSignature.slice(32, 64);
  
  function encodeInteger(bytes: Uint8Array): Uint8Array {
    // Remove leading zeros
    let start = 0;
    while (start < bytes.length - 1 && bytes[start] === 0) start++;
    bytes = bytes.slice(start);
    
    // Add 0x00 prefix if high bit is set (to indicate positive number)
    if (bytes[0] & 0x80) {
      const padded = new Uint8Array(bytes.length + 1);
      padded[0] = 0x00;
      padded.set(bytes, 1);
      bytes = padded;
    }
    
    // Return: 0x02 (integer tag) + length + value
    const result = new Uint8Array(2 + bytes.length);
    result[0] = 0x02;
    result[1] = bytes.length;
    result.set(bytes, 2);
    return result;
  }
  
  const encodedR = encodeInteger(r);
  const encodedS = encodeInteger(s);
  
  // Combine: 0x30 (sequence tag) + total length + R + S
  const sequence = new Uint8Array(2 + encodedR.length + encodedS.length);
  sequence[0] = 0x30;
  sequence[1] = encodedR.length + encodedS.length;
  sequence.set(encodedR, 2);
  sequence.set(encodedS, 2 + encodedR.length);
  
  return sequence;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");
    
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData?.user) throw new Error("Authentication failed");
    const user = userData.user;
    logStep("User authenticated", { userId: user.id });

    const { code, productId } = await req.json();
    const upperCode = code.toUpperCase();

    const { data: partnerCode, error: codeError } = await supabaseClient
      .from('partner_promo_codes')
      .select('*')
      .eq('code', upperCode)
      .eq('is_active', true)
      .maybeSingle();

    if (codeError || !partnerCode) {
      return new Response(JSON.stringify({ valid: false, error: "Invalid promo code" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check max redemptions
    if (partnerCode.max_redemptions !== null && partnerCode.redemption_count >= partnerCode.max_redemptions) {
      return new Response(JSON.stringify({ valid: false, error: "Code expired" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check existing redemption
    const { data: existingRedemption } = await supabaseClient
      .from('partner_code_redemptions')
      .select('id')
      .eq('code_id', partnerCode.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingRedemption) {
      return new Response(JSON.stringify({ valid: false, error: "Already used" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const keyId = Deno.env.get("APP_STORE_CONNECT_KEY_ID");
    const privateKey = Deno.env.get("APP_STORE_CONNECT_PRIVATE_KEY");
    if (!keyId || !privateKey) throw new Error("App Store credentials missing");

    const nonce = crypto.randomUUID().toLowerCase();
    const timestamp = Date.now(); // Milliseconds required by Apple
    const appBundleId = "com.regimenapp.regimen";

    // Create signature payload
    const payload = [appBundleId, keyId, productId, partnerCode.offer_identifier, user.id, nonce, timestamp.toString()].join('\u2063');
    const keyData = b64Decode(privateKey);
    const keyBuffer = new ArrayBuffer(keyData.length);
    new Uint8Array(keyBuffer).set(keyData);
    
    const cryptoKey = await crypto.subtle.importKey(
      "pkcs8",
      keyBuffer,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["sign"]
    );

    const signatureBuffer = await crypto.subtle.sign(
      { name: "ECDSA", hash: { name: "SHA-256" } },
      cryptoKey,
      new TextEncoder().encode(payload)
    );
    
    // Convert raw signature to DER format required by Apple
    const rawSignature = new Uint8Array(signatureBuffer);
    const derSignature = rawToDer(rawSignature);
    const signature = b64Encode(derSignature.buffer as ArrayBuffer);

    // Record redemption with platform tracking
    await supabaseClient.from('partner_code_redemptions').insert({
      code_id: partnerCode.id,
      user_id: user.id,
      platform: 'ios',
      metadata: { productId, timestamp, offerIdentifier: partnerCode.offer_identifier }
    });

    await supabaseClient
      .from('partner_promo_codes')
      .update({ redemption_count: partnerCode.redemption_count + 1 })
      .eq('id', partnerCode.id);

    logStep("Success", { offerIdentifier: partnerCode.offer_identifier });

    return new Response(JSON.stringify({
      valid: true,
      offerIdentifier: partnerCode.offer_identifier,
      keyId,
      nonce,
      timestamp,
      signature,
      freeDays: partnerCode.free_days,
      planType: partnerCode.plan_type,
      description: partnerCode.description
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ valid: false, error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
