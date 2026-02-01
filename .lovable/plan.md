

# Plan: Re-enable Medication Levels Card + Fix Metric Unit Syncing

## Overview

This plan addresses two related features:
1. **Re-enable the Medication Levels Card** on the Today screen with smart default compound selection
2. **Fix the metric/imperial unit syncing gap** where onboarding doesn't initialize local storage

---

## Part 1: Medication Levels Card

### Current State
- The `MedicationLevelsCard` component is fully built (539 lines) and working
- It's simply commented out in `TodayScreen.tsx` (lines 6-7 and 1278-1294)
- The data-fetching functions (`loadLevelsData`, state variables) are also commented out (lines 120-138, 284-394)

### Default Compound Selection Analysis

The existing logic in `MedicationLevelsCard.tsx` (lines 129-171) already implements smart selection:

1. **Saved preference** (localStorage) — but only if that compound has logged doses
2. **Most recently taken dose's compound** — ensures the chart shows actual data
3. **Alphabetical fallback** — only if no doses exist

**My Recommendation**: The current logic is excellent and already does what you described. The issue you experienced (seeing a flat line for BPC-157) was because your saved preference had no recent doses. The code now properly clears stale preferences and falls back to the most recently dosed compound. 

No changes needed to the selection logic — it's already optimal.

### Is This Feature Too Much for the Today Screen?

**My take**: The Medication Levels Card adds genuine value for users who want at-a-glance visibility into their current medication status. Here's why it belongs:

- **Engagement driver**: Seeing the decay curve motivates users to stay on schedule
- **Differentiated feature**: Most medication trackers don't show pharmacokinetic data
- **Compact design**: The card is collapsible and takes minimal space
- **Smart visibility**: Only shows for compounds with half-life data (filters out things we can't calculate)

The card is wrapped in an error boundary, so if anything goes wrong, it fails gracefully without affecting the rest of the screen.

---

## Part 2: Metric Unit Syncing Fix

### The Problem

Your Android beta tester set metric in onboarding, but when logging weight, the app defaulted to imperial. Here's why:

**`AccountCreationScreen.tsx`** saves to the database profile:
```
current_weight_unit: data.weightUnit,  // 'lb' or 'kg'
height_unit: data.heightUnit,           // 'ft' or 'cm'
```

But it **does not** save to local `persistentStorage` (Capacitor Preferences), which is where `MetricLogModal.tsx` reads from:
```
const savedUnit = await persistentStorage.get('weightUnit');
```

Since local storage is empty, `MetricLogModal` defaults to 'lbs'.

### The Solution

**Option A (Recommended)**: Sync to persistentStorage in `AccountCreationScreen.tsx` after account creation
- This ensures the user's onboarding choice is immediately available in local storage
- Simple, targeted fix with no UI changes

**Option B**: Remove the unit toggle from `MetricLogModal.tsx` entirely
- You mentioned you don't want users selecting units per-entry
- The modal would just use the saved preference from settings

I recommend **both changes** together:
1. Save units to persistentStorage during onboarding
2. Remove the per-entry unit toggle from `MetricLogModal`

---

## Implementation Details

### Changes to `AccountCreationScreen.tsx`
After successful account creation (around line 197), add:

```text
// Sync unit preferences to local storage for immediate use
import { persistentStorage } from '@/utils/persistentStorage';

// After profile update succeeds:
await persistentStorage.set('weightUnit', data.weightUnit === 'kg' ? 'kg' : 'lbs');
await persistentStorage.set('heightUnit', data.heightUnit === 'cm' ? 'metric' : 'imperial');
await persistentStorage.set('unitSystem', data.weightUnit === 'kg' ? 'metric' : 'imperial');
```

### Changes to `MetricLogModal.tsx`
- Remove the unit `Select` dropdown (lines ~110-125)
- Keep loading the unit preference from storage (already does this)
- Use the loaded unit directly without allowing changes

### Changes to `TodayScreen.tsx`
- Uncomment the import on line 7
- Uncomment the state variables and interfaces (lines 120-138)
- Uncomment the `loadLevelsData` function (lines 351-394)
- Uncomment the useEffect that calls it (lines 284-288)
- Uncomment the JSX render block (lines 1278-1294)

---

## Testing Considerations

1. **Fresh onboarding test**: Create a new account with metric units, verify weight logging uses kg
2. **Existing user test**: For users who already onboarded with metric but have broken local storage, `DisplaySettings.tsx` already syncs from profile to local storage on first load (lines 55-104)
3. **Medication Levels**: Verify the card renders for compounds with half-life data, shows "most recently dosed" by default

---

## Risk Assessment

| Change | Risk | Mitigation |
|--------|------|------------|
| Re-enable Medication Levels | Low | Already wrapped in ComponentErrorBoundary |
| Unit sync in onboarding | Very Low | Additive change, only runs during account creation |
| Remove unit toggle in modal | Low | Unit still changeable in Settings → Display |

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/components/TodayScreen.tsx` | Uncomment MedicationLevelsCard feature |
| `src/components/onboarding/screens/AccountCreationScreen.tsx` | Sync weight/height units to persistentStorage |
| `src/components/progress/MetricLogModal.tsx` | Remove inline unit toggle, use saved preference |

