

## Plan: Switch Partner Promo Code Redemption to Safari URL Flow

### Overview
Replace the current native `presentCodeRedemptionSheet()` approach with a Safari URL redirect that pre-fills the promo code automatically. This eliminates the friction of users having to copy/paste the code manually.

---

### Current Flow (Friction Point)
1. User enters promo code (e.g., `RESEARCH1`)
2. App validates code → Shows "1 month FREE" card
3. User taps "Claim Your 1 Month Free"
4. Code is copied to clipboard
5. Native redemption sheet opens (blank)
6. **User must paste code manually** ← Friction!
7. User authenticates with Apple ID
8. Subscription activates

### New Flow (Frictionless)
1. User enters promo code (e.g., `RESEARCH1`)
2. App validates code → Shows "1 month FREE" card
3. User taps "Claim Your 1 Month Free"
4. App opens Safari with pre-filled URL: `https://apps.apple.com/redeem?ctx=offercodes&id=6753905449&code=RESEARCH1`
5. **Code is already filled in** ← No friction!
6. User authenticates with Apple ID
7. Safari closes, app refreshes subscription status

---

### Implementation Details

#### 1. Modify `SubscriptionPaywall.tsx` - Apple Offer Code Flow (~Lines 289-321)

**Replace this block:**
```typescript
// Current: Opens native redemption sheet (requires manual paste)
setIsAwaitingAppleReturn(true);
await Purchases.presentCodeRedemptionSheet();
```

**With:**
```typescript
// New: Open Safari with pre-filled redemption URL
setIsAwaitingAppleReturn(true);

// Use the redemptionUrl from validate-promo-code response
const url = appleOfferPromo.redemptionUrl;
console.log('[PAYWALL] Opening Safari with pre-filled code:', url);

// Open in external Safari (not in-app browser) for best UX
const { Browser } = await import('@capacitor/browser');
await Browser.open({ 
  url,
  presentationStyle: 'popover' // Opens as Safari modal overlay
});
```

#### 2. Update App Resume Handler (~Lines 78-112)

The existing `appStateChange` listener will still work for detecting when the user returns from Safari. We'll enhance it to:
- Handle both successful redemption and user cancellation
- Add a slight delay for RevenueCat sync
- Show appropriate success/error messages

```typescript
// Enhance resume handler
const handleAppResume = async () => {
  console.log('[PAYWALL] App resumed after Safari redemption flow');
  setIsAwaitingAppleReturn(false);
  setIsLoading(true);
  
  // Give RevenueCat time to sync with Apple
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await refreshSubscription('partner_redemption');
  
  // Check if subscription is now active
  // If not, show helpful message
  setIsLoading(false);
};
```

#### 3. Update UI Messaging

**Before clicking "Claim":**
- Remove the "code copied to clipboard" toast since it's no longer needed
- Keep the partner promo card UI showing the offer details

**Button text:** Keep as `"Claim Your 1 Month Free"` (already correct)

#### 4. Fallback Handling

If Safari fails to open (rare edge case), fall back to the native sheet:
```typescript
try {
  await Browser.open({ url: appleOfferPromo.redemptionUrl });
} catch (browserError) {
  console.warn('[PAYWALL] Safari failed, falling back to native sheet');
  await navigator.clipboard.writeText(appleOfferPromo.appleOfferCode);
  toast.info('Code copied! Paste it in the next screen.');
  await Purchases.presentCodeRedemptionSheet();
}
```

---

### Files to Modify
1. **`src/components/SubscriptionPaywall.tsx`** - Main changes to the Apple Offer Code redemption flow

### No Backend Changes Required
The `validate-promo-code` edge function already returns the `redemptionUrl` field with the correct pre-filled URL format.

---

### Testing Steps
1. Build and deploy to TestFlight
2. Enter `RESEARCH1` promo code
3. Verify Safari opens with code pre-filled
4. Complete Apple authentication
5. Confirm subscription activates and app refreshes correctly

