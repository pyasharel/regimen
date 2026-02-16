

# Comprehensive Partner Promo Code Fix

## Issues Found From Your Test

### 1. Country shows "Germany" (DE) instead of US
The country/locale detection uses `navigator.language` (line 763 of SubscriptionContext.tsx), which returns the **device's language setting**, not the actual geographic location. Your Android device is set to `de-DE` (German locale), so it reports `DE` as the country code. This is a data accuracy problem -- `navigator.language` is unreliable for country detection.

**Fix:** Use a lightweight IP geolocation API as the primary source, falling back to `navigator.language` only if the API fails.

### 2. `onboarding_completed` shows "true" but you didn't do onboarding
The code in SubscriptionContext.tsx reads `profile.onboarding_completed` from the database and pushes it to RevenueCat as an attribute. This account may have had its `onboarding_completed` flag set to `true` previously (perhaps from a prior session or test), and the attribute was synced from the database value, not from the current session.

**Fix:** No code change needed -- this is accurate to the database value. If the test account had onboarding completed from a prior test, the attribute is correct. Can verify/reset in the database if needed.

### 3. Partner attribution not saved (RLS blocking client-side inserts)
The `partner_code_redemptions` table has an RLS policy of `USING (false)` for ALL operations, which silently blocks the client-side `supabase.from('partner_code_redemptions').insert(...)` call in SubscriptionPaywall.tsx (line 89). The insert fails silently.

**Fix:** Move the partner attribution save to the `validate-promo-code` edge function (which uses service role), so it happens server-side when the code is validated, before any purchase attempt.

### 4. `subscription_type` shows "monthly" instead of "annual"
The webhook correctly detects plan type via `product_id?.includes("annual")`, but sandbox events are skipped entirely (line 297). The profile was updated by client-side sync logic, which doesn't set `subscription_type` correctly for partner promo purchases. The Google Play product ID for the partner offer may not contain "annual" in its identifier.

**Fix:** 
- Update the webhook to also check for Google Play base plan IDs (e.g., `:annual-base` suffix) in addition to the "annual" string
- Also have the client-side purchase handler set `subscription_type` on the profile after a successful partner purchase

### 5. Sandbox webhook events are skipped entirely
The webhook skips ALL sandbox events. This is correct for production, but it means sandbox test purchases never update the profile via webhook. The profile was updated by client-side RevenueCat sync instead, which has less complete data.

**No change needed** -- this is intentional behavior. Production purchases will trigger the webhook correctly.

## Comprehensive Edge Case Fixes

### 6. Increment redemption_count on partner_promo_codes
Currently, when a partner code is used, the `redemption_count` on the `partner_promo_codes` table is never incremented. This means max redemption limits won't work.

**Fix:** Increment `redemption_count` in the `validate-promo-code` edge function when a partner code is validated.

### 7. Prevent duplicate partner redemptions
A user could apply the same partner code multiple times. There's no check for existing redemptions.

**Fix:** Add a check in `validate-promo-code` to see if the user already has a redemption for this code, and reject duplicates.

### 8. Client-side subscription_type after partner purchase
When the partner purchase succeeds on Android (line 418-420), the code doesn't explicitly update the profile with the correct `subscription_type = 'annual'`.

**Fix:** After a successful partner promo purchase, update the profile with `subscription_type: 'annual'` and `subscription_status: 'trialing'`.

## Implementation Plan

### Step 1: Fix country detection (SubscriptionContext.tsx)
Replace `navigator.language` country parsing with a free IP geolocation call (e.g., `https://ipapi.co/json/`), falling back to locale parsing.

### Step 2: Move partner attribution to server-side (validate-promo-code edge function)
- Accept optional `user_id` in the request body (extracted from auth token)
- When a partner code is validated, insert the redemption record server-side using service role
- Increment `redemption_count` on the partner code
- Check for duplicate redemptions
- Remove the client-side `savePartnerAttribution` call from SubscriptionPaywall.tsx

### Step 3: Fix subscription_type detection (revenuecat-webhook)
Update the `product_id` check to handle Google Play product IDs that may use different naming conventions:
- Check for "annual", "yearly", or ":annual-base" in the product_id
- Log the actual product_id for debugging

### Step 4: Client-side profile update after partner purchase (SubscriptionPaywall.tsx)
After a successful Google Play partner purchase, update the profile with:
- `subscription_type: 'annual'`
- `subscription_status: 'trialing'`

### Step 5: Database update for test account
Fix the test account's `subscription_type` from 'monthly' to 'annual' and `country_code` from 'DE' to the correct value.

## Technical Details

**Files to modify:**
- `src/contexts/SubscriptionContext.tsx` -- country detection improvement
- `supabase/functions/validate-promo-code/index.ts` -- server-side attribution, redemption count, duplicate check
- `supabase/functions/revenuecat-webhook/index.ts` -- broader product_id matching for plan type
- `src/components/SubscriptionPaywall.tsx` -- remove client-side attribution save, add post-purchase profile update

**No database schema changes needed** -- all tables already have the right columns.

