

# Quick Fixes: Calculator Field Order & Padding

## Overview
Two small improvements based on your review:
1. Add quick-select buttons for "Preferred Units" in reverse calculator mode
2. Fix padding on the Oil-Based helper text

## Changes

### 1. Add Quick Select Buttons for Preferred Units

**File**: `src/components/CalculatorModal.tsx`

**Current** (lines 435-448):
```jsx
<div className="space-y-2">
  <Label className="text-sm font-medium flex items-center gap-1.5">
    Preferred Units to Draw
    <InfoTooltip content="..." />
  </Label>
  <Input
    type="number"
    ...
    placeholder="e.g., 10"
    value={preferredUnits}
    ...
  />
</div>
```

**New**:
```jsx
<div className="space-y-2">
  <Label className="text-sm font-medium flex items-center gap-1.5">
    Preferred Units to Draw
    <InfoTooltip content="..." />
  </Label>
  <div className="flex gap-1.5 flex-wrap items-center">
    {[5, 10, 20, 25].map((units) => (
      <QuickSelectButton 
        key={units} 
        value={units} 
        currentValue={preferredUnits} 
        onSelect={setPreferredUnits}
        suffix="u"
      />
    ))}
    <Input
      type="number"
      inputMode="decimal"
      min="1"
      placeholder="Other"
      value={[5, 10, 20, 25].includes(Number(preferredUnits)) ? '' : preferredUnits}
      onChange={(e) => handlePositiveInput(e.target.value, setPreferredUnits, 1)}
      className="w-16 h-8 text-xs px-2"
    />
  </div>
</div>
```

This matches the UX pattern used for Vial Size and BAC Water — quick buttons plus an "Other" input for custom values.

---

### 2. Fix Oil-Based Helper Text Padding

**File**: `src/components/CalculatorModal.tsx`

**Current** (line 530-531):
```jsx
<p className="text-xs text-muted-foreground -mt-2">
  For oil-based compounds (testosterone, etc.)
</p>
```

**Change**: Remove the negative margin `-mt-2` and replace with `mt-1` to add a small gap from the top of the content area:

```jsx
<p className="text-xs text-muted-foreground">
  For oil-based compounds (testosterone, etc.)
</p>
```

The `space-y-4` on the parent div will handle spacing between elements. Removing `-mt-2` gives proper breathing room from the border.

---

## Summary of Input Order Validation

| Calculator | Current Order | Assessment |
|------------|--------------|------------|
| Standard | Mode → Vial → BAC Water → Dose → Syringe → Result | Correct |
| Reverse | Mode → Vial → Dose → Preferred Units → Syringe → Result | Correct |
| Oil-Based | Concentration → Dose → Result | Correct |

All field orders follow logical user mental models — you input what you have, then what you want, then get the result.

