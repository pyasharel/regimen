
Goal: eliminate the “blank data / skeleton forever” state on iOS + Android after background/foreground, then fix the theme persistence and the Medication Levels card spacing, and finally address Android icon/splash assets.

What’s most likely happening (based on your screenshots + code paths)
- The UI you’re seeing is the TodayScreen loading skeleton. That only shows if:
  - TodayScreen `loading === true`, or
  - SubscriptionContext `isLoading === true` (TodayScreen gates on `loading || subscriptionLoading`)
- On mobile, some network calls can “hang” (not reject, not resolve) after quick background/foreground transitions, OS permission dialogs, or transient connectivity events (“Connection interrupted”).
- If a promise hangs, our `finally { setLoading(false) }` never runs, so you’re stuck in skeleton mode even though the app shell renders.

We’ll fix this by:
1) making every critical “load data” path timeout-safe so loading can’t stay true forever
2) reducing the amount of simultaneous “on resume” network work (subscription refresh + notification sync + screen loads)
3) improving theme bootstrapping so the app doesn’t fall back to dark after a cold start
4) tightening the Medication Levels card spacing in dark mode
5) (separately) correcting Android app icon + splash resources

--------------------------------------------------------------------
Phase 1 (Critical): Never-get-stuck loading + stabilize resume
--------------------------------------------------------------------

A) Add a small timeout helper used across the app
- Create: `src/utils/withTimeout.ts`
  - `withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T>`
  - Uses `Promise.race` to reject after `ms` with a labeled timeout error.
  - This does not abort the underlying fetch, but prevents UI deadlocks and lets the user retry.

B) Add a “safe user id” helper to avoid slow/hanging auth calls
- Create: `src/utils/safeAuth.ts`
  - `getCachedUserId(): string | null` (reads from existing `getCachedSession()` synchronously)
  - `getUserIdWithFallback(timeoutMs=3000): Promise<string | null>`
    - first try cached session user id
    - else do `supabase.auth.getUser()` wrapped in `withTimeout`
  - This reduces reliance on potentially-hanging network auth calls during resume.

C) Update major screens to be timeout-safe and retryable
1) `src/components/TodayScreen.tsx`
- Wrap all supabase calls in `loadDoses()`, `checkCompounds()`, `loadUserName()`, and `loadLevelsData()` with `withTimeout`.
- Guarantee `setLoading(false)` happens even on timeout (because we’ll catch + handle the timeout).
- Add a lightweight “retry” path:
  - if a timeout occurs, show a toast: “Couldn’t load data. Tap to retry.” with an action that reruns the load(s).
- Optional (but recommended): stop blocking the entire Today screen on `subscriptionLoading`.
  - Change gating from `if (loading || subscriptionLoading)` to `if (loading)` only,
  - and show a small inline “Checking subscription…” indicator instead of hiding all content.
  - This prevents subscription refresh issues from blanking Today content.

2) `src/components/MyStackScreen.tsx`
- Wrap `loadCompounds()` and `loadWeeklyStats()` supabase calls with `withTimeout`.
- Ensure `setLoading(false)` always happens.
- Show a toast with a “Retry” action if a timeout occurs.

3) `src/components/ProgressScreen.tsx`
- Apply the same pattern anywhere it loads progress data/photos/weight (wrap queries with timeouts; ensure loading resolves; add retry toast).

D) Reduce “resume storm” concurrency (too many tasks firing at once)
1) `src/hooks/useAppStateSync.tsx`
- Add “single-flight” protection:
  - `inFlightRef` so only one sync runs at a time.
- Delay heavy sync slightly on resume:
  - on `isActive === true`, wait ~600–1000ms before starting (lets the webview/network stabilize).
- Get user id via the cached session helper first (avoid slow/hanging getUser on resume).
- Put timeouts around the largest steps:
  - profile read
  - doses fetch
  - cleanup/regeneration calls
  - scheduling calls
- If the sync times out, log and exit gracefully (do not block app UI).

2) `src/contexts/SubscriptionContext.tsx`
- Add a watchdog so `isLoading` cannot stay true indefinitely:
  - If init/refresh runs longer than (say) 5–8s, set `isLoading(false)` and allow the UI to render.
- Keep the “refreshSubscription” single-flight guard (already exists), but also ensure it always clears `refreshingRef.current` and `setIsLoading(false)` on all paths, including early returns.
- (If needed) refactor the auth-state-change handler to avoid doing lots of awaited work directly in the callback; move heavy work into a deferred task (e.g., `setTimeout(() => refreshSubscription(...), 0)`).

Acceptance criteria for Phase 1
- After a hard close + reopen on iOS and Android:
  - Today/My Stack/Progress load real data reliably.
  - If network is unstable, the app shows a recoverable error (toast + retry) rather than infinite skeleton.
- Notification taps and quick background/foreground transitions do not lead to blank screens.

--------------------------------------------------------------------
Phase 2: Theme persistence (fix “reverts to dark” on cold starts)
--------------------------------------------------------------------

Why it happens
- ThemeProvider does a fast synchronous read from localStorage for first paint.
- On native, localStorage can be flaky across cold boots, while Capacitor Preferences is the durable store.
- Because Preferences reads are async, we can start in defaultTheme (“dark”) and never properly “bootstrap” to the stored theme early enough.

Fix approach: bootstrap theme before React renders
- Update `src/main.tsx`:
  - Before `createRoot(...).render(...)`, do an async bootstrap step on native:
    - read theme + variant from Preferences (`vite-ui-theme` and `vite-ui-theme-variant`)
    - write them into localStorage
    - set `document.documentElement` classes immediately (`dark`/`light` and `design-*`)
  - Then render React. This eliminates cold-start “fallback dark” and prevents the flash.

Acceptance criteria for Phase 2
- If you set light mode, hard close, reopen: it stays light.
- No noticeable theme flash on boot.

--------------------------------------------------------------------
Phase 3: Medication Levels card spacing in dark mode
--------------------------------------------------------------------
- Update `src/components/MedicationLevelsCard.tsx`
  - Increase the top margin slightly: change `mt-2` to `mt-3` (or `mt-4` if needed).
  - If the issue is specifically the separator line above it, consider adding a small `pt-1` on the section above or increasing spacing around the calendar section in TodayScreen. We’ll pick the minimal change that fixes the visual overlap.

Acceptance criteria
- In dark mode, the card no longer feels “too close” to the calendar separator.

--------------------------------------------------------------------
Phase 4 (Cosmetic but important): Android icon + splash resources
--------------------------------------------------------------------
Android icon showing default + splash briefly showing default indicates native resources are not fully updated.

Plan
- Ensure Android launcher icons exist in the correct folders and are named correctly:
  - `android/app/src/main/res/mipmap-*/ic_launcher.png`
  - Ensure any problematic `mipmap-anydpi-v26` is removed if it’s causing resource overrides.
- Ensure the splash drawable is present and referenced correctly for Android 12+ behavior.
- Verify `capacitor.config.ts` splash settings are consistent with the resources.

Acceptance criteria
- Android app shows your real icon on the launcher.
- Android boot shows branded splash cleanly without a “default” flash.

--------------------------------------------------------------------
Testing checklist + clean command lines (for after implementation)
--------------------------------------------------------------------

iOS (from project root)
```bash
git pull
npm install
npm run build
npx cap sync ios
cd ios/App && pod install && cd ../..
npx cap open ios
```
Then in Xcode:
- Delete the app from the device (important for cache), run again.

Android (from project root)
```bash
git pull
npm install
npm run build
npx cap sync android
npx cap open android
```
Then in Android Studio:
- Uninstall the app from device (important), run again.

High-signal tests (run in this order)
1) Cold start (hard close → reopen): Today loads data within a few seconds.
2) Background/foreground 5 times quickly: data remains, no infinite skeleton.
3) Notification tap when app is closed: navigates in and data loads.
4) Toggle theme to Light, hard close, reopen: stays Light.
5) Dark mode: confirm Levels card spacing looks right.

Files we expect to change
- New: `src/utils/withTimeout.ts`
- New: `src/utils/safeAuth.ts`
- Edit: `src/components/TodayScreen.tsx`
- Edit: `src/components/MyStackScreen.tsx`
- Edit: `src/components/ProgressScreen.tsx`
- Edit: `src/hooks/useAppStateSync.tsx`
- Edit: `src/contexts/SubscriptionContext.tsx`
- Edit: `src/main.tsx`
- Edit: `src/components/MedicationLevelsCard.tsx`
- Android native resource files under `android/app/src/main/res/**` (icons/splash)

Risk notes
- Timeouts prevent UI deadlocks but don’t abort the underlying request; we’ll also reduce concurrent resume work so we don’t accumulate hung requests.
- If we discover a specific failing request (401/invalid session), we’ll extend the retry toast to include “Sign out & sign back in” recovery, but only if needed.

If you want me to continue after this plan approval, the next request should be: “Implement the Phase 1 loading timeout + resume stabilization changes.”
