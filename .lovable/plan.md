
## Goal (what we’re solving)
Stop the “black screen / app won’t relaunch after closing” issue by ensuring:
1) the native splash screen can’t get “stuck” indefinitely,  
2) corrupted on-device data can’t brick startup,  
3) notification actions can’t run risky backend/UI work at unsafe times, and  
4) the Medication Levels chart can’t crash rendering via invalid dates/NaNs.

This is an emergency stability hotfix designed to cover *both* cases you’re seeing:
- “Close app → reopen later → black screen”
- “Tap notification action → app grays out / later black screen”

---

## Why this is likely happening (plain-language)
On iOS/Android native builds, the “black screen” users describe is almost always the **native splash screen staying up** (your splash is configured as a black screen with no spinner). In your app, the splash is only hidden once React mounts and runs `SplashScreen.hide()`.

So anything that prevents React from mounting cleanly (or causes startup to hang early) results in:
- **native splash never hides**
- user perceives “black screen forever”
- reinstall “fixes it once” because it wipes the on-device data that was triggering the failure

Two common triggers match your reports and your code:
1) **A “poison pill” in local storage** (corrupt JSON or malformed auth cache) that breaks startup each time after it’s written once.
2) **Notification action handler doing backend work** (auth/db/toasts) when the app is not fully ready, which can freeze/crash and leave the app stuck on the next launch.

---

## What we’ll implement (high-level)
### A) “Startup Preflight” (runs before the app bootstraps)
A tiny preflight module that runs *before* the rest of the app imports initialize, and:
- validates critical localStorage keys (including auth token caches)
- clears any corrupted values safely
- writes a small “preflight report” so we can diagnose patterns later

This directly addresses “works once after reinstall, then breaks again”.

### B) Replace “blank” Splash route with a visible startup screen + watchdog
Your `/` route currently renders nothing (`return null`). If session check hangs or takes long, users see a blank/black screen.

We’ll change it to:
- show a simple loading UI (logo + “Starting…”)
- after ~5 seconds, show:
  - **Try again**
  - **Reset app data** (clears local storage, reloads)
  - (optional) “Continue to sign-in” if needed

This converts “black screen” into a recoverable UX *even when the backend session check is slow/hung*.

### C) Make native splash hide more reliable (retry + fallback)
Right now we call `SplashScreen.hide()` once on mount. If that call fails on some devices/timing, splash stays forever.

We’ll:
- retry hide multiple times (e.g., on rAF, then 400ms, then 1200ms)
- also attempt hide when the app becomes active (app resume)
- (optional, recommended) adjust `capacitor.config.ts` to provide an auto-hide safety net (so worst case is the splash disappears even if JS hiccups)

### D) Make notification action handling “safe”
In `notificationScheduler.ts`, the `localNotificationActionPerformed` handler currently does:
- `supabase.auth.getUser()`
- database reads/writes
- UI toasts

This is risky because notification actions can fire while the app is resuming or not fully initialized.

We’ll refactor so the action handler:
- does **no auth calls**
- does **no db calls**
- does **no UI calls**
- only schedules/cancels local notifications or writes a small “pending action” record to persistent storage

Then, when the app is foregrounded and stable, we process the pending actions safely from `useAppStateSync`.

### E) Harden Medication Levels so it can’t crash the screen
Even if it’s not the root cause, we will remove any possibility that the Medication Levels chart causes NaNs/invalid computations:
- parse timestamps robustly (handle “T” vs “ ” formats)
- filter invalid dates
- add guards in `halfLifeCalculator` to skip non-finite values so NaNs cannot propagate into Recharts

---

## Concrete file changes (what will be edited/added)
### 1) Add Startup Preflight module (new)
**New file:** `src/utils/startupPreflight.ts`
- `runStartupPreflight()`:
  - safely iterates known keys that must be JSON and validates them
  - scans for auth-token-like keys (e.g., keys containing `auth-token`) and validates JSON
  - if invalid: removes key
  - stores `regimen_last_boot_stage` and a small `regimen_preflight_report` (timestamp + what was cleared)

Key examples to validate:
- `dismissedBanners`
- `weeklyDigestSettings`
- `regimen_used_features`
- onboarding state key used by `useOnboardingState`
- `cachedEntitlement`
- any key containing `auth-token` (backend session storage)

### 2) Ensure Preflight runs before the app imports initialize
**Edit:** `src/main.tsx`
- Import and run preflight as the *first* import/first executed side effect (before `App` import).
- Also add ultra-safe global listeners:
  - `window.addEventListener('unhandledrejection', …)`
  - `window.addEventListener('error', …)`
  These will at minimum log and set a “boot stage” marker; optionally they can trigger a hard reload to recovery route.

### 3) Make Splash route render UI + watchdog + safe timeouts
**Edit:** `src/pages/Splash.tsx`
- Render a visible startup screen (no longer `return null`)
- Implement session check with a timeout:
  - `Promise.race([supabase.auth.getSession(), timeout(4000)])`
- If it times out or throws:
  - show recovery UI:
    - Try again (rerun check)
    - Reset app data (clear local storage + reload)
- Also show a tiny “support code” (timestamp + last boot stage) so you can ask users for it if it happens again.

### 4) Strengthen native splash hide reliability
**Edit:** `src/App.tsx`
- Replace single `SplashScreen.hide()` with a small retry strategy:
  - rAF → hide
  - setTimeout(400) → hide
  - setTimeout(1200) → hide
- On native resume (`appStateChange isActive`), attempt hide again.

**Optional but recommended for safety:**  
**Edit:** `capacitor.config.ts`
- Consider switching `launchAutoHide: true` (or a non-zero `launchShowDuration`) as a fallback.  
Tradeoff: onboarding “first paint” may be visible sooner, but the app is dramatically less likely to get stuck behind a black splash.

### 5) Refactor notification actions to be non-risky
**Edit:** `src/utils/notificationScheduler.ts`
- When scheduling dose notifications, store richer metadata in `notification.extra`:
  - `doseId`
  - `compoundName`
  - `doseAmount`
  - `doseUnit`
- Update `setupNotificationActionHandlers`:
  - make the handler synchronous/minimal
  - for `remind-15`/`remind-60`: schedule a new notification directly (no db read)
  - for `take-now`/`skip`: enqueue a “pendingDoseAction” to persistent storage (Preferences on native via `persistentStorage`)
  - remove toasts from handler (no UI calls in background context)
- Add a guard so handlers are registered only once.

### 6) Process pending notification actions safely when the app is active
**Edit:** `src/hooks/useAppStateSync.tsx`
- At the beginning of `syncNotifications()` (or right after user/session confirmation):
  - read pending queue
  - if user is signed in, apply dose updates to backend
  - clear queue after successful processing
- This makes “notification actions” reliable without risking startup stability.

### 7) Medication Levels hardening
**Edit:** `src/components/MedicationLevelsCard.tsx`
- Introduce `parseTakenAt()` helper:
  - accepts `string | null`
  - returns `Date | null`
  - supports both `YYYY-MM-DDTHH:mm:ss` and `YYYY-MM-DD HH:mm:ss` by normalizing to ISO
  - validates `Number.isFinite(date.getTime())`
- Filter doses with invalid parsed dates out of `takenDosesForCalc`
- Ensure chart calculations only run when all inputs are valid

**Edit:** `src/utils/halfLifeCalculator.ts`
- Add guard:
  - if `!Number.isFinite(hoursElapsed)` → skip that dose contribution
This prevents NaNs from ever entering chart data, even if something slips through.

### 8) (Optional) Add a small “Recovery overlay” for async errors
If we want maximum resilience:
- add a lightweight component that listens to `unhandledrejection/error` and renders the same “Reset app” UI even when the error is async (ErrorBoundary won’t catch async errors).
This is optional but recommended because your reports include “grayed out” (often async deadlocks).

---

## Testing plan (what we’ll verify before you ship)
### On a device (Android + iPhone)
1) Fresh install → open → confirm app loads and splash hides
2) Close app normally → reopen 10 times in a row
3) Force-kill app → reopen 10 times in a row
4) Turn notifications on, ensure at least one scheduled dose reminder exists
5) When a reminder fires:
   - tap notification
   - choose “Remind in 15 min”
   - confirm app does not gray out and remains relaunchable
6) Confirm Medication Levels renders (if enabled) and scrolling/taps don’t crash
7) Artificial corruption test (dev-only):
   - set a known key to malformed JSON (e.g., `dismissedBanners = "{"`)
   - relaunch
   - confirm the app recovers (preflight clears it) and no black screen occurs

---

## Release strategy (addressing your Apple-review concern)
- There is no way to fix already-installed native iOS builds without shipping a new build (because the production app uses bundled web assets, not a remote URL).
- Best practical approach:
  1) Ship Android update immediately to Closed Testing (fast)
  2) Ship iOS update to TestFlight immediately (fast)
  3) Submit iOS App Store hotfix and request expedited review due to “app won’t launch” severity

In parallel, we can add a long-term strategy later: a “live update” mechanism so future emergency UI fixes don’t require review (this requires one more approved build to enable).

---

## What I need from you (only if you want extra accuracy, not required to.toggle)
Nothing required to proceed with implementation.  
If you can share any one of the following, it will improve confidence post-fix:
- Whether the black screen is the native splash (pure black) vs a React “Loading…” screen
- Any device logs/crash logs from Xcode Organizer or Play Console (if available)

---

## Expected outcome after this hotfix
- Users should no longer get permanently bricked into a black screen after closing/reopening.
- If something still goes wrong, they will see a visible recovery screen with “Try again” / “Reset app data” instead of being stuck.
- Notification actions won’t be able to put the app into a broken startup state.
