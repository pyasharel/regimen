

# Engagement Notifications Audit and Upgrade

## The Bug Your Beta Tester Hit

The "Quick check-in? You have unchecked doses from earlier today" notification fired even though all doses were already taken. Here's why:

1. When the app opens (TodayScreen mounts), `initializeEngagementNotifications()` runs
2. At that moment, it queries the database for untaken doses, finds some (before the user marks them), and schedules a 3 PM notification
3. The user then marks all doses as taken... but **the already-scheduled 3 PM notification is never cancelled**
4. At 3 PM, the stale notification fires even though everything is complete

The fix: when a dose is marked as taken and all scheduled doses for the day are now complete, cancel the pending missed_dose notification (ID 90010).

---

## Full Audit of All 7 Notification Types

### 1. First Dose -- OK
- Fires once ever per user. Properly gated by localStorage. No issues.

### 2. 3-Day Streak -- OK  
- Fires at 8 PM on exact day 3. Cancels if streak passes 3. Sound logic.

### 3. 7-Day Streak -- OK
- Same pattern as 3-day. Properly cancels if streak surpasses 7.

### 4. Missed Dose -- BUG
- **Problem**: Schedules at mount time, never cancelled when user completes doses
- **Fix**: Cancel notification (ID 90010) when all daily doses are marked taken
- **Additional fix**: Also re-check before scheduling. If it's already past 3 PM when the function runs, it skips scheduling but the damage may already be done from an earlier mount

### 5. Weekly Check-in -- MINOR ISSUE
- Always fires on Sunday 7 PM regardless of whether user was active that day
- **Improvement**: Skip if the user already logged doses today (they're clearly engaged, don't need a "check in" pat on the back)

### 6. Re-engagement -- OK BUT COULD IMPROVE
- Fires at 2 PM if 3+ days inactive. Logic is sound.
- **Improvement**: Schedule it for 3 days in the future instead of "today at 2 PM if already 3 days inactive." Currently, if the user opens the app after 2 PM on day 3, the notification never fires because 2 PM already passed.

### 7. Photo Reminder -- OK
- Saturday 10 AM, only for users with 1+ photos. Properly gated.

---

## New Smart Engagement Features

Based on best practices research and what works for health/fitness apps:

### A. Cancel missed_dose notification on completion (Bug Fix)
When all scheduled doses are marked taken, immediately cancel the pending missed dose notification. This is the direct fix for the reported bug.

### B. Milestone celebrations beyond streaks
Add notifications for:
- **14-day streak** (two weeks is a real habit-forming milestone)
- **30-day streak** (the big one)
- **First week anniversary** (7 days since signup, regardless of streak)

### C. Smarter re-engagement with future scheduling
Instead of checking "has it been 3 days?" on app open, proactively schedule a re-engagement notification 3 days from now every time the user logs a dose. If they come back, the notification gets rescheduled further out. If they don't, it fires.

### D. "All done" celebration notification
When ALL doses for the day are completed before their scheduled time, schedule a small celebratory notification 30 minutes later: "All doses complete for today. Consistency builds results."

### E. Weekly progress summary trigger
Instead of a generic "another week in the books," make the Sunday notification include actual data: streak count, doses completed this week. This requires generating the message at schedule time from real stats.

---

## Technical Changes

### File: `src/utils/engagementNotifications.ts`

1. **Export a `cancelMissedDoseNotification()` function** that cancels notification ID 90010
2. **Fix re-engagement scheduling** to schedule 3 days in the future (not "today if already 3 days late")
3. **Add 14-day and 30-day streak milestone notifications** with new IDs (90014, 90030 range)
4. **Add "all done" celebration notification** type with ID 90050
5. **Improve weekly check-in** to skip if user was active today
6. **Add weekly progress summary** with dynamic message content based on stats

### File: `src/components/TodayScreen.tsx`

1. After marking a dose as taken, check if all scheduled doses are now complete
2. If yes, call `cancelMissedDoseNotification()` to prevent the stale notification
3. Optionally schedule the "all done" celebration
4. When logging a dose, also reschedule re-engagement to 3 days from now (keeps pushing it forward while user is active)

### File: `src/hooks/useEngagementTracking.tsx`

1. Extend to also track "first week anniversary" milestone

### New notification types and IDs:
- `streak_14` (ID 90014) - "Two weeks strong!"
- `streak_30` (ID 90030 - reuse reengage ID or pick 90031) - "30 days! Champion status."
- `all_done` (ID 90050) - "All doses complete today"
- `first_week` (ID 90060) - "One week since you started"

### Throttle periods:
- `streak_14`: 60 days
- `streak_30`: 90 days  
- `all_done`: 1 day (once per day max)
- `first_week`: 9999 (once ever)

---

## What This Solves

- **Bug fix**: No more "unchecked doses" notifications when everything is taken
- **Smarter timing**: Re-engagement fires reliably instead of only if app opens at the right time
- **More milestones**: Users get celebrated at 14 and 30 days, not just 3 and 7
- **Positive reinforcement**: "All done" notification rewards completing doses early
- **Less spam**: Weekly check-in skipped if user is already active
- **Best practice alignment**: Notifications trigger around user behavior, not rigid schedules

