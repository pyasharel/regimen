
# Fix Timezone Bug in Cycle Status Calculation

## Problem Summary
A beta tester reported that their 5 days on / 2 days off cycle was showing incorrectly (4 on / 2 off). After investigation, this is caused by a timezone parsing bug in `cycleUtils.ts`.

## Root Cause
When JavaScript parses a date string like `"2025-01-22"` using `new Date("2025-01-22")`, it interprets it as **UTC midnight**. For users in western timezones (like PST/EST - all of North America), this actually resolves to the **previous day** in local time.

**Example:**
- Start date stored: `"2025-01-22"` (January 22nd)
- `new Date("2025-01-22")` → `Wed Jan 21 2025 16:00:00` (PST)
- Cycle calculation thinks the start was January 21st → off by one day

## Scope of Impact
- **Affects**: All users west of UTC (entire Americas, ~50%+ of users)
- **Impact**: Cycle phase displayed incorrectly (ON vs OFF off by one day)
- **Frequency**: Every cycle status calculation

## Comprehensive Audit Results

I reviewed all date handling across the scheduling system:

| File | Current Approach | Status |
|------|-----------------|--------|
| `cycleUtils.ts` | `new Date(startDate)` | BUG - needs fix |
| `doseRegeneration.ts` | `createLocalDate()` | Already correct |
| `cycleReminderScheduler.ts` | `safeParseDate()` | Already correct |
| `CycleTimeline.tsx` | `safeParseDate()` | Already correct |
| `notificationScheduler.ts` | Manual parse with `split('-').map(Number)` | Already correct |
| `AddCompoundScreen.tsx` | `+ 'T00:00:00'` suffix | Already correct |
| `useAppStateSync.tsx` | `+ 'T00:00:00'` suffix | Already correct |
| `CompoundDetailScreen.tsx` | `+ 'T00:00:00'` suffix | Already correct |

**Conclusion**: Only `cycleUtils.ts` has the bug. All other scheduling code is already timezone-safe.

## Other Schedule Types - Not Affected
- **Daily/Specific days/Weekly/Twice Weekly**: Uses day-of-week comparison on already-correct dates
- **Every X Days**: Uses `daysSinceStart` calculation, but in `doseRegeneration.ts` which uses `createLocalDate()` 
- **Custom times**: Time parsing is independent of date parsing
- **Notifications**: Already manually parsing dates correctly

## The Fix

Update `cycleUtils.ts` to use the existing `createLocalDate()` utility:

```typescript
// Before (line 27):
const start = new Date(startDate);

// After:
import { createLocalDate } from "@/utils/dateUtils";
// ...
const start = createLocalDate(startDate);
if (!start) return null;  // Handle invalid date
```

## Technical Details

The `createLocalDate()` function already handles this correctly:
```typescript
// From dateUtils.ts - parses in LOCAL timezone
const [year, month, day] = dateStr.split('-').map(Number);
const date = new Date(year, month - 1, day);  // Local midnight
```

## Risk Assessment
- **Low risk**: Simple one-line change using existing utility
- **Already tested**: Same function used successfully in `doseRegeneration.ts` and `CycleTimeline.tsx`
- **Backwards compatible**: No data migration needed

## Files to Modify
1. **src/utils/cycleUtils.ts** - Import `createLocalDate` and use it instead of raw `new Date()`
