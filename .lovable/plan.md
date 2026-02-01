# Plan: Duplicate Compound Bug Fix + "Every 3.5 Days" / Twice Weekly Feature

## Status: ✅ IMPLEMENTED

---

## Changes Made

### Part 1: Duplicate Compound Bug Fix ✅

**File**: `src/components/AddCompoundScreen.tsx`

**Fix Applied**: Moved `setSaving(true)` to the very first line of `handleSave()`, before any validation. Added an early return guard `if (saving) return;` and reset `setSaving(false)` on validation failures.

This prevents double-tap race conditions that caused duplicate compound entries.

---

### Part 2: Weekly & Twice Weekly Frequency Options ✅

**Files Modified**:
- `src/components/AddCompoundScreen.tsx` - Added new frequency options and UI
- `src/utils/doseRegeneration.ts` - Updated dose generation logic

**New Features**:

1. **"Weekly" Frequency**
   - Single day picker (M T W T F S S)
   - Single time picker
   - Stored as `schedule_type: "Weekly"`, `schedule_days: [day]`, `time_of_day: [time]`

2. **"Twice Weekly" Frequency**
   - Two separate day pickers (one for each injection)
   - Per-day time pickers (e.g., Monday 8 AM, Thursday 8 PM for true 3.5-day spacing)
   - Spacing indicator shows if days are optimally spaced (3-4 days apart)
   - Stored as `schedule_type: "Twice Weekly"`, `schedule_days: [day1, day2]`, `time_of_day: [time1, time2]`

**Database Consideration**:
- No schema changes required
- `time_of_day` and `schedule_days` arrays are implicitly paired by index for Twice Weekly

---

## Testing Notes

1. **Duplicate Bug Fix**: Try rapidly double-tapping Save when adding a compound - should only create one entry
2. **Weekly**: Select "Weekly" frequency, pick a day, set time - doses should only appear on that day
3. **Twice Weekly**: Select "Twice Weekly", pick Mon + Thu with different times - doses should appear on those days at the specified times

---

## Response for Beta Tester

> yo good catch on the duplicate entry, found it in the database - two KLOWs 8 seconds apart. its a race condition when you tap save twice before it finishes. fixed that 👍
>
> for the 3.5 day thing - added a "twice weekly" option. you pick your two days (like mon + thu) and can set different times for each. so monday 8am, thursday 8pm gives you the 3.5 day spacing you want. also shows a hint if your days are optimally spaced.
>
> also added a simple "weekly" option for once-a-week stuff like GLP-1s. should be in the next build
