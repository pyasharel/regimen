
## Root Cause: Definitive Analysis

I read every relevant line of both files carefully. The fix that was implemented (adding `isRevenueCatResolved`) is structurally correct — but it **does not eliminate the flash for a user who has been seen before** (i.e., after a first launch that succeeds, then app kill + relaunch).

### The actual problem: TWO separate flash scenarios

**Scenario A — Fresh uninstall (no cache)**
The `isRevenueCatResolved` gate helps here. RevenueCat runs inside `refreshSubscription`, sets the status to `active`, and sets `isRevenueCatResolved = true` — all before the 3500ms timer. This scenario is now fixed.

**Scenario B — Returning user with valid persistent cache (the current bug)**
Line 1253–1275 of `SubscriptionContext.tsx`:
```typescript
if (cachedEntitlement?.isPro) {
  applyCachedEntitlement(cachedEntitlement, 'persistent_cache_init');
  setIsLoading(false);
  // Fires RC verification in background
  (async () => {
    await initRevenueCat();
    await identifyRevenueCatUser(userId);  // ← sets status active
  })();
  return; // ← EARLY RETURN — refreshSubscription is NEVER called
}
```

When the early return fires:
1. `applyCachedEntitlement` sets `subscriptionStatus = 'active'`
2. `isLoading` is set to `false`
3. The background async IIFE runs `identifyRevenueCatUser` — which also may update status
4. **But `setIsRevenueCatResolved(true)` is NEVER called** on this code path

So `isRevenueCatResolved` stays permanently `false`. The gate `isReadyToShow = isMountReady && isRevenueCatResolved` is `false` — which should SUPPRESS the banner.

**So why is the banner still showing?**

Look at the `hasSeenPaidStatus` guard in `SubscriptionBanners.tsx` (line 80–94):
```typescript
if (!isLoading && paidStatuses.includes(subscriptionStatus)) {
  hasSeenPaidStatus.current = true;
  Preferences.set({ key: NATIVE_PAID_KEY, value: expiry });
}
```

This writes to `Preferences`. On the **next** cold start, the `checkNativeStorage` effect reads it back and sets `hasSeenPaidStatus.current = true` — which SUPPRESSES the banner entirely, bypassing the `isRevenueCatResolved` gate.

**The flash happens in this exact sequence:**
1. Very first app launch after install — no `confirmedPaidStatusUntil` key in Preferences
2. Cold start — `hasSeenPaidStatus.current = false`, `nativePaidStatusChecked = false`
3. `nativePaidStatusChecked` goes `true` (storage read returns empty)
4. `isRevenueCatResolved` is `false` (init not complete)
5. `isLoading = true` (still loading)
6. 3500ms timer fires → `isMountReady = true`
7. At this point `shouldShowPreview = isMountReady && nativePaidStatusChecked && !isLoading && !hasSeenPaidStatus.current && status === 'none'`
8. **If `isLoading` is still `true` at 3500ms** → banner is suppressed ✓
9. **If `isLoading` becomes `false` before RC resolves** → banner shows ✗

**When does `isLoading` go `false` before RC resolves?**
The watchdog at line 245 forces `isLoading = false` after 5000ms. But normal flow: on native with a fast profile read, `isLoading` could go `false` right after the profile returns (around 2–3s), while RC (identifyUser) is still running separately (4–6s). **This is the exact window where the flash occurs.**

### The Fix: Three targeted changes

**Fix 1 — Always call `setIsRevenueCatResolved(true)` on the cached-boot early-return path**

In the `initialize()` function in `SubscriptionContext.tsx`, after the background RC IIFE on the cached boot path, add `setIsRevenueCatResolved(true)` right before the `return`. Since the cache confirms the user is paid, we don't need to wait for RC — we can mark it resolved immediately.

```typescript
if (cachedEntitlement?.isPro) {
  applyCachedEntitlement(cachedEntitlement, 'persistent_cache_init');
  setIsLoading(false);
  setIsRevenueCatResolved(true); // ← ADD THIS LINE
  // ... rest of background IIFE
  return;
}
```

**Fix 2 — Keep `isLoading = true` until RC has actually resolved on native**

Currently `isLoading` goes `false` in the `finally` block of `refreshSubscription` — even before the RC block completes in some error paths. The `shouldShowPreview` condition already checks `!isLoading`, so if we ensure `isLoading` stays true until RC resolves, the banner cannot flash.

In `refreshSubscription`, the RC `finally` block already sets `isRevenueCatResolved(true)`. But the outer `finally` at line 482 sets `isLoading(false)` regardless. This is correct — we don't want to change that.

What we need is: **`shouldShowPreview` must require BOTH `!isLoading` AND `isRevenueCatResolved`**. This is already done with `isReadyToShow`. The gap is the cached-boot path skipping `setIsRevenueCatResolved(true)`.

**Fix 3 — Add `setIsRevenueCatResolved(true)` inside `identifyRevenueCatUser` when called from a non-refresh context**

`identifyRevenueCatUser` is called from the cached-boot background IIFE. It completes and sets subscription status to `active` — but never signals `isRevenueCatResolved`. Adding a call to `setIsRevenueCatResolved(true)` as a parameter or simply always calling it at the end of `identifyRevenueCatUser` would close this gap permanently across all call sites.

### Summary of exact file changes

**`src/contexts/SubscriptionContext.tsx`** — Two small additions:

1. In the `initialize()` function (around line 1257), on the persistent-cache early-return path, add `setIsRevenueCatResolved(true)` before `return`:
   ```typescript
   if (cachedEntitlement?.isPro) {
     applyCachedEntitlement(cachedEntitlement, 'persistent_cache_init');
     setIsLoading(false);
     setIsRevenueCatResolved(true);  // NEW
     (async () => { ... })();
     return;
   }
   ```

2. At the end of `identifyRevenueCatUser` (in its `finally` or at the return point), call `setIsRevenueCatResolved(true)` — since if identification completes (success or error), RC has had its chance to respond:
   ```typescript
   // At the end of identifyRevenueCatUser, before return:
   setIsRevenueCatResolved(true);
   ```
   This closes the gap for ALL callers of `identifyRevenueCatUser`, not just the cached-boot path.

**`SubscriptionBanners.tsx`** — No changes needed. The logic is correct. Once `isRevenueCatResolved` is reliably set `true` by the context, the gate works as intended.

**`.storage/memory/style/subscription-banner-flash-logic.md`** — Update to document the two flash scenarios and the fact that `identifyRevenueCatUser` must also call `setIsRevenueCatResolved(true)`.

### Why this won't cause slowdowns

- `setIsRevenueCatResolved(true)` on the cached-boot path fires IMMEDIATELY when cache is confirmed — so on fast subsequent launches the banner gate clears instantly, not delayed
- For free users, `identifyRevenueCatUser` completing (no entitlement found) correctly lets `isRevenueCatResolved = true`, which then allows the 3500ms timer to show the banner normally
- The changes are additive state updates, no additional network calls or blocking operations

### Sync instructions

After this change is committed, run the full chain:
```bash
cd ~/regimen-health-hub
git pull && npm install && npm run build && npx cap update android && ./sync-version.sh
```
Then `npx cap open android` → Clean Project → Rebuild → **Uninstall app** → Run ▶
