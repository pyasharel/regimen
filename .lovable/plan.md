
# Fix: Eliminate the 1-Second "Free Plan" Banner Flash on Login

## Root Cause

The banner flash happens due to a timing gap in the subscription loading sequence:

1. The app boots → `SubscriptionContext` runs its initial `refreshSubscription('context_init')` with no logged-in user → completes quickly → sets `isLoading = false` and `subscriptionStatus = 'none'`
2. User logs in → `onAuthStateChange` fires with `SIGNED_IN` → calls `refreshSubscription` via `setTimeout(0)` (deferred by design to prevent auth lock contention)
3. During this deferred window, `isLoading` is `false` and status is still `'none'` — the preview banner briefly appears
4. The second refresh completes with the real subscription status → banner disappears

On native, this window is wider because RevenueCat identification adds extra async work before the status resolves.

**Why it worked before:** Earlier versions likely didn't have the deferred `setTimeout(0)` pattern. That was added specifically to fix auth lock contention issues, which is the right tradeoff — but it introduced this brief visual gap.

## The Fix: Mount Delay in SubscriptionBanners

The safest, least invasive fix is to suppress the preview banner for the first **1500ms after the component mounts**. This covers the window between the initial `context_init` refresh completing and the `SIGNED_IN` refresh resolving.

- The existing `isLoading` guard already handles the initial load
- The mount delay plugs the specific gap between the two sequential refresh cycles
- Past-due and canceled banners are NOT delayed — they are payment-critical and should never be suppressed
- No changes to `SubscriptionContext`, auth flow, or any other component

## File to Modify

**`src/components/subscription/SubscriptionBanners.tsx`**

Add a `isMounted` state that starts `false` and flips to `true` after a 1500ms `setTimeout`. The preview banner (`shouldShowPreview`) only renders when `isMounted` is also `true`.

```
const [isMountReady, setIsMountReady] = useState(false);

useEffect(() => {
  const timer = setTimeout(() => setIsMountReady(true), 1500);
  return () => clearTimeout(timer);
}, []);

// Updated condition:
const shouldShowPreview = isMountReady && !isLoading && (subscriptionStatus === 'preview' || subscriptionStatus === 'none') && dismissed !== 'preview';
```

## What This Does NOT Change

- Past-due and canceled banners are unaffected — they show immediately as before
- The `isLoading` guard remains in place as a secondary protection
- No auth flow, boot sequence, or `SubscriptionContext` logic is touched
- No risk of breaking anything — it only delays showing a non-urgent banner by 1.5 seconds on initial mount

## Risk Assessment

Very low. The 1500ms window is conservative and covers the full RevenueCat identify + refresh cycle on both iOS and Android. Subscribed users will simply never see the banner at all. Free-tier users will see it 1.5 seconds after opening the app instead of immediately, which is acceptable and avoids the confusing flash.
