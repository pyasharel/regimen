
## What went wrong with the sync troubleshooting

The documentation already had the correct answer. The failure was prioritization — the right steps (git pull + npx cap open android) were buried and I kept generating new theories. The fix is one added line to the memory file making the "wrong project directory" check the very first diagnostic step.

## Why the banner still flashes

This is a specific cold-start race condition that only happens after a fresh uninstall:

1. Fresh uninstall clears Capacitor Preferences → `confirmedPaidStatusUntil` key is gone
2. On boot, `hasSeenPaidStatus.current = false`
3. The 3500ms fallback timer fires and sets `isMountReady = true`
4. At 3500ms, RevenueCat hasn't resolved yet (takes 4-6 seconds on native cold start)
5. `subscriptionStatus` is still `'none'` at that moment → banner renders
6. ~1 second later, RevenueCat returns `active` → banner hides

The timer is the wrong gate on native. The right gate is: **wait for RevenueCat to say something definitive before ever allowing the preview banner to show**.

## Changes

### 1. Update the memory file (deployment/native-version-sync-workflow.md)

Add a bolded "FIRST DIAGNOSTIC STEP" section at the very top, above everything else:

```
## FIRST DIAGNOSTIC STEP — Before anything else, confirm Android Studio title bar

If the device shows old code after Clean + Rebuild + Run:
- Check Android Studio title bar — it MUST end in `.../regimen-health-hub/android`
- If it shows any nested path, STOP, close Android Studio, and run: npx cap open android
- Then run the full chain again
```

### 2. Fix the banner flash in SubscriptionBanners.tsx

**Current logic (broken on fresh install):**
- Timer fires at 3500ms → `isMountReady = true`
- At 3500ms on native cold start, RevenueCat hasn't responded yet
- `subscriptionStatus === 'none'` → banner flashes

**New logic:**
- Add a `revenueCatResolved` state that starts `false`
- On native platforms, expose a signal from `SubscriptionContext` that RevenueCat has finished its first check (already tracked internally via `revenueCatEntitlementRef` and the `lastStatusSource` field)
- The preview banner only shows when BOTH `isMountReady` AND `revenueCatResolved` are true on native

**Concrete implementation — two small changes:**

**In `SubscriptionContext.tsx`:** Export a new value `isRevenueCatResolved: boolean` that becomes `true` after the first `getCustomerInfo()` call completes (on native) or immediately (on web, where RevenueCat isn't used).

**In `SubscriptionBanners.tsx`:** Replace the `isMountReady` timer gate with:
```typescript
const { isRevenueCatResolved } = useSubscription();
// On native: wait for RevenueCat. On web: use existing 3500ms timer.
const isReadyToShow = isNativePlatform ? (isMountReady && isRevenueCatResolved) : isMountReady;
```

And update `shouldShowPreview` to use `isReadyToShow` instead of `isMountReady`:
```typescript
const shouldShowPreview = isReadyToShow && nativePaidStatusChecked && !isLoading 
  && !hasSeenPaidStatus.current 
  && (subscriptionStatus === 'preview' || subscriptionStatus === 'none') 
  && dismissed !== 'preview';
```

This guarantees that on native, the banner will never appear until RevenueCat has had a chance to respond with an active entitlement. Once RevenueCat says `active`, `hasSeenPaidStatus.current` is set to `true` in the same render cycle, so the banner never renders at all.

### 3. Also update the memory file for the banner flash fix

Add to `.storage/memory/style/subscription-banner-flash-logic.md`:
- Document that on fresh install, native storage is cleared, so the 3500ms timer is insufficient
- The `isRevenueCatResolved` gate is the correct solution for native platforms
