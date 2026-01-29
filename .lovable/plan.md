
# Fix: Duplicate Notification Firing

## Problem Identified
When you edit a dose and return to the app quickly, multiple notification sync operations overlap, causing the same dose to fire 2-3 times. This happens because:

1. `DoseEditModal` calls `rescheduleNotificationsAfterEdit()` immediately after save
2. App resume triggers `syncNotifications()` after 1.5 seconds
3. Cold-start sync (3-second timer) may still be running
4. The 2-minute "lenient window" allows recently-scheduled doses to be re-scheduled

## Solution

### Change 1: Add sync lock that spans resume/edit operations
**File: `src/utils/notificationScheduler.ts`**

Add a module-level lock with a longer debounce window to prevent overlapping `scheduleAllUpcomingDoses` calls:

```typescript
// Track last scheduling time to prevent duplicate fires
let lastScheduleTime = 0;
const SCHEDULE_DEBOUNCE_MS = 5000; // 5 seconds between full reschedules

export const scheduleAllUpcomingDoses = async (doses: any[], isPremium: boolean = false) => {
  // Debounce rapid scheduling calls
  const now = Date.now();
  if (now - lastScheduleTime < SCHEDULE_DEBOUNCE_MS) {
    console.log('⏭️ Skipping duplicate schedule call (debounced)');
    return;
  }
  lastScheduleTime = now;
  
  // ... rest of function
};
```

### Change 2: Remove the 2-minute "lenient window" for past doses
**File: `src/utils/notificationScheduler.ts`**

The current filter includes doses from 2 minutes ago, which causes issues when the same dose is rescheduled multiple times. Change to only schedule strictly future doses:

```typescript
// BEFORE:
const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);
return doseDateTime > twoMinutesAgo && doseDateTime <= sevenDaysFromNow;

// AFTER:
return doseDateTime > now && doseDateTime <= sevenDaysFromNow;
```

### Change 3: Skip DoseEditModal reschedule if within resume window
**File: `src/components/DoseEditModal.tsx`**

Check if a sync is already scheduled to avoid redundant calls:

```typescript
const rescheduleNotificationsAfterEdit = async () => {
  // Note: useAppStateSync will also reschedule on next resume
  // This call ensures immediate update for UX
  // ... existing code
};
```

Actually, simpler: let `scheduleAllUpcomingDoses`'s debounce handle it.

## Expected Behavior After Fix
- Edit a dose → notification schedules immediately
- Return to app within 5 seconds → debounced, no duplicate scheduling
- Each dose fires exactly once at its scheduled time

## Files to Modify
1. `src/utils/notificationScheduler.ts` - Add debounce, remove lenient window

## Release Recommendation

**Push the current loading fix to TestFlight/App Store now.** The auth deadlock fixes (reduced expiry buffer, removed competing getSession calls, 10s watchdog) are critical for user experience.

The notification duplicate issue is annoying but not blocking - users still get their reminders. You can push a follow-up build with the notification fix after testing the loading fix in the wild.

**Testing plan for new version:**
1. Delete app, reinstall, sign in with existing account
2. Go to Settings → Notifications → Enable → Accept iOS prompt
3. Edit a dose time to 2 minutes in future
4. Stay in app → should get exactly 1 notification at the scheduled time
5. Hard close/reopen rapidly → should not show "Loading" spinner for more than ~2 seconds
