

# Comprehensive Calculation & Dosage Saving Analysis

## Bug Confirmed: mL Saving Issue in Weekly Total Mode

Nicholas correctly identified the bug. When using "Weekly Total" mode for oil-based compounds, the app saves the **weekly volume** instead of the **per-injection volume**.

---

## Analysis Summary: All Frequency Types and Dose Modes

### How the System Works

1. **Dose Input Modes** (for oil-based compounds only):
   - **Per Injection**: User enters dose per shot (e.g., "36 mg")
   - **Weekly Total**: User enters total weekly dose (e.g., "252 mg/week")

2. **Key Functions**:
   - `calculateML()` - Returns weekly volume when in weekly mode (uses `intendedDose` directly)
   - `calculateFromWeekly()` - Returns correct per-injection values (`mgPerInjection`, `mlPerInjection`)
   - `getFinalIntendedDose()` - Already correctly converts weekly dose to per-injection dose
   - **Missing**: No equivalent `getFinalCalculatedML()` function exists

---

## Bug Location: Three Places Need Fixing

### 1. Compound Save (Update) - Line 1207
```typescript
// CURRENT (BUG):
calculated_ml: calculatedML ? parseFloat(calculatedML) : null,

// FIX:
calculated_ml: getFinalCalculatedML(),
```

### 2. Compound Save (Insert) - Line 1353
```typescript
// CURRENT (BUG):
calculated_ml: calculatedML ? parseFloat(calculatedML) : null,

// FIX:
calculated_ml: getFinalCalculatedML(),
```

### 3. generateDoses() - Line 940
```typescript
// CURRENT (BUG):
calculated_ml: calculatedML ? parseFloat(calculatedML) : null,

// FIX:
calculated_ml: getFinalCalculatedML(),
```

---

## Testing Matrix: All Permutations

### Frequency Types to Test

| Frequency | Injections/Week | Weekly Mode Calculation |
|-----------|----------------|------------------------|
| Daily | 7 (or 14 if 2x/day) | 252 mg/week ÷ 7 = 36 mg/injection |
| Weekly | 1 | 252 mg/week ÷ 1 = 252 mg/injection |
| Twice Weekly | 2 | 252 mg/week ÷ 2 = 126 mg/injection |
| Specific day(s) | Varies | 252 mg/week ÷ N = mg/injection |
| Every X Days | ~7/X | 252 mg/week ÷ (7/X) |
| As Needed | N/A | Weekly mode disabled |

### Test Cases

**Test 1: Daily + Weekly Total Mode**
- Weekly dose: 252 mg
- Concentration: 250 mg/mL
- Expected per-injection: 36 mg, 0.14 mL
- Currently saves: 0.14 mL (correct) or 1.01 mL (bug)?
- **Result**: Bug - saves weekly volume (1.01 mL)

**Test 2: Twice Weekly + Weekly Total Mode**
- Weekly dose: 500 mg
- Concentration: 250 mg/mL
- Expected per-injection: 250 mg, 1.0 mL
- Currently saves: 2.0 mL (weekly volume - BUG)

**Test 3: Weekly + Weekly Total Mode**
- Weekly dose: 200 mg
- Concentration: 200 mg/mL
- Expected per-injection: 200 mg, 1.0 mL
- Currently saves: 1.0 mL (correct, since 1x/week = same as weekly)

**Test 4: Every 3 Days + Weekly Total Mode**
- Weekly dose: 350 mg
- Concentration: 250 mg/mL
- Injections/week: ~2.33
- Expected per-injection: ~150 mg, 0.60 mL
- Currently saves: 1.4 mL (weekly volume - BUG)

**Test 5: Per-Injection Mode (Regression)**
- Dose: 100 mg per injection
- Concentration: 200 mg/mL
- Expected: 0.5 mL
- **Should still work correctly** (not affected by fix)

**Test 6: Peptide Calculator (IU mode)**
- Not affected - uses different calculator path
- **Should still work correctly**

---

## Other Potential Issues Checked (All Clear)

### Issue: Dose Amount Saving
**Status**: Already Fixed

The `getFinalIntendedDose()` function already handles this correctly:
```typescript
const getFinalIntendedDose = (): number => {
  if (doseInputMode === 'weekly' && isOilBasedCompound(name) && doseUnit === 'mg') {
    const result = calculateFromWeekly();
    if (result) {
      return result.mgPerInjection;
    }
  }
  return parseFloat(intendedDose);
};
```

### Issue: IU Calculator
**Status**: Not Affected

IU calculator only works with peptides (mcg units), not oil-based compounds (mg units). Weekly mode is only enabled for oil-based compounds.

### Issue: Twice Weekly Times
**Status**: Correctly Implemented

Each day in Twice Weekly has its own time, stored properly in `time_of_day` array paired with `schedule_days`.

### Issue: As Needed
**Status**: Correctly Handled

Weekly mode is disabled for "As Needed" via `calculateInjectionsPerWeek()` returning `null`.

---

## Implementation Plan

### Step 1: Add getFinalCalculatedML() Helper

Add after `getFinalIntendedDose()` function (around line 790):

```typescript
// Get the final calculated mL for saving (uses per-injection value in weekly mode)
const getFinalCalculatedML = (): number | null => {
  if (doseInputMode === 'weekly' && isOilBasedCompound(name) && doseUnit === 'mg') {
    const result = calculateFromWeekly();
    if (result) {
      return result.mlPerInjection;
    }
  }
  // Fall back to standard calculatedML for per-injection mode
  if (calculatedML) {
    return parseFloat(calculatedML);
  }
  return null;
};
```

### Step 2: Update Compound Update Save (Line 1207)

Change:
```typescript
calculated_ml: calculatedML ? parseFloat(calculatedML) : null,
```
To:
```typescript
calculated_ml: getFinalCalculatedML(),
```

### Step 3: Update Compound Insert Save (Line 1353)

Change:
```typescript
calculated_ml: calculatedML ? parseFloat(calculatedML) : null,
```
To:
```typescript
calculated_ml: getFinalCalculatedML(),
```

### Step 4: Update generateDoses() (Line 940)

Change:
```typescript
calculated_ml: calculatedML ? parseFloat(calculatedML) : null,
```
To:
```typescript
calculated_ml: getFinalCalculatedML(),
```

---

## Summary of Changes

| File | Location | Change |
|------|----------|--------|
| AddCompoundScreen.tsx | Line ~790 | Add `getFinalCalculatedML()` helper function |
| AddCompoundScreen.tsx | Line 1207 | Update compound update save |
| AddCompoundScreen.tsx | Line 1353 | Update compound insert save |
| AddCompoundScreen.tsx | Line 940 | Update generateDoses() |

---

## Edge Cases Verified

- Per-injection mode: Will continue to work (falls through to existing logic)
- Peptide IU calculator: Not affected (different unit type)
- As Needed: Weekly mode disabled, no issue
- Non-oil compounds: Weekly mode disabled, no issue
- Editing existing compounds: Will use correct per-injection mL on re-save

---

## Response for Nicholas

Hey Nicholas! Thanks for the detailed bug reports - both really helpful.

**Sign-out issue:** You're on Build 28, and the fix for the sign-out bug was in Build 29. So you were on a version just before we fixed it! If you update to the latest TestFlight build, that should be resolved.

**The 0.95 mL bug:** Great catch! You're absolutely right - the app was incorrectly saving the weekly volume instead of the per-injection volume when using the Weekly Total calculator mode. I'm pushing a fix now. Once you update, you may need to re-save your Testosterone Cypionate entry for it to show the correct 0.14 mL.

Thanks for being such a thorough tester - this kind of feedback is invaluable!

