

# Wire Up Google Play Partner Promo Codes

## Summary
Update the app so that partner promo codes on Android trigger the native Google Play `partner-1mo-free` offer (1 month free trial on annual plan) instead of the current "beta access" backend fallback. This creates real auto-renewing subscriptions with proper revenue tracking for partner payouts.

## Pre-Code Setup (Manual Steps)

1. **RevenueCat Dashboard**: Go to Products, find your Android annual subscription, and confirm the `partner-1mo-free` offer is synced from Google Play. If not, re-import the product.
2. That's it for manual setup -- the Google Play Console side is already done.

## Code Changes

### 1. Update `validate-promo-code` Edge Function

**File:** `supabase/functions/validate-promo-code/index.ts`

Currently, for Android partner codes, it returns `type: 'beta_access'` with `isBackendCode: true`. Change the Android/non-iOS path to return Google Play offer details instead:

```
// For Android: Use Google Play developer-determined offer
if (platform === 'android') {
  return {
    valid: true,
    type: 'partner_code',
    isPartnerCode: true,
    useNativePurchase: true,
    googleOfferId: 'partner-1mo-free',
    planType: partnerCode.plan_type,
    partnerName: partnerCode.partner_name,
    partnerCodeId: partnerCode.id,
    description: partnerCode.description
  }
}
```

Web platform continues to use the beta access fallback (no Google Play billing on web).

### 2. Update `SubscriptionPaywall.tsx` -- Promo Validation Handler

**File:** `src/components/SubscriptionPaywall.tsx`

In `handleApplyPromo`, the existing `isPartnerCode && useNativePurchase` branch (lines 199-222) already stores `partnerPromo` state and shows a VIP welcome message. Add a `googleOfferId` field to the `PartnerPromo` interface and store it:

```typescript
interface PartnerPromo {
  code: string;
  partnerName: string;
  partnerCodeId: string;
  googleOfferId?: string;  // NEW: Google Play offer ID for Android
}
```

When storing the partner promo, include the offer ID:
```typescript
setPartnerPromo({
  code,
  partnerName: validateData.partnerName || 'Partner',
  partnerCodeId: validateData.partnerCodeId,
  googleOfferId: validateData.googleOfferId,  // NEW
});
```

### 3. Update `SubscriptionPaywall.tsx` -- Purchase Handler

**File:** `src/components/SubscriptionPaywall.tsx`

In `handleStartTrial`, when a `partnerPromo` with a `googleOfferId` exists on Android:
- Force the selected plan to annual (partner offer is on the annual base plan)
- Find the annual package from RevenueCat offerings
- Call `purchasePackage` with the Google Play offer via RevenueCat's `googleProductChangeInfo` or `googleSubscriptionOption` parameter

The RevenueCat Capacitor SDK supports passing a specific subscription option. The purchase call will look approximately like:

```typescript
if (partnerPromo?.googleOfferId && Capacitor.getPlatform() === 'android') {
  // Force annual plan for partner offer
  const annualPackage = packages.find(p => p.identifier === '$rc_annual');
  
  // Find the subscription option matching the partner offer
  const partnerOption = annualPackage?.product?.subscriptionOptions?.find(
    opt => opt.id?.includes('partner-1mo-free')
  );
  
  if (partnerOption) {
    const result = await purchasePackage(annualPackage, undefined, partnerOption);
    // ... handle result
  }
}
```

### 4. Update `SubscriptionContext.tsx` -- purchasePackage signature

**File:** `src/contexts/SubscriptionContext.tsx`

Extend `purchasePackage` to accept an optional Google subscription option parameter, passing it through to RevenueCat's `Purchases.purchasePackage` or `Purchases.purchaseSubscriptionOption` call. This ensures the `partner-1mo-free` free trial phase is applied at checkout.

### 5. No Database Changes Needed

The existing `partner_code_redemptions` table and `partner_promo_codes` table already support Android. Attribution is saved before purchase, and the RevenueCat webhook already handles subscription events.

## What This Means for Users

- Users on the **new app version** can enter a partner code on Android and get the native Google Play "1 month free" trial on the annual plan
- Users on **older versions** will still get the beta access fallback (the edge function can check app version or we keep the web fallback for graceful degradation)
- Partners get proper revenue tracking since it flows through Google Play and RevenueCat webhooks

## Testing Plan

1. Build and deploy the updated edge function
2. Build the Android app with the code changes
3. Use a Google Play test account to enter a partner code (e.g., RESEARCH1) and verify the checkout shows "1 month free" trial
4. Confirm attribution is saved in `partner_code_redemptions`
5. Confirm RevenueCat shows the subscription with the correct offer

