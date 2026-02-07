

# Add SARMs, Fat Loss Compounds & Enclomiphene

## Summary
Add the remaining compounds from Cosmin's suggestions (excluding DNP for safety reasons).

---

## Compounds to Add

### SARMs (Selective Androgen Receptor Modulators)
| Compound | Half-Life | Notes |
|----------|-----------|-------|
| LGD-4033 / Ligandrol | 30h | Popular muscle/strength SARM |
| RAD-140 / Testolone | 60h | Strong muscle/strength SARM |
| Ostarine / MK-2866 / Enobosarm | 24h | Mild, widely used SARM |
| YK-11 | 8h | Myostatin inhibitor |
| Andarine / S4 | 4h | Cutting SARM |

### Fat Loss & Endurance
| Compound | Half-Life | Notes |
|----------|-----------|-------|
| Clenbuterol | 36h | Beta-2 agonist thermogenic |
| Salbutamol / Albuterol | 5h | Shorter-acting beta-2 agonist |
| Cardarine / GW-501516 | 20h | PPAR-delta agonist for endurance |
| Stenabolic / SR9009 | 4h | Rev-ErbA agonist |
| AICAR | 2h | AMPK activator |

### PCT
| Compound | Half-Life | Notes |
|----------|-----------|-------|
| Enclomiphene | 10h | Pure trans-isomer of Clomid |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/AddCompoundScreen.tsx` | Add SARMs, fat loss compounds, Enclomiphene to COMMON_PEPTIDES |
| `src/components/onboarding/screens/MedicationSetupScreen.tsx` | Add same compounds to ALL_COMPOUNDS |
| `src/utils/halfLifeData.ts` | Add half-life data for all new compounds |
| `MEDICATIONS_LIST.md` | Update documentation with new categories |

---

## Implementation Details

### 1. AddCompoundScreen.tsx - Add new sections

```typescript
// After PCT section, add:
// SARMs (Selective Androgen Receptor Modulators)
"LGD-4033", "Ligandrol", "RAD-140", "Testolone", 
"Ostarine", "MK-2866", "Enobosarm",
"YK-11", "Andarine", "S4",

// Fat Loss & Endurance
"Clenbuterol", "Salbutamol", "Albuterol",
"Cardarine", "GW-501516", "Stenabolic", "SR9009", "AICAR",

// Add to PCT section:
"Enclomiphene"
```

### 2. MedicationSetupScreen.tsx - Add to onboarding

```typescript
// SARMs
"LGD-4033", "RAD-140", "Ostarine", "MK-2866", "YK-11", "Andarine",

// Fat Loss & Endurance
"Clenbuterol", "Salbutamol", "Cardarine", "GW-501516", "Stenabolic", "SR9009",

// Add to PCT:
"Enclomiphene"
```

### 3. halfLifeData.ts - Add pharmacokinetic data

All compounds will get proper half-life entries with:
- `halfLifeHours` (from research literature)
- `tMaxHours` (time to peak)
- `category` (sarm, other, pct)
- `displayName` and `notes` for aliases

### 4. MEDICATIONS_LIST.md - Add new sections

- New "SARMs" section
- New "Fat Loss & Endurance" section
- Add Enclomiphene to PCT section

---

## Excluded Compound

**DNP (2,4-Dinitrophenol)** - Excluded due to:
- Narrow therapeutic window (fatal overdose risk)
- Multiple documented deaths
- Potential legal/liability concerns for the app

Cosmin can add it as a custom compound if he really wants to track it.

---

## Deployment Note

After publishing:
- **Web users**: See changes immediately
- **iOS/Android users**: Need app store update

