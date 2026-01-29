
Goals
- Make notification permissions feel “normal” and user-friendly:
  - No scary red “blocked” banner unless the user truly blocked notifications in iOS Settings.
  - If iOS has never been asked (status = “prompt”), give a clear “Enable” CTA that triggers the iOS permission prompt.
  - If the user previously enabled reminders but deleted/reinstalled the app (iOS resets permissions), prompt again in a clean way.
- Ensure dose reminders actually schedule/deliver when the user expects them to.
- Reduce the “Restoring your session…” → redirected to sign-in flakiness during rapid hard-close/reopen loops.

What your logs show (key facts)
- iOS permission status is returning “prompt”:
  - [NotificationsSettings] OS permission status: prompt
  - [AppStateSync] checkPermissions → prompt → “skipping scheduling”
- “prompt” does not mean “blocked.” It means iOS has not shown the permission dialog yet for this install, so the app must call requestPermissions at an intentional moment (usually via a user action) to show the iOS prompt.
- Right now Settings never requests permission when you toggle Dose Reminders on. It only saves the preference. So you can end up with “Dose Reminders ON” in the UI but no OS permission → no notifications.

Plan A (recommended): Permission states + clean CTA + prompt on demand
1) Replace the boolean permission state in NotificationsSettings with a tri-state
   - File: src/components/settings/NotificationsSettings.tsx
   - Change from:
     - osPermissionGranted: boolean | null
   - To something like:
     - osPermissionStatus: 'granted' | 'prompt' | 'denied' | 'unknown'
   - Map LocalNotifications.checkPermissions().display:
     - 'granted' → granted
     - 'prompt' → prompt
     - 'denied' → denied
     - any error → unknown

2) Update the Notifications settings UI so it matches real iOS behavior (and feels less alarming)
   - File: src/components/settings/NotificationsSettings.tsx
   - UX rules:
     - If status = granted:
       - Show no warning banner.
     - If status = prompt:
       - Do NOT show “Notifications blocked.”
       - Show a neutral “Enable notifications” card (not red) with a button:
         - Button label: “Enable Notifications”
         - On press: call LocalNotifications.requestPermissions()
         - If granted: immediately schedule (dose + cycle, and allow test notification)
         - If denied: show a gentle “Not enabled” message with instructions.
     - If status = denied:
       - Show a small, non-alarming inline hint (not a red error banner):
         - “Notifications are off in iOS Settings for Regimen.”
         - Provide an “Open iOS Settings” button if feasible (see step 3).
       - Important: iOS will not show the system prompt again once denied; only the user can re-enable in Settings.

3) Add an “Open iOS Settings” button (optional but improves UX)
   - File: src/components/settings/NotificationsSettings.tsx
   - Implement using Capacitor App API:
     - import { App } from '@capacitor/app'
     - App.openUrl({ url: 'app-settings:' })
   - Fallback if Apple blocks this deep link:
     - Keep the on-screen instructions: Settings → Regimen → Notifications

4) Make “Dose Reminders” toggle behave correctly when OS permission is not granted
   - File: src/components/settings/NotificationsSettings.tsx
   - Behavior:
     - When user toggles Dose Reminders ON:
       - If osPermissionStatus === 'prompt':
         - Trigger the permission prompt (requestPermissions)
         - If user denies: revert the toggle back OFF (or keep it ON but show “Needs iOS permission” subtext; I recommend revert OFF to avoid lying).
       - If osPermissionStatus === 'denied':
         - Don’t pretend it’s enabled; show a toast telling them to enable in iOS Settings and keep toggle OFF (or show disabled state).
     - When user toggles OFF:
       - Persist preference and cancel scheduled dose notifications.

5) Fix the “Send Test Notification” button so it can actually prompt when needed
   - File: src/components/settings/NotificationsSettings.tsx
   - Behavior:
     - If permission = prompt → requestPermissions → then schedule test notification.
     - If permission = denied → show “Open Settings” CTA.

Scheduling correctness: respect the user’s “Dose Reminders” preference
6) Ensure the background sync does not schedule dose notifications when the user turned dose reminders off
   - File: src/hooks/useAppStateSync.tsx
   - Before calling scheduleAllUpcomingDoses:
     - Read persistentStorage.getBoolean('doseReminders', true)
     - If false:
       - Cancel dose notifications and skip scheduling dose notifications.
   - Do the same for cycle reminders if you want full consistency:
     - If cycleReminders is false, skip rescheduleAllCycleReminders

7) Ensure DoseEditModal rescheduling respects the preference and OS permission state
   - File: src/components/DoseEditModal.tsx
   - Right now it always attempts to schedule after edits.
   - Update it to:
     - Check doseReminders preference first; if off, skip scheduling.
     - If on, proceed (scheduleAllUpcomingDoses already checks permission; but this prevents unnecessary work and aligns UX).

Notification actions reliability (prevents subtle issues with premium actions)
8) Register notification action types at app start without requesting permission
   - File: src/utils/notificationScheduler.ts
   - Problem: registerActionTypes is currently only called inside requestNotificationPermissions(). If permissions are granted elsewhere, action buttons might not be registered.
   - Solution:
     - Add an exported ensureDoseActionTypesRegistered() that calls LocalNotifications.registerActionTypes
     - Call it from setupNotificationActionHandlers() (safe, no permission prompt)
   - This does not fix “no notifications” on its own, but prevents action-button weirdness later.

Session restoration flakiness during rapid reopen
9) Add a “transient auth retry” in ProtectedRoute before redirecting to /auth
   - File: src/components/ProtectedRoute.tsx
   - The failure mode you described (“rapid hard-close/open” → sometimes redirected to sign-in, then next relaunch works) is consistent with a transient moment where localStorage/session isn’t available quickly enough.
   - Approach:
     - If hydrateSessionOrNull() returns null on the first attempt:
       - Wait ~400–800ms and try hydrateSessionOrNull() one more time before declaring unauthenticated.
     - Only redirect to /auth after:
       - 2 attempts fail, or
       - a max elapsed time cap (so we never hang forever).
   - This keeps your “no fake sessions” safety, while preventing spurious sign-in redirects.

Testing plan (what you should validate on device)
A) Clean reinstall scenario (your current case)
1. Install fresh build.
2. Sign in to an existing account.
3. Go to Settings → Notifications:
   - If permission is prompt: you should see “Enable Notifications” CTA (not red).
4. Tap “Enable Notifications” and accept the iOS prompt.
5. Edit a dose to 1 minute in the future.
6. Background the app (or lock the phone) and wait.
   - You should receive the notification.

B) Denied scenario
1. Deny the iOS prompt once.
2. Confirm Settings shows a gentle “Enable in iOS Settings” hint and provides “Open Settings”.
3. Confirm toggling “Dose Reminders” ON doesn’t claim success; it should guide to Settings.

C) Rapid reopen auth
1. While signed in, do quick hard-close/open repeatedly.
2. Confirm you do not get bounced to /auth; at worst you briefly see “Restoring your session…” and then proceed.

Files expected to change
- src/components/settings/NotificationsSettings.tsx
- src/hooks/useAppStateSync.tsx
- src/components/DoseEditModal.tsx
- src/utils/notificationScheduler.ts
- src/components/ProtectedRoute.tsx
