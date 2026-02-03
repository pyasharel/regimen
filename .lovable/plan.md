

# Calculator UX Fixes: Alignment, Labels, and Reverse Mode Mapping

## Overview
Fix alignment issues, update label tense, and ensure reverse calculator correctly passes calculated BAC water when adding to stack.

## Issues to Fix

### 1. Alignment: Dose/Unit Fields Not Aligned
The "Dose" label with tooltip icon is taller than the "Unit" label, causing misalignment.

**Fix**: Add consistent label heights and align the input/segmented control properly.

**File**: `src/components/CalculatorModal.tsx` (lines 374-400)

**Current**:
```jsx
<div className="grid grid-cols-2 gap-3 items-end">
  <div className="space-y-2">
    <Label className="text-sm font-medium flex items-center gap-1.5">
      Dose
      <InfoTooltip content="..." />
    </Label>
    <Input ... />
  </div>
  <div className="space-y-2">
    <Label className="text-sm font-medium">Unit</Label>
    <SegmentedControl ... />
  </div>
</div>
```

**Change**:
- Add `min-h-[20px]` to both label containers to ensure equal heights
- Change segmented control size to match input height

---

### 2. Label Tense: "BAC Water Added" → "BAC Water"
Users may be calculating BEFORE reconstituting, so past tense is confusing.

**File**: `src/components/CalculatorModal.tsx`

**Changes**:
- Line 349: Change `BAC Water Added` → `BAC Water`
- Line 350: Change tooltip from "How much bacteriostatic water you added" → "How much bacteriostatic water to add to the vial"

---

### 3. Critical Bug: Reverse Mode Doesn't Pass Calculated BAC Water
When clicking "Add to Stack" in reverse mode, the code passes the empty `bacWater` state variable instead of `calculatedReverseBAC`.

**File**: `src/components/CalculatorModal.tsx` (lines 189-203)

**Current**:
```jsx
if (activeTab === 'reconstitution') {
  navigate('/add-compound', {
    state: {
      prefillData: {
        vialSize: parseFloat(vialSize),
        vialUnit,
        bacWater: parseFloat(bacWater), // ❌ Empty in reverse mode!
        ...
      }
    }
  });
}
```

**Fix**: Check reconMode and pass the calculated value:
```jsx
if (activeTab === 'reconstitution') {
  // For reverse mode, use calculated BAC water; for standard, use input value
  const bacWaterValue = reconMode === 'reverse' 
    ? (calculatedReverseBAC ? parseFloat(calculatedReverseBAC) : 0)
    : parseFloat(bacWater);
    
  navigate('/add-compound', {
    state: {
      prefillData: {
        vialSize: parseFloat(vialSize),
        vialUnit,
        bacWater: bacWaterValue,
        intendedDose: parseFloat(intendedDose),
        doseUnit
      }
    }
  });
}
```

---

## Field Order Validation

| Context | Current Order | Assessment |
|---------|---------------|------------|
| Quick Add Standard | Mode → Vial → BAC Water → Dose → Result | Correct (industry standard) |
| Quick Add Reverse | Mode → Vial → Dose → Units → Result | Correct |
| Add Compound | Dose (top) → Vial → BAC Water → Result | Correct (dose is primary input) |

**Note**: The order differs between screens intentionally:
- Quick Add: Calculator-focused, so "what you have" comes first
- Add Compound: Dose is the primary field, calculator is secondary

---

## Summary of Changes

| File | Line(s) | Change |
|------|---------|--------|
| CalculatorModal.tsx | 349-350 | "BAC Water Added" → "BAC Water", update tooltip |
| CalculatorModal.tsx | 374-400 | Fix Dose/Unit alignment with consistent label heights |
| CalculatorModal.tsx | 407-432 | Same alignment fix for reverse mode Dose/Unit |
| CalculatorModal.tsx | 189-215 | Fix handleAddToStack to use calculated BAC water in reverse mode |

