
## What’s most likely happening (why it works 1–3 times, then “empty data”)

This behavior matches a **Supabase Auth global-lock deadlock** pattern on iOS:

- The app renders (because **Splash + ProtectedRoute fast-path** trusts cached localStorage and navigates immediately).
- But **data requests rely on the SDK fetching an access token via `auth.getSession()` for every request**.
- If **any code calls `supabase.auth.getUser()` and it hangs** (common during permission dialogs / resume), it can hold the auth lock and block `getSession()`.
- Result: the UI renders, but database queries either:
  - don’t run correctly (stalled waiting for token), or
  - run “anonymous” and return empty arrays due to RLS, so you see **structure but no data**.

### The smoking guns in your codebase
1) `useStreaks()` (always used by TodayScreen) calls `supabase.auth.getUser()` with **no timeout**:
- `src/hooks/useStreaks.tsx`

2) The auto notification prompt flow calls `supabase.auth.getUser()` right after the permission dialog:
- `src/hooks/useNotificationPermissionPrompt.ts` (line ~91)

Those two paths happen exactly in the scenario you described (“it asked me to enable notifications… then after a few hard closes things got weird”).

## Why the “loadDoses try/finally” change didn’t fix it
That change prevented an infinite skeleton state in one specific early-return case, but it does not prevent:
- `supabase.auth.getUser()` hangs, or
- `supabase.auth.getSession()` being blocked behind the auth lock (which affects *all* data queries throughout the app).

## Answer to your theories (Android Play Store / Amos / Google Off / RevenueCat)
- Anything you configured in **Google Play / Android** cannot affect **your iPhone** behavior.
- RevenueCat could affect *subscription state*, but it wouldn’t explain “my doses/compounds data is empty across screens” unless it triggered auth deadlocks indirectly. The more direct evidence here is the auth lock + `getUser()` calls during permission dialogs.

---

## Proposed Fix Strategy (the next step)
We’ll do two things in one build:

### A) Remove / harden “hanging auth calls” in boot-critical paths
Replace **all “automatic” `supabase.auth.getUser()` calls** that can run during:
- app start
- resume
- permission prompts
- Today screen mount

…with your existing safe helpers:
- `getUserIdWithFallback(...)` (fast-path cached user id)
- and/or a timeout-protected approach where necessary

**Targets (minimum set to fix your repro):**
1. `src/hooks/useStreaks.tsx`
   - Replace `supabase.auth.getUser()` with `getUserIdWithFallback(3000)`
   - Ensure the query returns default stats if userId missing (instead of throwing)
2. `src/hooks/useNotificationPermissionPrompt.ts`
   - Replace `supabase.auth.getUser()` with `getUserIdWithFallback(3000)`
   - Add timeouts via `withQueryTimeout(...)` for the doses fetch
   - If userId missing, gracefully skip scheduling and let the normal app sync handle it later
3. `src/components/TodayScreen.tsx`
   - Remove `supabase.auth.getUser()` usage inside `checkPreviewMode` (it currently does this)
   - Use `getUserIdWithFallback(3000)` instead

This alone may stop the auth lock from getting wedged.

### B) Make data loading “auth-lock resistant” by avoiding `auth.getSession()` per request
This is the stronger, more reliable fix:

Create a **second backend client used ONLY for database/functions calls** configured with the `accessToken` option so it does **not** call `auth.getSession()` internally for every request.

Why: the default Supabase client does this on every fetch (confirmed in `node_modules/@supabase/supabase-js/src/SupabaseClient.ts`), which is exactly what becomes unreliable when the auth lock wedges.

**Implementation approach**
1. Add a new file, e.g. `src/integrations/supabase/dataClient.ts` that:
   - creates a client via `createClient(VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, { accessToken: async () => token })`
   - reads the access token from the existing cached localStorage key (`sb-...-auth-token`)
   - optionally falls back to the native token mirror (your `authTokenMirror`) if localStorage is missing on native
   - IMPORTANT: this client won’t expose `auth.*` (that’s fine; we keep using the existing client for sign-in/out)

2. Update the most important data paths to use `dataClient`:
   - TodayScreen: doses query, compounds query, profiles query
   - MyStackScreen: compounds query + stats query
   - ProgressScreen queries
   - AppStateSync queries (optional but recommended because it runs on resume)

This makes “structure but no data” dramatically less likely, because data fetches no longer depend on the auth lock being healthy.

---

## Versioning / Build number
- Bump `appBuild` from **20 → 21** so we can clearly separate the results in TestFlight / device installs.

---

## Test Plan (very specific to your repro)
Do this on iPhone first (since it reproduces there), then Android:

1) Fresh install (or delete/reinstall)
2) Sign in
3) Hard close + reopen 10 times
4) Confirm:
   - Today loads doses every time
   - My Stack loads compounds every time
   - No “empty structure” screens
5) Trigger the notification permission prompt scenario:
   - Ensure notification permission is “Not Determined”
   - Open Today, allow notifications
   - Hard close + reopen 10 times again

If this fixes it locally, then ship to TestFlight / Play beta.

---

## What success looks like (acceptance criteria)
- No “empty structure” state after hard closes
- Data appears on first paint or within the normal query timeout window
- Permission prompt does not destabilize subsequent sessions

