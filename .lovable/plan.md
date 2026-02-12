

# Fix: Cycle Reminder Notifications Never Cancelled (Stale Alerts)

## Problem

A beta tester on Android (v1.0.7, build 35) is receiving "Tesamorelin: Cycle Ending Soon" notifications saying the cycle ends in 2 days, even though the My Stack screen shows the compound is only on Day 27 of a 56-day ON phase.

## Root Cause

There is a critical bug in `cancelCycleReminders()` in `src/utils/cycleReminderScheduler.ts`. The function attempts to identify cycle notifications by checking:

```text
n.id.toString().startsWith(`cycle_${compoundId}_`)
```

However, notification IDs are **numeric hashes** produced by `generateNotificationId()`, which converts the string `"cycle_{id}_{type}"` into an integer via a hash function. The resulting ID is a number like `1847293650`, which will **never** start with `"cycle_"`. As a result:

- Old notifications are **never cancelled** when cycles are edited or rescheduled
- Stale notifications from previous cycle configurations continue to fire at incorrect times
- Every reschedule **adds more** notifications without removing the old ones

## Fix

### 1. Store scheduled notification IDs for reliable cancellation

Instead of trying to reverse-engineer which notifications belong to a compound, we will track the scheduled notification IDs explicitly using `persistentStorage` (Capacitor Preferences).

**File:** `src/utils/cycleReminderScheduler.ts`

- After successfully scheduling notifications, save the array of numeric IDs to persistent storage keyed by compound ID (e.g., `cycle_notif_ids_{compoundId}`)
- In `cancelCycleReminders()`, read the stored IDs and cancel those exact notifications, then clear the stored key
- This guarantees all previously scheduled notifications for that compound are removed before new ones are added

### 2. Notification wording clarity improvement

While investigating, the notification text "Cycle Ending Soon" is ambiguous -- it sounds like the entire cycle (ON + OFF) is ending. The user sees "Day 27 of 56" and reads "cycle ending" as contradictory.

**Improve notification titles:**
- ON to OFF transition: Change from "Cycle Ending Soon" to "On-Cycle Ending Soon"
- This makes it clear the ON phase is ending, not the entire protocol

### 3. One-time cleanup of stale notifications

Since existing users may have accumulated orphaned notifications that can never be cancelled by the current broken logic, add a one-time migration step:

**File:** `src/hooks/useAppStateSync.tsx`

- On app resume/boot, after the cycle reminder reschedule, check a flag like `cycle_notif_migration_v1`
- If not set, cancel ALL pending notifications that match cycle-related title patterns (e.g., titles containing "Cycle Ending", "Off-Phase Begins", "Cycle Begins", "Cycle Resuming"), then reschedule fresh
- Set the flag so this only runs once

## Technical Details

### Changes to `src/utils/cycleReminderScheduler.ts`

1. Import `persistentStorage`
2. `scheduleCycleReminders()`: After `LocalNotifications.schedule()`, save the notification IDs array to `persistentStorage.set('cycle_notif_ids_' + compound.id, JSON.stringify(ids))`
3. `cancelCycleReminders()`: Read IDs from `persistentStorage.get('cycle_notif_ids_' + compoundId)`, cancel those specific IDs, then remove the storage key
4. Update notification title strings:
   - "Cycle Ending Soon" -> "On-Cycle Ending Soon"
   - Keep "Off-Phase Begins" and "Cycle Begins" as-is (those are already clear)

### Changes to `src/hooks/useAppStateSync.tsx`

1. After `rescheduleAllCycleReminders()`, check `persistentStorage.getBoolean('cycle_notif_cleanup_v1', false)`
2. If false, get all pending notifications, filter by title patterns containing cycle-related keywords, cancel them all, then set the flag to true
3. The subsequent `rescheduleAllCycleReminders()` call will repopulate with correct notifications

### Files Modified
- `src/utils/cycleReminderScheduler.ts` -- fix cancel logic, improve wording
- `src/hooks/useAppStateSync.tsx` -- one-time stale notification cleanup

