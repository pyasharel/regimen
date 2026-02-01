

# Plan: Fix Calendar Month View to Start on Monday

## The Issue

Your beta tester (mandzhalas) correctly identified that the month view calendar starts on **Sunday** while the week picker in the Today screen already starts on **Monday**. This inconsistency is confusing.

**Root Cause**: The `Calendar` component uses `react-day-picker` which defaults to Sunday (index 0) as the first day of the week. We never set the `weekStartsOn` prop.

## The Fix

A one-line change in `src/components/ui/calendar.tsx`:

```typescript
<DayPicker
  weekStartsOn={1}  // 1 = Monday (add this line)
  showOutsideDays={showOutsideDays}
  // ... rest of props
/>
```

This will globally fix every calendar in the app:
- DoseEditModal (editing dose dates)
- LogTodayModal (logging daily entries)
- PhotoPreviewModal (changing photo dates)
- ProgressScreenComplex (date pickers for metrics/photos)
- AddCompoundScreen (start date picker)

## Files to Change

| File | Change |
|------|--------|
| `src/components/ui/calendar.tsx` | Add `weekStartsOn={1}` prop to DayPicker |

## Verification

After this change, all month-view calendars will display:
```text
Mon  Tue  Wed  Thu  Fri  Sat  Sun
 -    -    -    -    1    2    3
 4    5    6    7    8    9   10
...
```

This aligns with the existing week picker in TodayScreen which already uses Monday-based calculation (lines 144-154).

---

## Draft Response for Beta Tester

> yo good catch! you're right the month calendar was starting on sunday while the week view starts monday. fixing that now so they're consistent - all calendars will start on monday 👍

