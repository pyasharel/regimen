

# Engagement Notification Refinements

## Changes

### 1. Remove "All Done" Celebration Notification
Remove the `all_done` notification type (ID 90050), its scheduling call in TodayScreen, and related constants. The in-app fireworks animation already handles this moment.

### 2. Remove First Week Anniversary Notification
Remove the `first_week` notification type (ID 90060) and `scheduleFirstWeekAnniversary()`. The 7-day streak milestone already celebrates this behavior more meaningfully since it's earned through actual adherence rather than just time passing.

### 3. Smarter Re-engagement Based on Dosing Schedule
Instead of a fixed 3-day timer, query the user's compounds to find their **next scheduled dose date**. Schedule re-engagement for 1 day after that next dose if it goes unlogged.

Logic:
- When a dose is logged, look at the user's compounds and their schedule types (daily, weekly, interval, specific_days)
- Find the longest gap between doses across all compounds
- Schedule re-engagement for `max_gap + 1 day` after the last logged dose
- Example: weekly user logs on Monday, re-engagement fires Wednesday of the following week (8 days later), not Thursday (3 days later)
- For daily users, this still results in roughly 2 days (1 day gap + 1 day buffer)
- Cap at 10 days maximum to catch truly lapsed users

### 4. Missed Dose: Relative Timing
Already implemented -- the missed dose notification fires 2 hours after the user's last scheduled dose time of the day rather than a fixed 3 PM. No additional changes needed here beyond the previous update.

---

## Technical Details

### File: `src/utils/engagementNotifications.ts`

**Remove:**
- `all_done` and `first_week` from the `EngagementNotificationType` union
- Their entries in `ENGAGEMENT_NOTIFICATION_IDS`, `THROTTLE_KEYS`, `THROTTLE_DAYS`, `ENGAGEMENT_NOTIFICATIONS`
- `scheduleAllDoneCelebration()` function
- `scheduleFirstWeekAnniversary()` function
- Remove their calls from `initializeEngagementNotifications()`

**Update `rescheduleReengagement()`:**
- Query user's compounds to get schedule types and intervals
- Calculate the longest expected gap between doses
- Schedule re-engagement for `longest_gap + 1 day` from now (capped at 10 days)
- Fallback to 3 days if no compounds found or query fails

### File: `src/components/TodayScreen.tsx`

**Remove:**
- Import of `scheduleAllDoneCelebration`
- Call to `scheduleAllDoneCelebration()` after all doses complete

### File: `src/hooks/useEngagementTracking.tsx`

**Remove:**
- Any first-week anniversary scheduling logic

### File: `ENGAGEMENT_FEATURES.md`

- Update documentation to reflect removed notification types and new re-engagement logic

