
<context>
User reports iOS-only “stuck loading” that sometimes requires hard-killing the app (TestFlight v1.0.5 build 30). They also notice short “Loading your …” spinners that feel non-premium. We previously mitigated native black-screen (splash) issues via boot timeout + client recreation, but the hang is still occurring intermittently.
</context>

<what-i-found>
1) There is at least one high-risk login path that can hang indefinitely:
- `src/pages/Auth.tsx` sets `checkingAuth=true` after `SIGNED_IN`, then calls `checkOnboardingStatus(userId)`.
- `checkOnboardingStatus` performs network calls like:
  - `supabase.from("profiles").select(...).single()`
  - `supabase.from("profiles").update(...)`
  - `supabase.auth.getUser()`
  - `supabase.functions.invoke(...)`
- These calls are NOT wrapped in `withQueryTimeout` / `withTimeout`, and there is no watchdog fallback. If any of them hang (common on iOS resume/network quirks), the UI can sit forever on the loading screen until the user force-closes.
This matches the exact symptom pattern: “sometimes on login it just gets stuck and the only way out is hard close.”

2) The “half-second loading” that feels new is very likely the `checkingAuth` full-screen loader:
- `Auth.tsx` renders a blocking loader: “Loading your account…”.
- Even if it only lasts 300–800ms, it is highly noticeable because it is a dedicated blocking screen.

3) There are other places that still use auth-client database calls (not the abortable `dataClient`) on screens that can appear early:
- Example: `SubscriptionContext` fetches the profile via `supabase.from('profiles')...` (it does have a watchdog for `isLoading`, but it doesn’t abort the underlying request).
- Example: `MyStackScreen` loads compounds via `supabase.from('compounds')...` (wrapped with `withQueryTimeout`, which prevents UI waiting forever, but does not abort the underlying fetch).
These are less likely to be the “stuck forever” culprit than `Auth.tsx`, because they already have timeouts or watchdogs, but they are still candidates for perceived slowness and occasional weirdness on iOS.

Conclusion: the highest-leverage fix is to make the post-login flow non-blocking and time-bounded, so it can never trap the app on a loader.
</what-i-will-change>

<goals>
- Eliminate any path where the app can stay on a “loading” screen indefinitely (no more hard-close required).
- Reduce perceived “jank” by preventing very short loading states from showing full-screen spinners.
- Improve diagnostics so if anything still hangs, you get a clear, copy-pastable clue (like we already do with Boot Trace + ProtectedRoute support code).
</goals>

<plan>
<step id="1" title="Harden the Auth post-login flow so it can’t hang">
  <why>
  This is the most likely root cause: `checkingAuth` can remain true forever if any profile/auth call hangs.
  </why>
  <changes>
  - In `src/pages/Auth.tsx`, refactor the `SIGNED_IN` path so navigation to `/today` is not blocked by network calls.
  - Add strict time limits around any remaining post-login tasks:
    - Wrap `profiles` reads/updates with `withQueryTimeout(...)`.
    - Wrap `supabase.auth.getUser()` with `withTimeout(...)` (or remove it entirely when session already contains email).
    - Ensure all branches (success/error/timeout) always clear `checkingAuth` (or remove the full-screen `checkingAuth` screen entirely).
  </changes>
  <implementation-details>
  - Preferred UX approach:
    1) On `SIGNED_IN`, immediately `navigate("/today", { replace: true })`.
    2) Fire-and-forget “nice-to-have” tasks in the background with timeouts:
       - welcome email send (if needed)
       - profile enrichment / flags
    This prevents the login experience from ever being “blocked” by a slow or stuck request.
  - Replace `supabase.auth.getUser()` inside the welcome-email logic with `currentSession.user.email` when available (no reason to make another auth call during a sensitive phase).
  - Add a small internal watchdog (e.g. 4–6 seconds) so even if something unexpected happens, the UI never stays on a loader indefinitely.
  </implementation-details>
</step>

<step id="2" title="Make short loaders feel premium (don’t show a blocking spinner for sub-500ms work)">
  <why>
  The “half-second loading” may be real or perceived, but a full-screen spinner for a tiny pause makes it feel worse.
  </why>
  <changes>
  - In `Auth.tsx`, implement a “delayed loader” pattern:
    - Only show the full-screen loading UI if the operation exceeds a small threshold (e.g. 350–500ms).
    - Otherwise, navigate immediately and let the normal screen loading skeletons handle it.
  </changes>
</step>

<step id="3" title="Reduce remaining iOS risk by aligning more reads with dataClient (optional but recommended)">
  <why>
  You already have a proven iOS resilience strategy: use `dataClient` (abortable + token-injected) for data reads/writes, and reserve the auth client for auth operations and edge-function calls.
  </why>
  <changes>
  - Convert post-login profile checks in `Auth.tsx` to use `dataClient` where feasible (especially SELECT reads), falling back gracefully if token not yet available.
  - Consider migrating “boot-critical” reads in `SubscriptionContext` (native path) to use `dataClient` for profile reads so they benefit from abortable fetch and avoid any lingering auth-client weirdness.
  </changes>
  <note>
  This step is optional for the first pass; Step 1 is the priority to stop the hard-close scenario. If you prefer, we can do Step 1+2 now and revisit Step 3 if any issues remain.
  </note>
</step>

<step id="4" title="Add a small, targeted diagnostics trail for login hangs (so you don’t need guesswork)">
  <why>
  BootTracer is excellent for cold start; we need similar “breadcrumbs” for the login transition.
  </why>
  <changes>
  - Add lightweight “Auth Trace” events stored in localStorage (similar spirit to BootTracer but smaller scope), such as:
    - AUTH_SIGNED_IN_RECEIVED
    - AUTH_PROFILE_CHECK_START / DONE / TIMEOUT
    - AUTH_NAVIGATED_TODAY
    - AUTH_WELCOME_EMAIL_ATTEMPT / SUCCESS / FAIL / TIMEOUT
  - Surface the last auth-trace summary in Settings → Help (near Boot Diagnostics), so when a tester reports “it got stuck,” you can read exactly what step it died on.
  </changes>
</step>

<step id="5" title="Verification checklist (iPhone-first)">
  <tests>
  - iPhone (TestFlight):
    1) Sign out → Sign in (email/password) 5 times in a row, including:
       - strong Wi‑Fi
       - weaker connection (or airplane mode toggle quickly off/on)
       - after backgrounding the app for 30–60 seconds
    2) Confirm there is no “infinite loading” screen; worst case should be a recovery UI or an automatic redirect.
    3) Confirm the annoying short “Loading your account…” spinner is either gone or only appears if it’s genuinely slow.
  - Android sanity:
    - Repeat sign-in once to ensure no regressions.
  - Regression:
    - Make sure onboarding routing still behaves correctly for genuinely logged-out users.
  </tests>
</step>
</plan>

<files-in-scope>
- Primary:
  - `src/pages/Auth.tsx`
- Potential follow-ups (if we include Step 3/4):
  - `src/contexts/SubscriptionContext.tsx`
  - `src/components/settings/HelpSettings.tsx` (to display auth-trace)
  - `src/utils/*` (new small auth trace helper, if desired)
</files-in-scope>

<risk-and-mitigation>
- Risk: Navigating to `/today` immediately after sign-in could hide a profile-fetch error that previously routed to onboarding.
  - Mitigation: default to `/today` on uncertainty (safer UX, aligns with your current “token mirror aware” philosophy), and handle profile issues later without blocking entry.
- Risk: Background “welcome email” logic might run more than intended.
  - Mitigation: keep the existing atomic `welcome_email_sent` guard, but time-bound it and do not let it affect navigation.
</risk-and-mitigation>

<notes-on-second-opinion>
A second opinion can be useful, but there is a very concrete, high-probability hang in `Auth.tsx` that we can fix immediately. If the issue persists after hardening that flow, then it’s worth bringing in another dev with the new diagnostics in hand (it will be much faster to root-cause with traces than by intuition).
</notes-on-second-opinion>
