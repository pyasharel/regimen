

## Plan: Fix Next Dose Bug + HealthKit Integration Spec

### Part 1: Fix Next Dose / Schedule Mismatch Bug

**Root Cause**: The "Next Dose" display in `CompoundDetailScreen.tsx` and `CompoundDetailScreenV2.tsx` queries untaken doses from the database but:
1. Does not filter out skipped doses (`skipped: true`)
2. Trusts stale dose records that may not match the current schedule (e.g., leftover doses from before a schedule edit)

**Fix Strategy**: Rather than just filtering the database query, calculate the next scheduled date dynamically from the compound's schedule configuration. This guarantees accuracy regardless of database state.

**Files to modify:**

1. **`src/components/CompoundDetailScreenV2.tsx`** (lines 361-365) and **`src/components/CompoundDetailScreen.tsx`** (lines 251-255):
   - Replace the current `nextScheduledDose` logic that queries from `doses` array
   - Add a `getNextScheduledDate()` helper function that calculates the next valid dose date based on the compound's `schedule_type`, `schedule_days`, and `time_of_day`
   - For "Specific day(s)" schedule type: find the next day-of-week that matches `schedule_days` from today forward
   - For "Weekly": find the next occurrence of `schedule_days[0]`
   - For "Daily": next dose is today (if not yet taken) or tomorrow
   - For "Every X Days": calculate based on `start_date` and interval
   - Fall back to the database query only for "As Needed" or edge cases

2. **`src/components/ShareCard.tsx`**: Update if it uses the same pattern (it receives `nextDose` as a prop, so no change needed there)

**The helper function logic:**
```text
getNextScheduledDate(compound):
  today = current day of week (0-6)
  
  if schedule_type is "Specific day(s)":
    parse schedule_days as integers [1, 3, 5]
    find the nearest future day that matches
    if today matches AND today's dose not taken -> return today
    else -> return next matching day
    
  if schedule_type is "Weekly":
    similar but single day
    
  if schedule_type is "Daily":
    return today (or tomorrow if taken)
    
  if schedule_type matches "Every X Days":
    calculate from start_date using modulo
```

### Part 2: HealthKit Integration Spec Document

Create a comprehensive spec file at **`HEALTHKIT_INTEGRATION_SPEC.md`** that serves as a complete guide for implementing HealthKit/Health Connect in Cursor or Claude Code. This document will include:

**Section 1: Prerequisites and Setup**
- Install Xcode command line tools
- Clone the repo from GitHub
- Run `npm install` and `npx cap sync`
- Open in Xcode: `npx cap open ios`

**Section 2: Getting Started with Cursor**
- How to open the project in Cursor
- How to use Claude/AI in Cursor (Cmd+K for inline edits, Cmd+L for chat)
- Tips for prompting effectively

**Section 3: Plugin Installation**
- Which Capacitor HealthKit plugin to use (`@perfood/capacitor-healthkit`)
- Android equivalent: Health Connect (`@nicoritschel/capacitor-healthconnect`)
- NPM install commands

**Section 4: iOS Configuration**
- Add HealthKit capability in Xcode (step-by-step with screenshots description)
- Update `Info.plist` with `NSHealthShareUsageDescription` and `NSHealthUpdateUsageDescription`
- Update `ios/App/App/App.entitlements`

**Section 5: Android Configuration**
- Add Health Connect permissions to `AndroidManifest.xml`
- Required activity declarations

**Section 6: React Hook Implementation**
- Create `src/hooks/useHealthKit.ts`
- Functions: `requestPermission()`, `readWeight()`, `readBodyFat()`, `readSteps()`, `syncToProgress()`
- Data types to read: weight, body fat %, steps, workouts
- How to map HealthKit data into the existing `progress_entries` table (category: "weight", "body_fat", etc.)
- Sync strategy: on app open, pull last 30 days of data, upsert into progress_entries

**Section 7: UI Integration Points**
- Settings screen toggle for HealthKit sync
- Progress screen auto-populated metrics
- Onboarding permission request screen

**Section 8: Testing**
- HealthKit does NOT work in iOS Simulator - must use physical device
- How to add test data via the Health app on device
- Android testing with Health Connect test data

**Section 9: Database Schema**
- No schema changes needed - existing `progress_entries` table already supports weight, body_fat, steps via the `metrics` JSONB column and `category` field
- Add a `source` field convention in metrics to distinguish manual vs HealthKit entries

**Section 10: Exact Prompts for Cursor**
- Pre-written prompts to paste into Cursor for each step of the implementation
- Example: "Create a Capacitor plugin wrapper for HealthKit that reads weight, body fat, and step data. Use @perfood/capacitor-healthkit. Create a React hook at src/hooks/useHealthKit.ts..."

### Technical Details

**Next Dose fix - specific code change:**

In both `CompoundDetailScreen.tsx` and `CompoundDetailScreenV2.tsx`, replace:
```typescript
const nextScheduledDose = doses
  .filter(d => !d.taken && d.scheduled_date >= todayStr)
  .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))[0];
```

With a new function that computes the next valid scheduled date from the compound's configuration, then finds the matching dose record (or constructs a virtual one for display). This ensures the "Next Dose" always reflects the actual schedule, not stale database records.

