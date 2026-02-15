

# Comprehensive Calculator Input Audit & Terminology Fix

## Terminology: "Peptide Amount" vs "Vial Size"

After researching standard nomenclature across peptide reconstitution guides (PeptideFiles, Project Biohacking, SeekPeptides, Protide Health), "Vial Size" is by far the most commonly used term in community calculators. However, it's technically ambiguous because "vial size" could refer to the physical volume of the vial (e.g., 3mL vial vs 5mL vial).

**Recommendation: Keep "Peptide Amount"** in the in-app calculators. Here's why:
- It's more precise and less confusing for beginners
- The tooltip already clarifies: "The total mg of peptide in your vial, shown on the label"
- Your beta tester specifically flagged "Vial Size" as confusing, which validates this change
- The embed/SEO calculators can keep "Vial Size" since that's the term people search for online

For the marketing/embed calculators, keep "Vial Size (mg)" since that matches what people Google and is paired with clear context ("Step 1: Enter your vial size").

## Custom Input Bug: Remaining Locations

The fix you already applied to `CalculatorModal.tsx` and `AddCompoundScreen.tsx` (switching from `type="number"` to `type="text"` with `inputMode="decimal"` and regex validation, plus `isCustom` state tracking) was correct. However, **two embed calculators still have the original bug** where typing "10" on the way to "100" gets intercepted by the preset matching logic:

### 1. PeptideReconstitutionCalculatorEmbed.tsx
- **Vial Size "Other" input** (line 85): Uses `type="number"` and clears when value matches a preset
- **BAC Water "Other" input** (line 92): Same issue

### 2. OilMlCalculatorEmbed.tsx
- **Concentration "Other" input** (line 179-194): Uses `type="number"` and clears when value matches a preset

### Fix approach (same pattern as CalculatorModal fix):
1. Add `isCustom` state flags for each field with presets
2. Switch `type="number"` to `type="text"` with `inputMode="decimal"` and regex validation
3. Only show preset-selected state when `isCustom` is false
4. Only clear the "Other" field when not in custom mode

## Other Fields Audited (No Issues Found)

These fields are fine and don't need changes:
- **CalculatorModal.tsx**: Dose inputs (Standard, Reverse, mL) all use plain inputs without preset buttons, so no conflict
- **AddCompoundScreen.tsx**: Concentration (mg/mL) and IU Concentration are plain text inputs without presets
- **AddCompoundScreen.tsx**: Dose Amount is a plain number input
- Syringe Size in CalculatorModal uses buttons only (no custom text entry)

## Technical Summary

### Files to modify:
1. **src/components/embeds/PeptideReconstitutionCalculatorEmbed.tsx** - Add isCustom state tracking, switch to text+regex for Vial and BAC "Other" inputs
2. **src/components/embeds/OilMlCalculatorEmbed.tsx** - Add isCustom state tracking, switch to text+regex for Concentration "Other" input

### Files already correct (no changes needed):
- src/components/CalculatorModal.tsx (already fixed)
- src/components/AddCompoundScreen.tsx (already fixed)

### Terminology (no additional changes):
- CalculatorModal.tsx already says "Peptide Amount" (good)
- AddCompoundScreen.tsx already says "Peptide Amount (mg)" (good)
- Embed calculators keep "Vial Size (mg)" for SEO purposes (intentional)

