# Compound Scheduling Test Plan

This document outlines comprehensive test cases for the compound scheduling feature.

## Test Cases

### 1. Daily Frequency
- **Setup**: Create a compound with "Daily" frequency
- **Expected**: Doses should appear every single day for the next 30 days
- **Verification**: Check that all 30 days have a scheduled dose

### 2. Specific Day(s) - Single Day
- **Setup**: Create a compound for "Specific day(s)" - Select only Monday (index 1)
- **Expected**: Doses should only appear on Mondays
- **Verification**: 
  - Count Monday doses (should be 4-5 depending on start date)
  - Verify no doses on Tue-Sun

### 3. Specific Day(s) - Multiple Days
- **Setup**: Create a compound for "Specific day(s)" - Select Monday, Wednesday, Friday
- **Expected**: Doses should only appear on Mon, Wed, Fri
- **Verification**: 
  - Verify doses appear only on days 1, 3, 5 (Sun=0, Mon=1, etc.)
  - Count total doses (should be ~12-13 over 30 days)

### 4. Specific Day(s) - Tuesday with Custom Time (Premium)
- **Setup**: 
  - Enable premium mode
  - Create compound for Tuesday (index 2)
  - Set custom time to 7:15 AM
- **Expected**: 
  - Doses only on Tuesdays
  - Scheduled time should be "07:15"
- **Verification**:
  - Check Tuesday has doses
  - Verify `scheduled_time` field is "07:15"

### 5. Every X Days
- **Setup**: Create compound with "Every X Days" where X=3, starting today
- **Expected**: Doses on day 0, 3, 6, 9, 12, 15, 18, 21, 24, 27
- **Verification**: Count should be 10 doses over 30 days

### 6. As Needed
- **Setup**: Create compound with "As Needed"
- **Expected**: No scheduled doses generated
- **Verification**: Doses table should have 0 entries for this compound

### 7. Edit Compound - Change Days
- **Setup**: 
  - Create compound for Monday
  - Edit and change to Thursday
- **Expected**: 
  - Old Monday doses deleted
  - New Thursday doses created
- **Verification**: No Monday doses exist, only Thursday doses

### 8. Edit Compound - Preserve Existing Data
- **Setup**: Edit an existing compound and only change the name
- **Expected**: Schedule should remain unchanged
- **Verification**: Dose count and days should stay the same

## Bug Fixes Verified

1. **schedule_days Type Mismatch**: Fixed array of numbers being saved as strings
2. **Circular Reference**: Removed incorrect object assignment causing circular reference
3. **Bi-weekly Removal**: Removed bi-weekly option entirely (covered by specific days)
4. **Weekdays Removal**: Removed weekdays option (covered by specific days)
5. **generateDoses Logic**: Fixed day-of-week checking to use correct frequency name

## How to Test

1. Enable premium mode toggle for testing custom times
2. Create compounds for each test case above
3. Check database `doses` table for correct entries:
   ```sql
   SELECT compound_id, scheduled_date, scheduled_time, dose_amount 
   FROM doses 
   WHERE compound_id = 'your-compound-id'
   ORDER BY scheduled_date;
   ```
4. Verify in UI that doses appear on correct days in TodayScreen
5. Edit compounds and verify doses are regenerated correctly

## Console Debug Output

When saving, you should see:
```javascript
{
  frequency: "Specific day(s)",
  customDays: [2], // Tuesday
  schedule_days: [2] // Should match customDays
}
```

The `schedule_days` should:
- Be `null` for Daily, Every X Days, As Needed
- Be an array of day indices (0-6) for Specific day(s)
- NOT show circular reference error
