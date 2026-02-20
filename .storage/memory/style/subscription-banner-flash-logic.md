# Memory: style/subscription-banner-flash-logic
Updated: 2026-02-20

## The Banner Flash Problem (Fresh Install Race Condition)

On fresh install (or after uninstall), the Android/iOS Capacitor Preferences key `confirmedPaidStatusUntil` is cleared. This causes a race condition on cold boot:

1. Fresh uninstall clears Capacitor Preferences → `confirmedPaidStatusUntil` key is gone
2. On boot, `hasSeenPaidStatus.current = false`
3. The 3500ms fallback timer fires and sets `isMountReady = true`
4. At 3500ms on native cold start, RevenueCat hasn't responded yet (takes 4-6 seconds)
5. `subscriptionStatus` is still `'none'` at that moment → banner renders briefly
6. ~1 second later, RevenueCat returns `active` → banner hides

**The 3500ms timer is the wrong gate on native.** The correct gate is to wait for RevenueCat to say something definitive.

## The Fix — isRevenueCatResolved Gate

`SubscriptionContext.tsx` exports `isRevenueCatResolved: boolean`:
- Starts as `false` on native platforms, `true` on web (RevenueCat not used on web)
- Set to `true` in a `finally` block after `getCustomerInfo()` completes (success or error)
- Also set to `true` if RC identification fails (so we don't block the banner forever)

`SubscriptionBanners.tsx` uses `isReadyToShow` instead of `isMountReady` directly:
```typescript
const isReadyToShow = isNativePlatform ? (isMountReady && isRevenueCatResolved) : isMountReady;
const shouldShowPreview = isReadyToShow && nativePaidStatusChecked && !isLoading 
  && !hasSeenPaidStatus.current 
  && (subscriptionStatus === 'preview' || subscriptionStatus === 'none') 
  && dismissed !== 'preview';
```

This guarantees on native, the preview banner never renders until RevenueCat has had a chance to respond. Once RC returns `active`, `hasSeenPaidStatus.current` is set to `true` in the same render cycle — so the banner never shows at all for paid users.

## Existing Suppression Layers (still active)
- **Capacitor Preferences** (`confirmedPaidStatusUntil`): 7-day TTL, survives Android process kills. Written when RC confirms `active`. Cleared on sign-out.
- **3500ms timer** (`isMountReady`): Fallback for web where RevenueCat isn't used.
- **`nativePaidStatusChecked`**: Gate that waits for async native storage read to complete before rendering.
- **`isRevenueCatResolved`** (new): Gate that waits for RC's first response on native cold start.

## Banner UX
- Title: 'Free Plan: Track 1 Compound'
- Subtitle: contextual based on compound count (0/1/2+)
- Dismiss: 3-day cooldown stored in localStorage
- Banner height: `calc(56px + env(safe-area-inset-top, 0px))` (safe area aware)
