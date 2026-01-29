
## What’s actually happening (root cause)

This is not “just slow network.” The behavior you described (sometimes everything loads, sometimes you see “first‑time user” empty data after a hard close, then a second hard close magically fixes it) matches a very specific failure mode in this codebase:

### Root cause A — We sometimes enter the app without a real authenticated session
`ProtectedRoute.tsx` has a “cache fallback” path:

- It races `supabase.auth.getSession()` against a 3s timeout.
- If that times out, it **creates a fake “Session-like” object** from localStorage cache (only `user: cached.user`) and allows the app to render protected screens.

This means: the UI thinks you’re logged in, but the underlying client may still be effectively anonymous for DB requests (no access token attached yet).

Because your database is protected by row-level security (RLS), **anonymous queries return empty arrays** (often with HTTP 200), not obvious errors. That makes the app look like a brand-new user: no doses, no compounds, etc.

### Root cause B — Some core data queries run immediately and are not gated on auth readiness
Example: `TodayScreen.loadDoses()` runs on mount and queries `doses` by `scheduled_date` **without first obtaining a userId/session**, so it can easily execute while auth is still “hydrating.”

Same for `MyStackScreen.loadCompounds()` (it queries `compounds` without user gating).

When those execute during the “fake session” window, they come back empty, and the UI treats that as valid data.

### Root cause C — Startup/resume background work creates contention and can trigger iOS permission-dialog side effects
`useAppStateSync()` currently runs a heavy sync not only on resume, but also on **initial mount after 300ms**, including:

- profile fetch
- cleanup/regeneration
- fetching doses
- scheduling notifications

And `scheduleAllUpcomingDoses()` currently calls `LocalNotifications.requestPermissions()` (via `requestNotificationPermissions`) which can introduce iOS permission dialog timing + appStateChange churn, and native bridge contention.

This doesn’t “cause” the empty-data bug by itself, but it makes the auth hydration timeout more likely, which then triggers Root cause A.

### Bonus issue that makes debugging harder — Two QueryClients exist
`main.tsx` wraps the app in a `QueryClientProvider` (using `src/lib/queryClient.ts`), but `App.tsx` **creates another QueryClientProvider** with a different client.

This can prevent retries/invalidation patterns from behaving consistently (and makes “tap to retry”/refetch behavior less reliable in screens that use React Query, like Progress).

## Hotfix goal
Make it impossible for the UI to render “logged in” screens until the app has a real, hydrated authenticated session (or we definitively know the user is logged out). Also reduce startup contention so the session hydration succeeds reliably.

## Implementation plan (surgical, aimed at shipping ASAP)

### 1) Replace “fake session from cache” with “hydrate session from cache”
**File: `src/components/ProtectedRoute.tsx`**

- Create/introduce a helper (either in this file or in `src/utils/safeAuth.ts`) like:

  - `hydrateSessionOrNull({ timeoutMs })`
    - Try `supabase.auth.getSession()` with a reasonable timeout (e.g. 6–8s, because this is foundational).
    - If it times out:
      - Read the full cached session from `getCachedSession()` (which includes `access_token`, `refresh_token`).
      - Call `supabase.auth.setSession({ access_token, refresh_token })` with a short timeout (e.g. 1500–2000ms).
      - Then call `getSession()` again (short timeout) to confirm hydration.
    - Return a real session or null.

- ProtectedRoute behavior changes:
  - While hydrating: show a “Restoring your session…” loading UI (not the app screens).
  - If hydration succeeds: render children.
  - If hydration fails: send user to `/auth` (or show a recovery UI with “Try again” + “Sign in again”).

This prevents the “logged-in UI but anonymous DB requests” split-brain state.

### 2) Gate Today/MyStack data loads behind auth readiness
Even with (1), we should still harden the screens so they never treat anonymous empty results as “real empty user.”

**Files:**
- `src/components/TodayScreen.tsx`
- `src/components/MyStackScreen.tsx`

Changes:
- Ensure every “load X” function first confirms auth is ready (via the same helper used by ProtectedRoute, or at least `supabase.auth.getSession()`).
- Update critical queries to explicitly scope by user:
  - TodayScreen:
    - `loadDoses-main`: add `.eq('user_id', userId)` (after you have userId)
    - `loadDoses-asNeeded`: add `.eq('user_id', userId)`
    - `checkCompounds`: add `.eq('user_id', userId)` (right now it can incorrectly show “no compounds”)
  - MyStackScreen:
    - `loadCompounds`: require userId and add `.eq('user_id', userId)`
- If userId/session isn’t available, keep `loading=true` and do not set “empty state” UI; instead show “Restoring session…” and/or a retry button.

This directly addresses the “looks like first-time user” symptom.

### 3) Remove initial-mount heavy sync (only run on resume)
**File: `src/hooks/useAppStateSync.tsx`**

- Delete/disable the “Also sync on initial mount (with small delay)” block:
  - The `setTimeout(..., 300)` that calls `syncNotifications()` should be removed for the hotfix.
- Keep resume-based syncing only (and it’s already delayed to 1500ms).

This reduces cold-start contention at the exact moment auth/session hydration is happening.

### 4) Stop requesting notification permission automatically during sync/scheduling
**File: `src/utils/notificationScheduler.ts`**

- Change `scheduleAllUpcomingDoses()` to:
  - call `LocalNotifications.checkPermissions()` first
  - if not granted, return without scheduling
  - do not call `LocalNotifications.requestPermissions()` from this path

This ensures notification code cannot trigger a permission prompt (or native bridge work) during boot/resume, which is a known destabilizer on iOS.

We will still keep permission requests in explicit user flows (onboarding/settings) later.

### 5) Unify to a single QueryClientProvider (stability + consistent refetch)
**File: `src/App.tsx`**

- Remove the inner `QueryClientProvider` and `new QueryClient()` from App.tsx.
- Rely solely on the QueryClientProvider in `main.tsx` (which uses the configured `src/lib/queryClient.ts`).

This reduces non-deterministic caching behavior and makes future “invalidate/refetch on auth change” reliable.

### 6) Add targeted diagnostics so we can prove the fix and catch regressions
Add lightweight instrumentation (console + localStorage markers), for example:
- In ProtectedRoute:
  - record whether hydration used cache setSession, how long it took, and whether it succeeded
- In TodayScreen/MyStack:
  - log when loads begin, whether a real session exists at that moment

This will let us verify on-device (Xcode logs) exactly where it previously failed.

## Testing protocol (what we’ll verify before calling it a hotfix)
On iOS/TestFlight build:

1. Launch app, confirm data loads.
2. Hard close (swipe away), wait 10 seconds, reopen.
3. Repeat 5 times:
   - Expectation: no “first-time user” empty state
   - Expectation: no “slow connection” loop where retry does nothing
   - If session hydration is slow: you may see “Restoring your session…” briefly, but it should resolve to your real data.
4. Toggle airplane mode on/off and repeat once:
   - Expectation: “Restoring session / offline” behavior is understandable, and retry works once network returns.
5. (Optional) Tap a notification to open the app:
   - Expectation: app still loads data; no permission prompt is triggered automatically.

## Why I think you do not need another AI platform (but you can)
You can absolutely ask for a second opinion, but at this point we have a concrete, code-backed root cause:
- A cached-session fallback allows navigation without hydrating auth tokens
- Ungated DB queries execute during that window and return empty due to RLS
- Startup sync/notification permission calls increase the chance of that window happening

This is a fixable engineering issue, not a mystery.

## Summary of what we’ve already done (for sharing if you want)
- Added startup preflight to prevent corrupted localStorage “black screen” boots.
- Added boot timeout fallback UI if React doesn’t mount within 6s.
- Added Splash fast-path session check + 8s session check watchdog UI.
- Added theme bootstrap timeout + ThemeProvider guard to reduce cold-start hangs.
- Added staggered resume delays (subscription, sync, analytics) to reduce contention.
- Updated Medication Levels Card data fetch to use “latest N doses” to pick most-recent compound.

Despite those, the core issue persists because the app can still render authenticated routes without a hydrated auth token, and some screens still query immediately.

## Files expected to change in this hotfix
- `src/components/ProtectedRoute.tsx`
- `src/components/TodayScreen.tsx`
- `src/components/MyStackScreen.tsx`
- `src/hooks/useAppStateSync.tsx`
- `src/utils/notificationScheduler.ts`
- `src/App.tsx`
- (optional) `src/utils/safeAuth.ts` (if we place the shared hydration helper there)

