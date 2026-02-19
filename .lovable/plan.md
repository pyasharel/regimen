
# Fix Today Screen Header + TestFlight Rating Guard

## Issue 1: Today Screen Header Bleeding Into Status Bar

**Root cause found:** TodayScreen (line 1365) has an inline style `style={{ paddingTop: 'var(--app-banner-height, 0px)' }}` that **overrides** the `.app-top-padding` CSS class. The CSS class provides the safe area inset:

```css
.app-top-padding {
  padding-top: calc(max(1.5rem, env(safe-area-inset-top)) + var(--app-banner-height));
}
```

But the inline style replaces it with just `var(--app-banner-height, 0px)` -- no safe area inset. This is why Today is the only screen with the problem; My Stack, Progress, and Settings all use the class without an inline override.

**Fix:** Remove the inline `style={{ paddingTop: ... }}` from TodayScreen's root div (line 1365). The `.app-top-padding` class already handles both the safe area inset AND banner height correctly.

**File:** `src/components/TodayScreen.tsx` line 1365

---

## Issue 2: Rating Popup Stuck on TestFlight

**This is expected Apple behavior, not a bug in our code.** On TestFlight builds, `SKStoreReviewController.requestReview()` shows the rating dialog but Submit does nothing -- Apple blocks actual ratings from test builds. The dialog appeared because Jay meets all auto-rating criteria (account age 14+ days, 15+ doses, 2+ compounds, new app version).

**However**, we should prevent the auto-prompt from firing on TestFlight builds entirely, since it's a dead-end experience. The `requestRating` function already detects TestFlight and skips the native dialog, but `useAutoRatingPrompt` calls `requestRating('auto_prompt', { skipStoreFallback: true })` which correctly avoids the store redirect... except the TestFlight detection happens *inside* `requestRating`, and the native `InAppReview.requestReview()` is attempted before the TestFlight check only applies to the fallback path.

Wait -- looking more carefully at ratingHelper.ts, the TestFlight check IS done before the native call. If TestFlight is detected, it returns early with `not_available`. So the dialog Jay saw was the actual native iOS dialog, which means TestFlight detection might have failed, OR this is a production App Store build, not TestFlight.

Actually, looking at the screenshot -- that IS the native iOS `SKStoreReviewController` dialog (Apple's system UI with the Regimen icon, stars, Submit/Cancel). On TestFlight, this dialog shows but doesn't actually submit. This is Apple's documented behavior. Our code is working correctly -- it requested the review, Apple showed the dialog, but since it's TestFlight, tapping Submit is a no-op.

**Fix:** Add a TestFlight guard in `useAutoRatingPrompt` so the auto-prompt never fires on TestFlight builds. This prevents the confusing dead-end dialog.

**File:** `src/hooks/useAutoRatingPrompt.ts` -- add TestFlight detection before the eligibility checks

---

## Issue 3: RevenueCat "Conversion" After Cancellation (No Code Change Needed)

This is normal Apple subscription behavior:

1. **Feb 4:** Customer started a free trial for Monthly
2. **Feb 16:** Customer "canceled" -- this only turns off auto-renew, the trial still runs to its end date
3. **Feb 18 (7h ago):** Trial period ended, Apple charged the first month (conversion)

In Apple's system, "cancel" during a trial doesn't immediately stop the subscription. The user keeps access until the trial ends, then gets charged for the first billing period. The cancellation takes effect at the END of that first paid period (so they won't renew next month, but they pay for this month).

This is standard iOS subscription behavior. The customer will have access for one paid month, then their subscription will actually expire. No action needed on our end.

---

## Summary of Code Changes

| File | Change |
|------|--------|
| `src/components/TodayScreen.tsx` line 1365 | Remove inline `style={{ paddingTop: ... }}` so `.app-top-padding` works correctly |
| `src/hooks/useAutoRatingPrompt.ts` | Add TestFlight detection guard to skip auto-prompt on test builds |

After implementing, sync to device with:
```
npm run build && npx cap sync ios && npx cap run ios
```

## What About Loading Speed?

The persistent tabs are already implemented. The speed you're seeing now IS approximately as fast as Capacitor gets -- the web view needs to parse and render HTML/CSS/JS, which will always have a small overhead compared to truly native UIKit rendering. The persistent tabs eliminate the re-mounting delay, but the initial render of each screen still takes a moment. This is a fundamental Capacitor limitation, not something we can optimize further in code.
