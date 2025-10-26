# Comprehensive Calculator Testing Plan

## CRITICAL: Medication Calculation Accuracy

This document provides exhaustive test cases for the IU and mL calculators. **All calculations must be verified before launch** as errors could lead to dangerous dosing mistakes.

---

## Understanding the IU Calculator

### What it calculates:
The IU calculator converts your peptide dose to **syringe units** on a standard 100-unit insulin syringe.

### Formula:
1. **Concentration** = Vial Size (in mcg) ÷ BAC Water (mL)
   - Example: 10mg (10,000 mcg) in 2mL = 5,000 mcg/mL
   
2. **Volume needed** = Dose (in mcg) ÷ Concentration (mcg/mL)
   - Example: 250 mcg ÷ 5,000 mcg/mL = 0.05 mL
   
3. **Syringe units** = Volume (mL) × 100
   - Example: 0.05 mL × 100 = **5 units** on insulin syringe

---

## Test Cases: IU Calculator

### Test Group 1: Basic Calculations (MUST PASS)

#### Test 1.1: Standard Peptide Dose
**Setup:**
- Dose: 250 mcg
- Peptide Amount: 10 mg
- BAC Water: 2 mL

**Expected Result:**
- Concentration: 5,000 mcg/mL
- Volume: 0.05 mL
- **Syringe Units: 5 units**
- Warning: "⚠️ Small dose - ensure accurate measurement"

**Manual Verification:**
```
10mg = 10,000 mcg
Concentration = 10,000 ÷ 2 = 5,000 mcg/mL
Volume = 250 ÷ 5,000 = 0.05 mL
Units = 0.05 × 100 = 5 units ✓
```

#### Test 1.2: Different Vial Size
**Setup:**
- Dose: 500 mcg
- Peptide Amount: 5 mg
- BAC Water: 1 mL

**Expected Result:**
- Concentration: 5,000 mcg/mL
- Volume: 0.10 mL
- **Syringe Units: 10 units**
- No warning (safe range)

**Manual Verification:**
```
5mg = 5,000 mcg
Concentration = 5,000 ÷ 1 = 5,000 mcg/mL
Volume = 500 ÷ 5,000 = 0.10 mL
Units = 0.10 × 100 = 10 units ✓
```

#### Test 1.3: Larger Dose
**Setup:**
- Dose: 1,000 mcg (or 1 mg)
- Peptide Amount: 10 mg
- BAC Water: 2 mL

**Expected Result:**
- Concentration: 5,000 mcg/mL
- Volume: 0.20 mL
- **Syringe Units: 20 units**
- No warning

**Manual Verification:**
```
If dose is 1mg: 1mg = 1,000 mcg
If dose is 1000mcg: already in mcg
Concentration = 10,000 ÷ 2 = 5,000 mcg/mL
Volume = 1,000 ÷ 5,000 = 0.20 mL
Units = 0.20 × 100 = 20 units ✓
```

---

### Test Group 2: Edge Cases - Small Doses

#### Test 2.1: Very Small Dose
**Setup:**
- Dose: 50 mcg
- Peptide Amount: 10 mg
- BAC Water: 5 mL

**Expected Result:**
- Concentration: 2,000 mcg/mL
- Volume: 0.025 mL
- **Syringe Units: 2.5 units**
- Warning: "⚠️ Small dose - ensure accurate measurement"

#### Test 2.2: Tiny Dose (Under 1 unit)
**Setup:**
- Dose: 10 mcg
- Peptide Amount: 10 mg
- BAC Water: 5 mL

**Expected Result:**
- Concentration: 2,000 mcg/mL
- Volume: 0.005 mL
- **Syringe Units: 0.5 units**
- Warning: "⚠️ Very small dose - consider using more BAC water or smaller vial size"

---

### Test Group 3: Edge Cases - Large Doses

#### Test 3.1: Large But Valid Dose
**Setup:**
- Dose: 2,000 mcg (2 mg)
- Peptide Amount: 10 mg
- BAC Water: 2 mL

**Expected Result:**
- Concentration: 5,000 mcg/mL
- Volume: 0.40 mL
- **Syringe Units: 40 units**
- No warning (within safe range)

#### Test 3.2: Very Large Dose (Warning Zone)
**Setup:**
- Dose: 3,000 mcg (3 mg)
- Peptide Amount: 10 mg
- BAC Water: 2 mL

**Expected Result:**
- Concentration: 5,000 mcg/mL
- Volume: 0.60 mL
- **Syringe Units: 60 units**
- Warning: "⚠️ Large dose - please double-check your inputs"

#### Test 3.3: Near Syringe Limit
**Setup:**
- Dose: 4,000 mcg (4 mg)
- Peptide Amount: 10 mg
- BAC Water: 2 mL

**Expected Result:**
- Concentration: 5,000 mcg/mL
- Volume: 0.80 mL
- **Syringe Units: 80 units**
- Warning: "⚠️ Large dose - close to syringe limit"

#### Test 3.4: Exceeds Syringe Capacity (ERROR)
**Setup:**
- Dose: 6,000 mcg (6 mg)
- Peptide Amount: 10 mg
- BAC Water: 2 mL

**Expected Result:**
- Concentration: 5,000 mcg/mL
- Volume: 1.20 mL
- **Syringe Units: 120 units**
- Error (red): "❌ Exceeds 100-unit syringe capacity - use less BAC water or smaller vial"
- **User must adjust their inputs**

---

### Test Group 4: Unit Conversions

#### Test 4.1: Dose in mg (instead of mcg)
**Setup:**
- Dose: 0.5 mg (note: mg selected as unit)
- Peptide Amount: 10 mg
- BAC Water: 2 mL

**Expected Result:**
- Internal conversion: 0.5 mg = 500 mcg
- Concentration: 5,000 mcg/mL
- Volume: 0.10 mL
- **Syringe Units: 10 units**

#### Test 4.2: Vial in mcg (instead of mg)
**Setup:**
- Dose: 500 mcg
- Peptide Amount: 5,000 mcg (note: if vial unit is mcg)
- BAC Water: 1 mL

**Expected Result:**
- Concentration: 5,000 mcg/mL
- Volume: 0.10 mL
- **Syringe Units: 10 units**

---

### Test Group 5: Invalid Inputs (Guardrails)

#### Test 5.1: Missing Dose
**Setup:**
- Dose: (empty)
- Peptide Amount: 10 mg
- BAC Water: 2 mL

**Expected Result:**
- No calculation shown
- No error message (just empty result)

#### Test 5.2: Missing Peptide Amount
**Setup:**
- Dose: 250 mcg
- Peptide Amount: (empty)
- BAC Water: 2 mL

**Expected Result:**
- No calculation shown

#### Test 5.3: Missing BAC Water
**Setup:**
- Dose: 250 mcg
- Peptide Amount: 10 mg
- BAC Water: (empty)

**Expected Result:**
- No calculation shown

#### Test 5.4: Zero Values
**Setup:**
- Dose: 0 mcg
- Peptide Amount: 10 mg
- BAC Water: 2 mL

**Expected Result:**
- No calculation shown (null result)

#### Test 5.5: Negative Values
**Setup:**
- Dose: -250 mcg
- Peptide Amount: 10 mg
- BAC Water: 2 mL

**Expected Result:**
- Should be prevented by input validation (number inputs don't allow negatives)
- If somehow entered: null result

#### Test 5.6: Non-numeric Values
**Setup:**
- Dose: "abc" mcg
- Peptide Amount: 10 mg
- BAC Water: 2 mL

**Expected Result:**
- parseFloat returns NaN
- Validation catches it: null result

---

### Test Group 6: Real-World Scenarios

#### Test 6.1: Semaglutide Starting Dose
**Setup:**
- Dose: 250 mcg (0.25 mg)
- Peptide Amount: 5 mg
- BAC Water: 2 mL

**Expected Result:**
- Concentration: 2,500 mcg/mL
- Volume: 0.10 mL
- **Syringe Units: 10 units**

#### Test 6.2: BPC-157 Standard Dose
**Setup:**
- Dose: 500 mcg
- Peptide Amount: 10 mg
- BAC Water: 2 mL

**Expected Result:**
- Concentration: 5,000 mcg/mL
- Volume: 0.10 mL
- **Syringe Units: 10 units**

#### Test 6.3: CJC-1295 with DAC
**Setup:**
- Dose: 2,000 mcg (2 mg)
- Peptide Amount: 5 mg
- BAC Water: 1 mL

**Expected Result:**
- Concentration: 5,000 mcg/mL
- Volume: 0.40 mL
- **Syringe Units: 40 units**

#### Test 6.4: HGH Fragment 176-191
**Setup:**
- Dose: 250 mcg
- Peptide Amount: 5 mg
- BAC Water: 3 mL

**Expected Result:**
- Concentration: 1,666.67 mcg/mL
- Volume: 0.15 mL
- **Syringe Units: 15 units**

---

### Test Group 7: Decimal Precision

#### Test 7.1: Result with Decimal
**Setup:**
- Dose: 375 mcg
- Peptide Amount: 10 mg
- BAC Water: 2 mL

**Expected Result:**
- Concentration: 5,000 mcg/mL
- Volume: 0.075 mL
- **Syringe Units: 7.5 units**
- Display should show "7.5 units" (not "7" or "8")

#### Test 7.2: Rounding Test
**Setup:**
- Dose: 333 mcg
- Peptide Amount: 10 mg
- BAC Water: 2 mL

**Expected Result:**
- Concentration: 5,000 mcg/mL
- Volume: 0.0666 mL
- **Syringe Units: 6.7 units** (rounded to 1 decimal)
- Not 6.66 or 6.666

---

## Test Cases: mL Calculator

### Test Group 8: Oil-Based Compound Calculations

#### Test 8.1: Testosterone Cypionate 200mg/mL
**Setup:**
- Dose: 200 mg
- Concentration: 200 mg/mL

**Expected Result:**
- **Volume: 1.0 mL** (or just "1")

#### Test 8.2: Testosterone Enanthate 250mg/mL
**Setup:**
- Dose: 500 mg
- Concentration: 250 mg/mL

**Expected Result:**
- **Volume: 2.0 mL** (or "2")

#### Test 8.3: Small Dose
**Setup:**
- Dose: 50 mg
- Concentration: 200 mg/mL

**Expected Result:**
- **Volume: 0.25 mL**
- No warning

#### Test 8.4: Very Small Volume
**Setup:**
- Dose: 10 mg
- Concentration: 200 mg/mL

**Expected Result:**
- **Volume: 0.05 mL**
- Warning: "⚠️ Very small volume - difficult to measure accurately"

#### Test 8.5: Large Volume
**Setup:**
- Dose: 800 mg
- Concentration: 200 mg/mL

**Expected Result:**
- **Volume: 4.0 mL**
- Warning: "⚠️ Large volume - verify your concentration"

---

## Test Group 9: Cross-Unit Compatibility

#### Test 9.1: IU Calculator Not Available for mL Unit
**Setup:**
- Dose Unit: mL

**Expected Result:**
- IU calculator button should NOT be visible
- Only dose amount input shown

#### Test 9.2: IU Calculator Not Available for Pill Unit
**Setup:**
- Dose Unit: pill

**Expected Result:**
- IU calculator button should NOT be visible

#### Test 9.3: mL Calculator Only for mg
**Setup:**
- Dose Unit: mcg

**Expected Result:**
- mL calculator button should NOT be visible
- Only IU calculator available

---

## Test Group 10: State Persistence

#### Test 10.1: Switching Between Calculators
**Setup:**
1. Open IU calculator
2. Enter values: 250 mcg, 10 mg, 2 mL
3. Close IU calculator
4. Switch dose unit to mg
5. Open mL calculator
6. Enter concentration: 200 mg/mL
7. Switch back to mcg
8. Reopen IU calculator

**Expected Result:**
- IU calculator should remember previous values
- No cross-contamination between calculators

#### Test 10.2: Unit Switching Clears Calculator
**Setup:**
1. Dose unit: mcg
2. Open IU calculator
3. Change dose unit to "pill"

**Expected Result:**
- IU calculator should close/hide
- No calculation shown

---

## Validation Checklist

### Before Launch: Manual Verification

- [ ] Test all 10 test groups above
- [ ] Verify calculations with independent calculator
- [ ] Test on multiple devices (iOS, Android, Web)
- [ ] Verify all warnings display correctly
- [ ] Confirm red error states prevent bad calculations
- [ ] Test with decimal inputs (0.5, 1.25, etc.)
- [ ] Test with very large numbers (10000+)
- [ ] Test rapid input changes
- [ ] Verify calculation breakdown shows correct values
- [ ] Test calculator state when switching between compounds

### Code Review Checklist

- [x] All parseFloat() calls have NaN checks
- [x] All calculations check for positive numbers
- [x] All calculations check for isFinite()
- [x] Division by zero is impossible (denominator validated)
- [x] Results are rounded appropriately (1 decimal for IU, 2 for mL)
- [x] No auto-population that could override user input
- [x] Calculator only shows when appropriate units selected
- [x] Warning thresholds are medically appropriate
- [x] Error states clearly marked (red) vs warnings (yellow)
- [x] Medical disclaimers present and visible

### User Safety Checks

- [x] Cannot exceed 100-unit syringe capacity without error
- [x] Very small doses (<1 unit) show warning
- [x] Very large volumes (>3 mL) show warning
- [x] Calculation breakdown shown for transparency
- [x] Clear disclaimer to verify calculations
- [x] Invalid inputs return null (not error values)

---

## Common User Mistakes to Guard Against

### Mistake 1: Confusing mg and mcg
**Protection:** Clear unit labels, calculator shows conversion

### Mistake 2: Using wrong concentration
**Protection:** mL calculator requires manual concentration entry, shows warning for large volumes

### Mistake 3: Exceeding syringe capacity
**Protection:** Hard error (red) when >100 units, suggests corrective action

### Mistake 4: Empty/zero inputs
**Protection:** No calculation shown, no confusing "0" or "NaN" displayed

### Mistake 5: Dose in wrong unit
**Protection:** Dose unit selector right next to dose input, calculator converts appropriately

---

## Testing Workflow

1. **Start with Test Group 1** - Ensure basic calculations work perfectly
2. **Test all edge cases** - Groups 2-5
3. **Real-world scenarios** - Group 6
4. **Precision tests** - Group 7
5. **mL calculator** - Group 8
6. **Integration tests** - Groups 9-10
7. **Manual spot checks** - Pick random scenarios and verify with external calculator

---

## Sign-Off

Before launching to production:

- [ ] All test groups passed
- [ ] Manual verification completed
- [ ] Beta testers verified on real devices
- [ ] Medical advisor reviewed calculations (if available)
- [ ] Legal disclaimer confirmed in UI
- [ ] Documentation updated

**Test Date:** _____________

**Tested By:** _____________

**Approved By:** _____________
