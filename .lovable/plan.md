
# Add CJC-1295/Ipamorelin Blend to Compound Catalog

## What's Changing

Adding "CJC-1295 / Ipamorelin" as a recognized blend in the autocomplete database. This is one of the most widely prescribed peptide combinations at compounding pharmacies and clinics, so it belongs in the official catalog.

The triple blend (CJC/IPA/Tesamorelin) will NOT be added at this time.

---

## Files to Update

### 1. `src/components/AddCompoundScreen.tsx`
Add `"CJC-1295 / Ipamorelin"` to the Blends and Stacks section (line ~149), alongside GLOW, KLOW, and other blends.

### 2. `src/components/onboarding/screens/MedicationSetupScreen.tsx`
Add `"CJC-1295 / Ipamorelin"` to the `ALL_COMPOUNDS` array in the Blends section (line ~82).

### 3. `src/utils/halfLifeData.ts`
Add a pharmacokinetic entry for the blend. Since blends typically use CJC-1295 without DAC (Mod GRF 1-29) paired with Ipamorelin, the half-life profile will reflect the no-DAC variant (~30 min half-life), with a note explaining the blend composition.

### 4. `MEDICATIONS_LIST.md`
Add the new blend to the Peptide Blends section for documentation.

---

## Technical Details

The half-life entry will look like:

```typescript
'cjc-1295 / ipamorelin': {
  halfLifeHours: 0.5,
  tMaxHours: 0.1,
  category: 'peptide',
  displayName: 'CJC-1295 / Ipamorelin',
  notes: 'Common blend using CJC-1295 (no DAC) + Ipamorelin'
},
```

This follows the existing pattern for blend entries and enables pharmacokinetic tracking (medication levels card) for users who add this compound.
