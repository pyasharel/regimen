
## Summary of what’s happening (based on your screenshot + code)
You’re hitting a “resume after ~30 minutes” iOS scenario where the webview is either:
1) kept alive but “half-suspended,” or  
2) silently reloaded by iOS (common), reopening directly to `/today` (not `/`),

…and then the app gets stuck in the **ProtectedRoute** hydration spinner (“Restoring your session…”) for far longer than our intended timeouts.

This is why it feels like the core issue is still there: **Splash has a hard watchdog + recovery UI, but ProtectedRoute does not.** If iOS reopens directly to `/today`, the Splash protections are bypassed.

## Most likely root cause (holistic, based on current code)
There are two compounding problems:

### A) A “never-time-out” path exists inside auth hydration
`hydrateSessionOrNull()` does time out `getSession()` and the “cached tokens -> setSession” path.

But the mirror fallback path does **not** have a timeout:
- `safeAuth.ts` calls `restoreSessionFromMirror()` with no timeout
- `restoreSessionFromMirror()` calls:
  - `persistentStorage.get()` (native Preferences) with no timeout
  - `supabase.auth.setSession()` with no timeout

If either Preferences access or `setSession()` hangs (very plausible on iOS resume), the promise can hang indefinitely, so **ProtectedRoute stays in loading forever**.

Also: `hasAnyAuthTokens()` calls `loadFromMirror()` with no timeout, so even after attempts are exhausted, it can hang before deciding “failed vs unauthenticated”.

### B) Multiple resume/startup systems can trigger auth calls that can deadlock
Even with “staggered delays,” there are still scenarios where other parts of the app can kick off auth calls while ProtectedRoute is trying to hydrate. Notably:
- `useSessionWarming` calls `supabase.auth.getSession()` on resume (fire-and-forget). If that call hangs and holds the auth lock, it can block later calls.
- `SubscriptionContext.refreshSubscription()` uses `supabase.auth.getUser()` (no timeout). If that hangs, it can also block the auth pipeline.

Net result: on iOS resume, one hung auth call can “poison” the whole auth subsystem until a hard close (which matches your observation that hard close now fixes it).

## What we’ll do differently (concrete changes that change the failure mode)
Instead of trying to “make auth always fast,” we’ll do two things:
1) **Eliminate all “infinite wait” code paths in auth hydration** (mirror + token checks must be time-bounded).
2) **Add a hard watchdog + recovery UI to ProtectedRoute** (same philosophy as Splash). Even if iOS does something weird, users won’t be stuck indefinitely.

## Implementation plan (code-level)
### 1) Add strict timeouts to native mirror operations (primary fix)
Update `src/utils/authTokenMirror.ts` and `src/utils/safeAuth.ts` so that:
- `loadFromMirror()` is wrapped with a short timeout (e.g., 800–1200ms)
- `restoreSessionFromMirror()` wraps BOTH:
  - the mirror read
  - `supabase.auth.setSession()`
  with timeouts (e.g., 1500–2500ms)

If those time out, we fail fast and continue to the next fallback step (or return null).

Key goal: **`hydrateSessionOrNull()` must always resolve within a bounded time** (e.g., < 8–10 seconds total), no matter what iOS does.

### 2) Add a “ProtectedRoute watchdog” (user-facing fix)
Update `src/components/ProtectedRoute.tsx` to include an absolute watchdog similar to `Splash.tsx`:
- If hydrationState is still `loading` after ~10 seconds:
  - switch to a recovery UI (like the “Connection issue” screen)
  - display a support code + last known stage
  - provide actions:
    - Try Again
    - Reload App (soft reload)
    - Continue to Sign In
    - Clear cache & retry (optional, already used elsewhere)

This ensures users never stare at an infinite spinner.

### 3) Prevent “resume warming” from poisoning auth (stability fix)
Update `src/hooks/useSessionWarming.ts` so it won’t start a potentially-hanging auth call at the worst time.
Options (we’ll implement one, based on what’s safest for iOS):
- Add a delay on resume (e.g., 1200–2000ms) and only run if we’re not currently hydrating.
- Or disable session warming on iOS entirely (keep it on Android), because iOS is the platform exhibiting lock/hang behavior.

This reduces the chance that a background “warm” request blocks critical hydration.

### 4) Make subscription initialization not compete with first-paint auth
Update `src/contexts/SubscriptionContext.tsx` to avoid blocking or competing during the very first auth restore:
- Ensure any auth reads (`getUser`, `getSession`) used in subscription refresh are either:
  - delayed slightly on initial mount, or
  - gated behind “auth ready” (i.e., don’t call them until ProtectedRoute hydration has completed), and/or
  - reworked to rely on cached user id first (you already have `getUserIdWithFallback`)

This reduces lock contention during the highest-risk moment (iOS resume / webview restore).

### 5) Add precise “where did it hang?” diagnostics (so we can stop guessing)
Add lightweight stage markers:
- In `hydrateSessionOrNull()`, before/after each step, write:
  - `localStorage.setItem('regimen_auth_hydration_stage', 'step_X_...')`
  - timestamps/durations
- In ProtectedRoute recovery UI, show a short support code + last stage.

This makes future reports actionable without requiring Xcode logs every time.

## Test plan (what you and beta testers will do)
### iPhone (critical)
1) Open app → confirm it loads.
2) Put app in background for 30–60 minutes (or lock screen with app backgrounded).
3) Return to app.
Expected:
- Either it restores quickly, OR
- within ~10 seconds you see recovery UI with “Try Again / Reload / Sign In” (no infinite spinner).
4) Tap “Try Again” once.
5) If still stuck, tap “Reload App” once.
We should never be in a state where you wait 60+ seconds with only a spinner.

### Android (regression check)
- Ensure notifications still fire
- Ensure no new splash loops

### Web (regression check)
- Login and navigation unaffected

## Decision on “reverting to two days ago”
I do not recommend reverting yet because:
- the most likely cause is a specific, fixable “infinite wait” path + missing watchdog in ProtectedRoute
- reverting loses valuable stability work and doesn’t guarantee removing the underlying iOS resume behavior

If, after implementing the above, we still see failures, then we’ll consider a more aggressive strategy:
- force a controlled soft reload on iOS resume when the app is “too old” (e.g., last active > 20 minutes), with loop protection.

## Optional (if you want to capture logs)
If you can reproduce once while connected to Xcode, it can confirm whether the iOS bridge or auth call is hanging. But the plan above is designed to fix this even without logs.

## Deliverable outcome
After these changes:
- Users will not get stuck on “Restoring your session…” indefinitely.
- The app will recover via retry/reload UI within a strict time budget.
- The underlying hang is much less likely because mirror + token checks won’t block forever, and resume warming won’t start risky auth calls at the wrong time.
