

# Fix Android Scheduled Notification Failures

## Problem

Dose reminder notifications work on iOS but silently fail on Android 12+ (API 31+). The "Send Test Notification" button works because it fires immediately, but scheduled notifications require the `SCHEDULE_EXACT_ALARM` permission, which must be explicitly granted by the user in Android system settings. The app never checks for or requests this permission.

## Root Cause

In `notificationScheduler.ts`, `LocalNotifications.schedule()` uses `{ at: notificationDate }` which triggers Android's exact alarm API. On Android 12+, this silently fails if `SCHEDULE_EXACT_ALARM` hasn't been granted. Unlike iOS, this isn't a dialog prompt — it requires navigating to system settings.

## Solution

### 1. Add an exact alarm permission check utility

Create `src/utils/androidAlarmPermission.ts` that:
- Detects if platform is Android
- Checks if exact alarms are available using the Capacitor `LocalNotifications` API or Android intent
- Provides a function to open the exact alarm settings page via `@capacitor/app` (using `App.openUrl` with `android.settings.REQUEST_SCHEDULE_EXACT_ALARM`)
- Returns permission status: `'granted' | 'denied' | 'not_applicable'`

### 2. Add permission check before scheduling

In `notificationScheduler.ts` > `scheduleAllUpcomingDoses()`:
- After the existing `checkPermissions()` call (line 238), add a check for exact alarm permission on Android
- If exact alarms are NOT permitted, log a warning and skip scheduling (same as when notification permission isn't granted)
- This prevents silent failures and makes the issue diagnosable from logs

### 3. Show a one-time prompt to Android users

Create a lightweight hook `useAndroidAlarmPermission.ts` that:
- On Android only, checks if exact alarms are permitted
- If not, and the user has active compounds with dose reminders enabled, shows a dialog explaining they need to enable "Alarms and Reminders" in settings
- Includes a button that deep-links directly to the permission page
- Throttled to show once per 48 hours (stored in localStorage)
- Only shown after initial onboarding is complete

### 4. Add the prompt to TodayScreen

Wire the hook into `TodayScreen.tsx` so Android users see the prompt when they open the app and exact alarms aren't permitted. This is non-blocking — just an informational dialog with a "Go to Settings" button and a "Not Now" dismiss.

### 5. Add diagnostic info to Settings

In `NotificationsSettings.tsx`, add a line for Android users showing whether "Alarms & Reminders" permission is granted, with a link to fix it if not.

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/utils/androidAlarmPermission.ts` | **Create** - Exact alarm permission check + settings opener |
| `src/hooks/useAndroidAlarmPermission.ts` | **Create** - Hook to check and prompt for exact alarm permission |
| `src/utils/notificationScheduler.ts` | **Modify** - Add exact alarm check in `scheduleAllUpcomingDoses()` |
| `src/components/TodayScreen.tsx` | **Modify** - Wire up the Android alarm permission prompt |
| `src/components/settings/NotificationsSettings.tsx` | **Modify** - Show exact alarm status for Android users |

## Technical Notes

- The `SCHEDULE_EXACT_ALARM` permission is already declared in `AndroidManifest.xml` (line 61) — this is correct
- The manifest declaration alone isn't enough on Android 12+; the user must also toggle it ON in system settings
- The Capacitor `LocalNotifications` plugin doesn't expose an `canScheduleExactAlarms()` API directly, so we'll use the Android settings intent approach via `App.openUrl('package:com.regimen.app', { androidSettings: 'REQUEST_SCHEDULE_EXACT_ALARM' })` or the Browser plugin
- This fix is purely in the web layer (TypeScript) — no native code changes needed, no Cursor required
- iOS is unaffected by this change (the check is Android-only)

## Impact

- **All Android 12+ users** will now be guided to enable exact alarms
- Scheduled dose notifications will start working reliably on Android
- The Settings screen will show clear diagnostic info for debugging
- No breaking changes to existing iOS behavior

