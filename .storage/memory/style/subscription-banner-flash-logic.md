# Memory: style/subscription-banner-flash-logic
Updated: 2026-02-20

## The Banner Flash Problem — Two Distinct Scenarios

### Scenario A — Fresh uninstall (no persistent cache)
On fresh install, `confirmedPaidStatusUntil` is absent from Capacitor Preferences.
- Boot: `hasSeenPaidStatus.current = false`, `nativePaidStatusChecked = false`
- The 3500ms fallback timer fires → `isMountReady = true`
- At 3500ms on native cold start, RevenueCat hasn't responded yet (takes 4–6s)
- `subscriptionStatus` is still `'none'` → banner renders briefly
- ~1s later RC returns `active` → banner hides

### Scenario B — Returning user with valid persistent cache (trickier)
When `cachedEntitlement.isPro` is true, `initialize()` takes an early return:
```typescript
applyCachedEntitlement(cachedEntitlement, 'persistent_cache_init');
setIsLoading(false);
setIsRevenueCatResolved(true); // ← REQUIRED: signals gate is clear
(async () => {
  await initRevenueCat();
  await identifyRevenueCatUser(userId); // fires in background
})();
return; // refreshSubscription is NEVER called on this path
```
Without `setIsRevenueCatResolved(true)` here, the gate stays `false` permanently on cached boots.

## The Fix — isRevenueCatResolved Gate

`SubscriptionContext.tsx` exports `isRevenueCatResolved: boolean`:
- Starts as `false` on native platforms, `true` on web (RevenueCat not used on web)
- Set to `true` in a `finally`-equivalent block after `getCustomerInfo()` completes inside `refreshSubscription`
- **Also set to `true` at ALL exit points of `identifyRevenueCatUser`** (success, no-entitlement, and error paths) — this is critical because `identifyRevenueCatUser` is called directly from the cached-boot IIFE
- **Also set to `true` immediately** on the cached-boot early-return path, since cache confirms paid

`SubscriptionBanners.tsx` uses `isReadyToShow` instead of `isMountReady` directly:
```typescript
const isReadyToShow = isNativePlatform ? (isMountReady && isRevenueCatResolved) : isMountReady;
const shouldShowPreview = isReadyToShow && nativePaidStatusChecked && !isLoading 
  && !hasSeenPaidStatus.current 
  && (subscriptionStatus === 'preview' || subscriptionStatus === 'none') 
  && dismissed !== 'preview';
```

## Existing Suppression Layers (still active)
- **Capacitor Preferences** (`confirmedPaidStatusUntil`): 7-day TTL, survives Android process kills. Written when RC confirms `active`. Cleared on sign-out.
- **3500ms timer** (`isMountReady`): Fallback for web where RevenueCat isn't used.
- **`nativePaidStatusChecked`**: Gate that waits for async native storage read to complete before rendering.
- **`isRevenueCatResolved`**: Gate that waits for RC to have a chance to respond on native cold start. Must be set at ALL exit points of `identifyRevenueCatUser` AND on the cached-boot early-return path.

## Banner UX
- Title: 'Free Plan: Track 1 Compound'
- Subtitle: contextual based on compound count (0/1/2+)
- Dismiss: 3-day cooldown stored in localStorage
- Banner height: `calc(56px + env(safe-area-inset-top, 0px))` (safe area aware)

## Testing
**MUST uninstall app before testing** — the flash only occurs when `confirmedPaidStatusUntil` is absent from Preferences (fresh install state). Simply reinstalling over an existing build will not reproduce the bug.

Sync chain:
```bash
cd ~/regimen-health-hub
git pull && npm install && npm run build && npx cap update android && ./sync-version.sh
```
Then: `npx cap open android` → Clean Project → Rebuild → **Uninstall app** → Run ▶
