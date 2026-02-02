
## What I found (and why partner promo codes are almost certainly not the cause)

### Promo code logic only runs when the user taps “Apply” on the paywall
In the current codebase, the only places that call the backend promo-code functions are:
- `src/components/SubscriptionPaywall.tsx` → calls `validate-promo-code` and (sometimes) `activate-beta-access`
- `src/components/onboarding/screens/OnboardingPaywallScreen.tsx` → same, during onboarding

Nothing in the app’s boot/resume path calls those functions automatically. So the “app hangs when opening from a notification” issue is not being triggered by partner promo code checks in the background.

### The hang you describe matches a known weak spot: notification-tap resume not triggering the usual “resume” handlers
You already have multiple “resume handlers” that do important recovery work:
- `useAppStateSync.tsx` recreates clients + aborts inflight requests on resume (via `appStateChange`)
- `SubscriptionContext.tsx` refreshes subscription state on resume (via `appStateChange`)
- `App.tsx` has a “resume safety check” that reloads if the root is empty (via `appStateChange`)

But your own architecture notes in the repo highlight that **on iOS, resuming via notification tap can fail to fire `appStateChange`**. If that happens:
- client recreation/abort doesn’t happen
- the “root empty → reload” safety check doesn’t run
- any “poisoned” networking/auth state can persist
…and the user is forced into a manual hard close.

That pattern fits your symptom very closely, and it’s unrelated to promo codes.

---

## Proposed fix (high confidence, low risk): treat “visibility becomes visible” and “notification opened” as resume signals too

### Goal
Make resume recovery logic run even when `CapacitorApp.addListener('appStateChange')` fails to fire (common on iOS notification-tap resume).

### Approach
Add **additional resume triggers** that are more reliable than `appStateChange` alone:
1. `document.visibilitychange` (when app becomes visible again)
2. “notification action performed” (already captured in `notificationScheduler.ts`)

And route those triggers through the same existing recovery actions:
- abort inflight data requests
- recreate clients
- run the delayed sync
- run the “root empty” reload safety check

---

## Implementation steps (what I would change)

### 1) Add a single “resume coordinator” concept (minimal, no new behavior—just consolidating triggers)
Options:
- **Option A (cleaner):** create a tiny `src/utils/resumeCoordinator.ts` that:
  - exposes `registerResumeTrigger(cb)` and internally listens to:
    - `appStateChange`
    - `visibilitychange`
    - (optional) a custom DOM event: `regimen:resume`
- **Option B (even smaller diff):** keep everything inline by adding listeners directly inside:
  - `src/hooks/useAppStateSync.tsx`
  - `src/App.tsx`
  - (optional) `SubscriptionContext.tsx`

I’d start with Option B to reduce moving parts.

### 2) App.tsx: Add `visibilitychange` fallback for the “resume safety reload” and splash-hide retries
In `src/App.tsx`, where you currently do this only in `appStateChange`:
- call `SplashScreen.hide()` retry
- after 3s, check if root is “empty/stuck” and reload

Add a `document.visibilitychange` listener:
- If `document.visibilityState === 'visible'`:
  - call the same `attemptHide()` routine
  - schedule the same “root content check” and reload fallback

This directly addresses the “notification tap resume didn’t fire appStateChange so we never recover” failure mode.

### 3) useAppStateSync.tsx: Add `visibilitychange` fallback to run `handleAppBecameActive()`
In `src/hooks/useAppStateSync.tsx`:
- Add a `visibilitychange` listener
- When it becomes visible:
  - run `handleAppBecameActive()` (respecting the existing debounce / single-flight protections)
This ensures the “abort + recreate + delayed sync” happens even if iOS skips `appStateChange`.

### 4) notificationScheduler.ts: “poke” resume logic on notification interaction (optional but strong)
In `src/utils/notificationScheduler.ts`, inside:
- `LocalNotifications.addListener('localNotificationActionPerformed', ...)`

After enqueueing the pending action, add a very small “poke”:
- `window.dispatchEvent(new Event('regimen:resume'))`
Then, in App.tsx and/or useAppStateSync.tsx, listen for that event and treat it as a resume trigger.

Why this helps:
- Some notification interactions may not reliably flip `visibilityState` timing in a way we expect.
- This gives you a deterministic signal tied to the user action.

### 5) Add BootTracer markers so we can prove which trigger fired
You already have a great `bootTracer`.
Add a couple trace points like:
- `trace('RESUME_TRIGGER', 'appStateChange')`
- `trace('RESUME_TRIGGER', 'visibilitychange')`
- `trace('RESUME_TRIGGER', 'notification_action')`

Then, when you reproduce the hang, the Boot Diagnostics screen will tell us:
- whether the fallback triggers fired
- whether recovery ran
- where it got stuck next (if it still does)

---

## Testing checklist (to confirm the fix actually targets the issue)

### Repro steps (iOS, on-device)
1. Ensure you have scheduled dose notifications.
2. Put the phone on lock screen, wait for a notification.
3. Tap the notification to open the app (repeat 10–20 times over a day; the bug is intermittent).
4. When it hangs (or after a “bad” open), go to:
   - Settings → Help & Support → Boot Diagnostics → Copy All Diagnostics
5. Confirm we see:
   - `RESUME_TRIGGER` events
   - `CLIENTS_RECREATED_ON_RESUME` (from `useAppStateSync`)
   - no stalls before `BOOT_END`

### Pass criteria
- No more “hard close required” events (or drastically reduced).
- If a resume opens into a broken state, the app auto-recovers by reloading itself within ~3–10 seconds.

---

## Why I’m not blaming the promo codes
- Promo code functions are not called on boot/resume.
- The hang scenario aligns with “resume trigger not firing” (a known iOS notification behavior).
- The proposed changes specifically target that gap by adding backup resume signals.

---

## If this doesn’t fully fix it (next layer)
If the issue persists after adding these triggers, the next most likely culprits to investigate are:
- a native plugin stall during notification open (bridge issue)
- a background thread deadlock in RevenueCat calls (less likely, but possible)
- a specific query path still using `supabase` instead of `dataClient` during resume (there are a few remaining)

We can use the new trace markers to narrow it down quickly.

