

# BETALIST Partner Promo Code Implementation

## Summary

Add BETALIST promo code with iOS Safari redirect flow (real subscription) and Android backend beta access fallback (30 days free). Includes fixing a platform detection bug found during code review.

**Total Time Estimate: ~45 minutes** (mostly testing)

---

## What Each Platform Gets

| Platform | User Experience | Subscribes? |
|----------|-----------------|-------------|
| **iOS** | Enter code → Safari opens → App Store with 1 month free → Annual subscription starts | ✅ Yes |
| **Android** | Enter code → Instant 30 days premium access → No payment | ❌ No (but using app) |
| **Web** | Enter code → Same as Android fallback | ❌ No |

---

## Changes Required

### 1. Database Insert (No Code Change)

Insert BETALIST into `partner_promo_codes`:

```sql
INSERT INTO partner_promo_codes (
  code,
  partner_name,
  description,
  free_days,
  plan_type,
  offer_identifier,
  is_active
) VALUES (
  'BETALIST',
  'BetaList',
  '1 month free from BetaList',
  30,
  'annual',
  'partner_betalist_1mo',
  true
);
```

### 2. Fix Platform Detection Bug

**File:** `src/components/SubscriptionPaywall.tsx` (Line 93)

```typescript
// Before (BUG - hardcodes iOS):
platform: Capacitor.isNativePlatform() ? 'ios' : 'web',

// After (CORRECT - detects actual platform):
platform: Capacitor.isNativePlatform() ? Capacitor.getPlatform() : 'web',
```

### 3. Update Edge Function for Android Fallback

**File:** `supabase/functions/validate-promo-code/index.ts`

Accept platform parameter and return beta_access type for non-iOS partner codes:

```typescript
// Parse platform from request
const { code, platform } = await req.json();

// In partner code section, after finding valid partner code:
if (partnerCode) {
  // For iOS: Continue with Safari redirect (real subscription)
  if (platform === 'ios') {
    return { 
      valid: true, 
      isPartnerCode: true,
      redemptionUrl: `https://apps.apple.com/redeem?...`,
      // ... existing iOS response
    };
  }
  
  // For Android/Web: Fall back to beta access (30 days free, no subscription)
  return {
    valid: true,
    type: 'beta_access',
    duration: partnerCode.free_days,
    discount: 100,
    planType: 'both',
    isBackendCode: true,  // Triggers activate-beta-access flow
    description: partnerCode.description
  };
}
```

### 4. Send Platform When Validating Codes

**File:** `src/components/SubscriptionPaywall.tsx` (Line ~156)

```typescript
// Before:
const { data: validateData, error: validateError } = await supabase.functions.invoke('validate-promo-code', {
  body: { code }
});

// After:
const currentPlatform = Capacitor.isNativePlatform() ? Capacitor.getPlatform() : 'web';
const { data: validateData, error: validateError } = await supabase.functions.invoke('validate-promo-code', {
  body: { code, platform: currentPlatform }
});
```

---

## Manual Steps (You Do These)

### App Store Connect Setup

1. Go to **App Store Connect → Regimen → Subscriptions**
2. Select your **Annual subscription** product
3. Go to **Offer Codes** section
4. Create new offer code:
   - **Reference Name:** `partner_betalist_1mo`
   - **Offer Code:** `BETALIST`
   - **Offer Type:** Free Trial
   - **Duration:** 1 Month
   - **Eligibility:** New Subscribers

---

## Testing Checklist

| Test | Expected Result |
|------|-----------------|
| Enter BETALIST on iOS | Safari opens App Store with offer applied |
| Enter BETALIST on Android | Toast: "Promo activated! Enjoy 30 days free" |
| Enter BETALIST on Web | Same as Android - 30 days beta access |
| Check `partner_code_redemptions` table | Attribution saved with correct platform |

---

## Files Modified

| File | Change |
|------|--------|
| `partner_promo_codes` table | Add BETALIST row |
| `supabase/functions/validate-promo-code/index.ts` | Accept platform param, add Android fallback |
| `src/components/SubscriptionPaywall.tsx` | Fix platform detection, send platform to API |

---

## Why This Approach?

1. **iOS gets real subscriptions** - your primary revenue driver
2. **Android users aren't blocked** - they get 30 days to love the app
3. **No app update required** - edge function handles the logic
4. **Quick implementation** - leverages existing `activate-beta-access` flow
5. **Future-proof** - when you add Google Play Promotional Offers later, just update the edge function

