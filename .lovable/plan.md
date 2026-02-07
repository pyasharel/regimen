

# Add Missing Compounds: GLOW, KLOW, Proviron, Telmisartan + Sync

## Summary
Add missing compounds reported by user Cosmin (GLOW, KLOW, Proviron, Telmisartan) and sync compounds that exist in `halfLifeData.ts` but are missing from the autocomplete lists.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/AddCompoundScreen.tsx` | Add new compounds to `COMMON_PEPTIDES` array |
| `src/components/onboarding/screens/MedicationSetupScreen.tsx` | Add same compounds to `ALL_COMPOUNDS` array |
| `src/utils/halfLifeData.ts` | Add half-life data for GLOW, KLOW, Telmisartan |
| `MEDICATIONS_LIST.md` | Update documentation with new compounds |

---

## Compounds to Add

### User-Requested (from Cosmin)
| Compound | Category | Half-Life | Notes |
|----------|----------|-----------|-------|
| **GLOW** | Peptide Blend | ~4h average | BPC-157 + GHK-Cu + Thymosin Beta-4 |
| **KLOW** | Peptide Blend | ~4h average | BPC-157 + TB-500 + KPV + GHK-Cu |
| **Proviron** | Steroid | 12h | Already in halfLifeData, missing from autocomplete |
| **Telmisartan** | Blood Pressure | 24h | ARB medication, popular in TRT community |

### Sync from halfLifeData.ts (missing from autocomplete)
| Compound | Category | Already Has Half-Life Data |
|----------|----------|---------------------------|
| **Halotestin** | Steroid | Yes (9h) |
| **Superdrol** | Steroid | Yes (8h) |
| **Turinabol** | Steroid | Yes (16h) |
| **Mesterolone** | Steroid | Add as alias for Proviron |
| **Fluoxymesterone** | Steroid | Add as alias for Halotestin |
| **Methasterone** | Steroid | Add as alias for Superdrol |
| **Chlorodehydromethyltestosterone** | Steroid | Add as alias for Turinabol (scientific name) |

---

## Implementation Details

### 1. Update COMMON_PEPTIDES in AddCompoundScreen.tsx

Add to the **Blends and Stacks** section:
```typescript
// Blends and Stacks
"Wolverine Stack", "GHK-Cu + BPC-157 Blend", "GLOW", "KLOW"
```

Add to the **Anabolic Steroids** section:
```typescript
"Proviron", "Mesterolone", "Halotestin", "Fluoxymesterone", 
"Superdrol", "Methasterone", "Turinabol", "Chlorodehydromethyltestosterone"
```

Add to the **Health & Metabolic** section:
```typescript
"Telmisartan"
```

### 2. Update ALL_COMPOUNDS in MedicationSetupScreen.tsx

Add the same compounds in their respective categories:
- GLOW, KLOW in peptide blends
- Proviron, Halotestin, Superdrol, Turinabol in steroids
- Telmisartan in health/metabolic

### 3. Add Half-Life Data for New Compounds

```typescript
// GLOW Peptide Blend
'glow': {
  halfLifeHours: 4, // Average of BPC-157 (~5h), GHK-Cu (~5h), Thymosin Beta-4 (~2h)
  tMaxHours: 0.5,
  category: 'peptide',
  displayName: 'GLOW',
  notes: 'Blend: BPC-157 + GHK-Cu + Thymosin Beta-4'
}

// KLOW Peptide Blend
'klow': {
  halfLifeHours: 4, // Average of BPC-157 (~5h), TB-500 (~2h), KPV (~4h), GHK-Cu (~5h)
  tMaxHours: 0.5,
  category: 'peptide',
  displayName: 'KLOW',
  notes: 'Blend: BPC-157 + TB-500 + KPV + GHK-Cu'
}

// Telmisartan
'telmisartan': {
  halfLifeHours: 24, // FDA label
  tMaxHours: 1,
  category: 'other',
  displayName: 'Telmisartan',
  notes: 'Micardis - ARB blood pressure medication'
}
```

### 4. Update MEDICATIONS_LIST.md

Add new entries to the documentation under appropriate categories.

---

## Deployment Note

After these changes are published:
- **Web users**: Will see new compounds immediately
- **iOS/Android users**: Will need to download an app update from the App Store/Play Store

This is due to the static compound list architecture (compounds are hardcoded in the frontend bundle, not fetched from the database).

