
# Fix: Banner Flash — The `'preview'` Status Defeats Its Own Guard

## The Actual Root Cause (One Line)

In `SubscriptionBanners.tsx` line 50, `'preview'` is included in the `definitiveStatuses` array:

```typescript
const definitiveStatuses = ['active', 'trialing', 'past_due', 'canceled', 'preview', 'lifetime'];
if (!isLoading && definitiveStatuses.includes(subscriptionStatus)) {
  setIsMountReady(true);  // ← fires immediately for 'preview' too!
}
```

The intent was: "if we get a confirmed paid status before the 3500ms timer, resolve early so subscribed users don't wait." But `'preview'` and `'none'` are the FREE statuses — the very statuses that should trigger the banner. So when the context finishes its first (stale) refresh with `subscriptionStatus = 'preview'`, this effect fires, sees `'preview'` as "definitive", and immediately sets `isMountReady = true`. The 3500ms guard is completely bypassed.

The timeline on Android looks like this:

```text
t=0ms    App boots, isMountReady = false (banner hidden ✓)
t=~300ms Context init refresh completes → subscriptionStatus = 'preview' (stale)
t=~300ms Second useEffect fires: 'preview' is in definitiveStatuses → isMountReady = true ✗
t=~300ms Banner appears immediately (the flash)
t=~2000ms SIGNED_IN refresh completes → subscriptionStatus = 'active'
t=~2000ms Banner disappears
```

The 3500ms timer never mattered because the status effect fired first at ~300ms.

## The Fix

Remove `'preview'` and `'none'` from `definitiveStatuses`. Only PAID/CONFIRMED statuses should unlock the banner early. Free/unresolved statuses must always wait for the full timer.

**File: `src/components/subscription/SubscriptionBanners.tsx`, line 50**

Change:
```typescript
const definitiveStatuses = ['active', 'trialing', 'past_due', 'canceled', 'preview', 'lifetime'];
```

To:
```typescript
const definitiveStatuses = ['active', 'trialing', 'past_due', 'canceled', 'lifetime'];
```

## What This Changes

- `active`, `trialing`, `past_due`, `canceled`, `lifetime` → still unlock immediately (subscribed users see the right UI without waiting 3.5 seconds)
- `preview`, `none` → now forced to wait the full 3500ms timer before the banner can appear
- For a subscribed user: their real status (`active`) arrives around t=2000ms, which is before the 3500ms timer, so they unlock immediately at t=2000ms and never see the free banner
- For a genuine free-tier user: they wait the full 3500ms, then the banner appears — a slight delay but acceptable

## Risk Assessment

Very low. This is removing two values from an array. The logic paths for past-due, canceled, and active subscriptions are completely unaffected. The only change in behavior is that `preview` and `none` statuses no longer bypass the timer — which is exactly what we always intended.

## Android Studio Build Output Panel

Your build is syncing correctly (versionCode 46 is visible in the screenshot). To find the Build output tab: click **View → Tool Windows → Build** in the top menu, or look for a "Build" tab at the bottom panel next to "Problems". It shows Gradle compilation logs. But this isn't needed — the code change above is the actual fix.
