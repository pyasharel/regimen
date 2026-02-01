

# Plan: Duplicate Compound Bug Fix + "Every 3.5 Days" / Twice Weekly Feature

## Overview

This plan addresses two issues:
1. **Bug**: Race condition causing duplicate compound entries (confirmed in database)
2. **Feature**: Support for "twice weekly" / "every 3.5 days" scheduling with per-day times

---

## Part 1: Duplicate Compound Bug Fix

### Root Cause
Looking at the save function in `AddCompoundScreen.tsx`, the issue is clear:

```typescript
const handleSave = async () => {
  if (!name || !intendedDose) {    // Line 1073: Validation
    toast({ ... });
    return;
  }
  
  // Debug logging                   // Line 1082-1087
  console.log('Saving compound...');
  
  setSaving(true);                   // Line 1089: TOO LATE!
  try {
```

The `setSaving(true)` happens AFTER validation, creating a window where a second tap can trigger another save.

### Database Evidence
Found the duplicate for this beta tester:
- KLOW created at 06:28:04.965696
- KLOW created at 06:28:12.647982
- Same user_id: `99f53e35-0801-4206-8418-60795cbfe1e3`
- 8 seconds apart

### Fix
Move `setSaving(true)` to the very first line of `handleSave()`, before any validation:

```typescript
const handleSave = async () => {
  if (saving) return; // Extra guard
  setSaving(true);    // Block immediately
  
  if (!name || !intendedDose) {
    toast({ ... });
    setSaving(false); // Reset on validation failure
    return;
  }
  // ... rest of save logic
```

---

## Part 2: "Twice Weekly" / Per-Day Times Feature

### Community Research Findings

Based on my research:
1. **TRT Community**: "Twice weekly" on Mon/Thu is extremely common for testosterone. Users want stable blood levels by spacing injections 3-4 days apart.
2. **GLP-1s**: Semaglutide/Tirzepatide are typically once weekly on a fixed day.
3. **Some peptides**: Certain peptides like retatrutide are also once weekly, but some (like your tester's case) are twice weekly.
4. **The "3.5 days" mindset**: Users think of it as "twice weekly" more than "every 3.5 days." They pick two days (Mon/Thu or Tue/Fri) rather than calculating exact hour intervals.

### Key Insight
Your tester said: "Let me specifically define what days/times per week I take" - this is exactly what "Specific day(s)" does! But the current limitation is that all selected days share the same time(s).

For true 3.5-day spacing (Mon 8am, Thu 8pm), users need **different times for different days**.

### UX Analysis: What's Most Intuitive?

**Current Options:**
```text
+------------------+
| Frequency        |
+------------------+
| Daily            |  <- Clear
| Specific days    |  <- For "twice weekly" but same time all days
| Every X days     |  <- For "every 3 days" but drifts week-to-week  
| As needed        |  <- Clear
+------------------+
```

**Problem with "Every X Days" for twice weekly:**
- Every 3 days: Mon, Thu, Sun, Wed, Sat... (drifts)
- Every 4 days: Mon, Fri, Tue, Sat... (also drifts)
- Neither gives consistent Mon/Thu every week

**Your brother's confusion ("once weekly"):**
The current flow requires users to select "Specific days" and then pick ONE day. This works but isn't immediately obvious.

### Recommended Solution: Enhanced Presets + Per-Day Times

#### Option A: Add "Weekly" and "Twice Weekly" Presets (Simpler UX)

Add two new frequency options that are actually shortcuts to "Specific day(s)":

```text
+------------------+
| Frequency        |
+------------------+
| Daily            |
| Weekly           |  <- NEW: Auto-shows "Pick your day"
| Twice weekly     |  <- NEW: Auto-shows "Pick two days + times"
| Specific days    |  <- Keep for 3x/week, 4x/week, etc.
| Every X days     |
| As needed        |
+------------------+
```

When user selects "Weekly":
- Show single day picker (M T W T F S S)
- Show single time picker
- Under the hood: `schedule_type: "Specific day(s)"`, `schedule_days: [selected_day]`

When user selects "Twice weekly":
- Show two day pickers or let them pick 2 days
- Show time for first injection + time for second injection
- Under the hood: `schedule_type: "Specific day(s)"`, `schedule_days: [day1, day2]`

**Pros:**
- Very intuitive - matches how users think ("I take this twice a week")
- Covers your brother's confusion (clear "Weekly" option)
- Covers the 3.5-day use case (pick Mon 8am + Thu 8pm)
- No database schema changes needed

**Cons:**
- More frequency options to scroll through
- "Specific days" becomes the "advanced" option

#### Option B: Per-Day Times in "Specific Day(s)" (More Flexible)

Keep current frequency options but enhance "Specific day(s)" to allow per-day times:

When user selects Mon + Thu:
```text
+------------------------+
| Monday time:    [8:00 AM]  |
| Thursday time:  [8:00 PM]  |
+------------------------+
```

**Pros:**
- Handles any combination (2x, 3x, 4x weekly with different times)
- Fewer UI options in the frequency dropdown

**Cons:**
- Less discoverable for the "weekly" and "twice weekly" use cases
- Requires database change: `time_of_day` needs to map times to days

### My Recommendation: Option A (Presets)

1. **Add "Weekly" frequency** - immediate fix for your brother's confusion
2. **Add "Twice Weekly" frequency** - immediate fix for the 3.5-day case
3. **Keep "Specific days"** - for power users who want 3x/week or unusual schedules

This approach:
- Matches how users actually think about their protocols
- Requires no database schema changes (stores as "Specific day(s)" internally)
- Covers 90%+ of use cases with simple, obvious options
- The UI can show per-day times when "Twice Weekly" is selected

### How This Interacts with Weekly Dose Calculator

The weekly dose calculator already uses `calculateInjectionsPerWeek()` which counts:
- Specific days: number of selected days
- Daily: 7
- Every X days: 7/X

Adding "Weekly" (1 injection) and "Twice Weekly" (2 injections) fits perfectly into this calculation.

### Implementation Details

**UI Flow for "Weekly":**
1. User selects "Weekly"
2. Show: "Which day?" with M T W T F S S buttons (single select)
3. Show: "What time?" with time picker
4. Save as: `schedule_type: "Weekly"`, `schedule_days: [selected_day]`, `time_of_day: [time]`

**UI Flow for "Twice Weekly":**
1. User selects "Twice Weekly"
2. Show: "First injection" - Day picker + Time picker
3. Show: "Second injection" - Day picker + Time picker
4. Optional: Recommend Mon/Thu or Tue/Fri for "stable levels"
5. Save as: `schedule_type: "Twice Weekly"`, with a new structure for per-day times

**Database Consideration:**
For per-day times, we could either:
- Store as: `time_of_day: {"1": "08:00", "4": "20:00"}` (JSONB object keyed by day)
- Or: `time_of_day: ["08:00", "20:00"]` and `schedule_days: [1, 4]` with implicit pairing

The second option requires no schema change but assumes times and days are paired by array index.

---

## Summary of Changes

### Immediate (Bug Fix)
| File | Change |
|------|--------|
| `src/components/AddCompoundScreen.tsx` | Move `setSaving(true)` to start of `handleSave()` |

### Feature (Twice Weekly / Weekly Presets)
| File | Change |
|------|--------|
| `src/components/AddCompoundScreen.tsx` | Add "Weekly" and "Twice Weekly" frequency options |
| `src/components/AddCompoundScreen.tsx` | UI for per-day time selection in Twice Weekly |
| `src/utils/doseRegeneration.ts` | Handle new schedule types in dose generation |

---

## Questions Before Implementation

1. **Do you want Option A (new presets) or Option B (enhanced Specific days)?**
   - I recommend Option A for better UX

2. **For "Twice Weekly", should we:**
   - Let users pick any 2 days + times (flexible)
   - Or offer common presets like "Mon/Thu" or "Tue/Fri" (simpler)?

3. **Should we apply the bug fix immediately and then discuss the feature further?**

---

## Draft Response for Beta Tester

> yo good catch on the duplicate entry, found it in the database - two KLOWs 8 seconds apart. its a race condition when you tap save twice before it finishes. fixing that now
>
> for the 3.5 day thing - totally get it. thinking about adding a "twice weekly" option where you pick your two days and can set different times for each. so like monday 8am, thursday 8pm. that way its actually 3.5 days apart and stays consistent week to week
>
> right now "every 3 days" would drift (mon, thu, sun, wed...) which isnt what you want. does the twice weekly approach sound right?

