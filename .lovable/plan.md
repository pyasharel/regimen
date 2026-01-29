
# Fix Plan: Medication Levels Card Default Selection

## Problem Analysis

Based on your testing and the codebase analysis, I identified the **root cause** of why the Levels Card shows alphabetically (BPC-157) instead of your most recently logged medication:

### Why This Happens

The `TodayScreen.tsx` loads doses using `loadLevelsData()` which **only fetches doses from the last 30 days**:

```text
Lines 344-356 in TodayScreen.tsx:
- Fetches taken doses where scheduled_date >= 30 days ago
- If you haven't logged a specific medication in 30 days, it's excluded
- MedicationLevelsCard receives an incomplete picture
- Falls back to alphabetical order when your "recent" medication has no doses in the data
```

Your answer confirms: you want **most recently taken** (regardless of how long ago) with **no date filter** (just fetch latest N doses).

## Solution

### Part 1: Update Data Fetching (TodayScreen.tsx)

Change the dose query from "last 30 days" to "latest 500 taken doses" (ordered by taken_at descending):

**Current:**
```typescript
.gte('scheduled_date', thirtyDaysAgo)
.order('taken_at', { ascending: false })
```

**New:**
```typescript
.order('taken_at', { ascending: false })
.limit(500)
```

This ensures we always have the user's most recent activity regardless of date.

### Part 2: Improve Default Selection Logic (MedicationLevelsCard.tsx)

The `getDefaultCompound()` function already has the correct priority:
1. Saved preference (if it has doses)
2. Most recently taken dose's compound
3. Alphabetical fallback

But with the 30-day filter, step 2 was failing because recent doses weren't in the data. With the "latest N" approach, this will work correctly.

### Part 3: Update Memory Documentation

Document this behavior for future reference:
- Default selection prioritizes the most recently logged dose
- No date filter on the levels data query (fetch latest N)
- Saved preferences are honored only if that compound has logged data

## Technical Changes

| File | Change |
|------|--------|
| `src/components/TodayScreen.tsx` | Remove `.gte('scheduled_date', thirtyDaysAgo)`, add `.limit(500)` |
| `.storage/memory/features/medication-levels-default-compound-logic.md` | Update documentation |

## Why The Data Loading Issue Resolved

The "Slow connection / Preview mode" error you saw after switching themes was likely a **transient network timeout**. The app has an 8-second watchdog that shows this banner when queries take too long. After a hard close, the session was re-established cleanly.

This is not directly related to the Levels Card logic - it's the existing cold-start resilience working as designed (showing a retry option rather than hanging).

## Android Icon Note

The Android `res/mipmap-*` folders are generated locally on your machine when you run `npx cap add android`. They're not stored in the Lovable codebase. The fix is manual on your machine using Android Studio's Image Asset Studio (as previously discussed).

## Testing After Fix

1. Pull the update: `git pull && npm install && npm run build && npx cap sync ios`
2. Launch app
3. Verify the Levels Card shows your most recently logged medication (not alphabetical)
4. Switch to a different compound manually
5. Hard close and reopen - verify your selection persists
