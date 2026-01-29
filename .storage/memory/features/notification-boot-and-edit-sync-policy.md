# Memory: features/notification-boot-and-edit-sync-policy
Updated: now

To prevent native bridge contention during app boot, `LocalNotifications.requestPermissions()` is never called automatically during notification scheduling or sync; permission status is checked via `checkPermissions()` instead. The initial notification sync is delayed by 3 seconds post-mount in `useAppStateSync.tsx` to allow auth hydration to complete.

## Key Updates (v1.0.4)

### Tri-State Permission Handling
`NotificationsSettings.tsx` now tracks permission as `'granted' | 'prompt' | 'denied' | 'unknown'`:
- **prompt**: Shows "Enable Notifications" CTA (not a red warning)
- **denied**: Shows gentle hint with "Open Settings" button
- **granted**: Shows test notification button, toggles work normally

### Preference-Gated Scheduling
Before scheduling notifications, both `useAppStateSync.tsx` and `DoseEditModal.tsx` check:
- `persistentStorage.getBoolean('doseReminders', true)` - if false, skip dose notification scheduling
- `persistentStorage.getBoolean('cycleReminders', true)` - if false, skip cycle reminder scheduling

### Action Types Registration
`ensureDoseActionTypesRegistered()` is now a standalone export called from:
- `setupNotificationActionHandlers()` at app startup (no permission prompt)
- `requestPermissionAndSchedule()` in settings before requesting permissions

### Transient Auth Retry
`ProtectedRoute.tsx` now attempts hydration up to 2 times with a 600ms delay between attempts, preventing spurious redirects to `/auth` during rapid hard-close/reopen cycles.
