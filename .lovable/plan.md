
# Engagement Notification Refinements — COMPLETED

## Changes Made

### 1. Removed "All Done" Celebration Notification ✅
Removed `all_done` (ID 90050) type, constants, `scheduleAllDoneCelebration()`, and its call from TodayScreen. In-app fireworks already handles this.

### 2. Removed First Week Anniversary Notification ✅
Removed `first_week` (ID 90060), `scheduleFirstWeekAnniversary()`, and anniversary tracking in useEngagementTracking. The 7-day streak milestone is more meaningful.

### 3. Schedule-Aware Re-engagement ✅
`rescheduleReengagement()` now queries user's active compounds and calculates the longest dosing gap:
- daily → 1 day gap → fires 2 days out
- weekly → 7 day gap → fires 8 days out
- interval → uses interval_days → fires interval+1 days out
- specific_days → calculates max gap between scheduled days → fires gap+1 days out
- Capped at 10 days maximum
- Falls back to 3 days if no compounds or query fails

### 4. Missed Dose: Relative Timing ✅
Already implemented in previous iteration — fires 2 hours after last scheduled dose time.

## Remaining Notification Types (Active)
- `first_dose` — once ever
- `streak_3`, `streak_7`, `streak_14`, `streak_30` — milestone celebrations
- `missed_dose` — cancelled when all doses complete
- `weekly_checkin` — Sunday 7 PM, skipped if user active, includes dynamic stats
- `reengage` — schedule-aware timing
- `photo_reminder` — Saturday 10 AM for users with 1+ photos
