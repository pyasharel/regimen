
## What I found (verified in code)

### 1) New-user onboarding prompt still exists
- `src/components/onboarding/OnboardingFlow.tsx` still includes the `notifications` step.
- `src/components/onboarding/screens/NotificationsScreen.tsx` still calls `LocalNotifications.requestPermissions()` when the user taps **Enable Reminders**.
So: the onboarding behavior for brand new users has not been removed.

### 2) Why you don’t get prompted after deleting/reinstalling (existing user)
This is expected with the current logic and explains exactly what you’re seeing:

- After you reinstall, iOS resets notification permission back to **prompt** (because it’s a “new install” to iOS).
- But your backend profile has a persistent flag: `profiles.notification_permission_asked`.
- `src/components/AddCompoundScreen.tsx` treats `notification_permission_asked=true` as “we already asked this user”, and it won’t show the permission dialog again.
- Also: existing users who already completed onboarding will never see onboarding again (`OnboardingFlow` redirects them to `/today`), so they won’t get a second chance there either.
- Result: after reinstall, you can end up with OS permission = prompt, but the app does not proactively ask again unless you go to Settings → Notifications.

### 3) Why you can still see “two notifications”
Even after the 5s debounce + “future-only” filtering, there are still two realistic pathways to “double fire”:

**A) Rescheduling near the fire-time (iOS race)**
- We currently do “wipe all pending notifications” (`cancelAllNotifications`) and then reschedule them.
- If this happens close to a notification’s scheduled time (or during repeated app-resume cycles), iOS can deliver the old one and the newly scheduled one (rare, but very real in practice). This matches your “I tapped it / came into app / got another immediately” symptom.

**B) Two different dose rows that resolve to the same clock time**
- Example edge case: one dose stored as `"Morning"` and another stored as `"08:00"`; both resolve to 8:00 AM.
- They are not considered duplicates by the current DB cleanup function because the `scheduled_time` strings differ, but the scheduler maps both to the same time and will schedule both.
- This can happen during schedule edits, migrations, or earlier “stale dose” situations.

## Goal behavior (what should happen)
### Permission prompting (good UX, stable)
1) **New users**: still prompted in onboarding (keep as-is).
2) **Existing users after reinstall**: on first meaningful entry into the app (Today screen), if OS permission is `prompt`, show an in-app “Enable notifications” banner/dialog. One tap triggers the iOS system prompt.
3) **If they deny**: do not nag; show a “Notifications are Off” card with “Open Settings”.
4) **If they accept**: immediately schedule dose reminders and confirm success.

### Dose reminders (no duplicates)
- A dose reminder should fire **once** per dose.
- Tapping a notification to open the app should **never** cause another notification to fire “immediately” as a side effect.
- Reschedules should be **idempotent** (reconciling what’s scheduled vs. desired), not “wipe and rebuild” every time.

## Implementation plan (elegant + robust)

### Phase 1 — Fix “reinstall prompt” correctly (without breaking onboarding)
1) **Add a Today-screen permission banner/dialog (for existing users too)**
   - In `TodayScreen.tsx` (and optionally also `MyStackScreen`), on mount:
     - Check OS permission via `LocalNotifications.checkPermissions()`
     - Check whether user has dose reminders “desired” (from `persistentStorage.getBoolean('doseReminders', true)`)
     - If permission is `prompt` and the user has at least 1 upcoming dose/active compound:
       - show a lightweight in-app prompt (banner or `NotificationPermissionDialog` reused)
       - throttle it so it doesn’t show repeatedly (store `notificationPermissionPromptLastShownAt` in `persistentStorage`)
   - When user taps “Enable”:
     - call `LocalNotifications.requestPermissions()`
     - if granted: schedule dose notifications immediately (same way `NotificationsSettings` does)
     - if denied: set state to denied + show “Open Settings”

2) **Update the backend “asked” flag semantics**
   - Keep `profiles.notification_permission_asked` but do not let it block prompting when OS permission is `prompt`.
   - New rule: OS permission is the source of truth for whether prompting is needed.
   - Backend flag becomes “user has been shown our explanation UX at least once,” not “don’t ever ask again.”

3) **Make Settings UI less confusing**
   - In `NotificationsSettings.tsx`, if OS permission is `prompt`, don’t let the screen look like “Dose Reminders are enabled” while the OS is blocking delivery.
   - Either:
     - show the toggle as off until permission is granted, or
     - keep toggle as “desired” but add a clear “Needs permission” status and make the top CTA unavoidable.
   - This is strictly UX clarity; it prevents “it says enabled but I’m not getting notifications” confusion.

### Phase 2 — Eliminate doubles by making scheduling idempotent
Refactor `scheduleAllUpcomingDoses` in `src/utils/notificationScheduler.ts`:

1) **Tag dose notifications**
   - When scheduling a dose, include `extra.type = 'dose'` (and keep `extra.doseId`).
   - This lets us distinguish “dose reminders” from cycle reminders, engagement, test notifications, etc.

2) **Replace “cancel-all then schedule-all” with “reconcile”**
   - Read currently pending notifications: `LocalNotifications.getPending()`
   - Build a desired map: `doseNotificationId -> desiredDateTime`
   - For each existing pending DOSE notification:
     - If it’s not in desired set anymore (dose taken/deleted/off-cycle): cancel it.
     - If it exists but scheduled time differs meaningfully: cancel + re-add.
     - If it matches: leave it alone.
   - For each desired ID that doesn’t exist pending: schedule it.

3) **Add a near-fire safety guard**
   - If a dose is within ~90 seconds of firing, avoid rescheduling it (to eliminate iOS race conditions where cancel+reschedule around delivery can double-fire).
   - With reconcile logic, this becomes easy: if it’s already pending and close to firing, keep it.

4) **Scheduler-level “same-compound same-time” dedupe**
   - Before building the desired map, dedupe doses by:
     - `compound_id + scheduled_date + resolvedHour:resolvedMinute`
   - Keep only one dose record for that time slot (prefer earliest `created_at` if available, else stable by ID).
   - Log when this happens so we can detect if the DB is generating these anomalies.

### Phase 3 — Testing matrix (must pass before App Store)
1) **Fresh install, brand new user**
   - Go through onboarding → tap Enable Reminders → iOS prompt appears → accept
   - Confirm: scheduled dose fires once.

2) **Existing user reinstall**
   - Delete app → reinstall → sign in
   - Confirm: Today screen shows prompt/banner (without hunting in Settings)
   - Accept → schedule immediately → confirm single fire

3) **Duplicate stress test**
   - Set a dose to 2 minutes from now
   - Background/foreground a few times
   - Tap the notification to open the app
   - Confirm: still only one alert total

4) **Denied path**
   - Deny permission on the iOS prompt
   - Confirm: app doesn’t spam prompts; Settings shows “Open Settings” path.

## Release recommendation
- Do not ship to the App Store until Phase 2 (reconcile scheduling + near-fire guard) is in; it’s the cleanest way to stop the “second notification immediately on open” symptom.
- Phase 1 can be shipped together (recommended) because it fixes your reinstall/testing flow and prevents real customers from silently missing reminders if iOS permission resets.

## If you want to ask another AI platform
You can share this concise root-cause summary:
- “Reinstall resets iOS notification permission to prompt, but app blocks re-prompting because it persists `profiles.notification_permission_asked` and existing users skip onboarding. Also, duplicate fires can happen because scheduler currently ‘cancels all and reschedules all’, which can race iOS near the delivery time; fix is to reconcile pending vs desired schedule per-notification-id and avoid rescheduling near fire-time.”

