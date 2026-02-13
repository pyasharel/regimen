

# v1.0.9 Cycle Notification Polish

## Summary

Two small follow-up changes to the cycle notification fix that shipped in this session.

## Changes

### 1. Revert notification wording back to original style

The current code says "On-Cycle Ending Soon" and "On-Cycle Ends Today" which reads awkwardly. Revert to the original clearer phrasing:

**File:** `src/utils/cycleReminderScheduler.ts`

- Line 101: `On-Cycle Ending Soon` --> `Cycle Ending Soon`
- Line 102: `Your on-cycle ends in...` --> `Your cycle ends in...`
- Line 114: `On-Cycle Ends Today` --> `Cycle Ends Today`
- Line 115: `Your on-cycle ends today.` --> `Your cycle ends today.`
- Line 165: `On-Cycle Ending Soon` --> `Cycle Ending Soon`
- Line 166: `Your on-cycle ends in...` --> `Your cycle ends in...`

The confusion was never about the wording -- it was about receiving the notification at the wrong time due to the cancellation bug. With the bug fixed, "Cycle Ending Soon" is perfectly clear.

### 2. Add safe integer bound to cycle notification ID generation

The dose notification scheduler caps its hash at `Math.abs(hash % 2147483647) + 1` to stay within the 32-bit signed integer range required by iOS/Android. The cycle reminder scheduler currently only does `Math.abs(hash)` which could theoretically overflow.

**File:** `src/utils/cycleReminderScheduler.ts`

- Line 317: Change `return Math.abs(hash);` to `return Math.abs(hash % 2147483647) + 1;`

### 3. Update stale notification cleanup patterns

Since we are reverting the wording, the cleanup patterns list (line 254-261) already includes both old and new patterns ("Cycle Ending" and "On-Cycle Ending"), so no change needed there -- it will catch both variants.

## Files Modified
- `src/utils/cycleReminderScheduler.ts` -- revert wording, add ID safety bound
