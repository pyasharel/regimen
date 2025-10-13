# IU Calculator - Comprehensive Test Cases

## Purpose
This document validates the IU calculator accuracy across all possible input combinations to ensure medical-grade precision.

## Formula Reference

### For IU Vials (e.g., Insulin)
```
Concentration (IU/ml) = Vial Amount (IU) / BAC Water (ml)
Volume Needed (ml) = Desired Dose (IU) / Concentration (IU/ml)
Syringe Units = Volume Needed (ml) × 100
```

### For Weight-Based Vials (mg/mcg peptides)
```
Vial in mcg = Vial Amount (mg) × 1000  OR  Vial Amount (mcg)
Concentration (mcg/ml) = Vial in mcg / BAC Water (ml)
Dose in mcg = Dose Amount (mg) × 1000  OR  Dose Amount (mcg)
Volume Needed (ml) = Dose in mcg / Concentration (mcg/ml)
Syringe Units = Volume Needed (ml) × 100
```

## Test Cases

### Category 1: IU Vials with IU Doses (e.g., Insulin)

#### Test 1.1
- **Vial:** 20 IU
- **BAC Water:** 3 ml
- **Desired Dose:** 2 IU
- **Calculation:** 
  - Concentration: 20/3 = 6.67 IU/ml
  - Volume: 2/6.67 = 0.3 ml
  - **Expected Result:** 30.0 units

#### Test 1.2
- **Vial:** 100 IU
- **BAC Water:** 1 ml
- **Desired Dose:** 10 IU
- **Calculation:** 
  - Concentration: 100/1 = 100 IU/ml
  - Volume: 10/100 = 0.1 ml
  - **Expected Result:** 10.0 units

#### Test 1.3
- **Vial:** 40 IU
- **BAC Water:** 2 ml
- **Desired Dose:** 5 IU
- **Calculation:** 
  - Concentration: 40/2 = 20 IU/ml
  - Volume: 5/20 = 0.25 ml
  - **Expected Result:** 25.0 units

#### Test 1.4 (Edge Case - Small Dose)
- **Vial:** 20 IU
- **BAC Water:** 3 ml
- **Desired Dose:** 0.02 IU
- **Calculation:** 
  - Concentration: 20/3 = 6.67 IU/ml
  - Volume: 0.02/6.67 = 0.003 ml
  - **Expected Result:** 0.3 units
  - **Warning:** ⚠️ Very small dose - consider using more BAC water

#### Test 1.5 (Edge Case - Large Dose)
- **Vial:** 20 IU
- **BAC Water:** 1 ml
- **Desired Dose:** 15 IU
- **Calculation:** 
  - Concentration: 20/1 = 20 IU/ml
  - Volume: 15/20 = 0.75 ml
  - **Expected Result:** 75.0 units
  - **Warning:** ⚠️ Large dose - please double-check

### Category 2: Weight-Based Vials (mg) with mcg Doses

#### Test 2.1
- **Vial:** 10 mg
- **BAC Water:** 2 ml
- **Desired Dose:** 250 mcg
- **Calculation:** 
  - Vial: 10 × 1000 = 10,000 mcg
  - Concentration: 10,000/2 = 5,000 mcg/ml
  - Volume: 250/5,000 = 0.05 ml
  - **Expected Result:** 5.0 units

#### Test 2.2
- **Vial:** 5 mg
- **BAC Water:** 1 ml
- **Desired Dose:** 500 mcg
- **Calculation:** 
  - Vial: 5 × 1000 = 5,000 mcg
  - Concentration: 5,000/1 = 5,000 mcg/ml
  - Volume: 500/5,000 = 0.1 ml
  - **Expected Result:** 10.0 units

#### Test 2.3
- **Vial:** 15 mg
- **BAC Water:** 3 ml
- **Desired Dose:** 1000 mcg
- **Calculation:** 
  - Vial: 15 × 1000 = 15,000 mcg
  - Concentration: 15,000/3 = 5,000 mcg/ml
  - Volume: 1000/5,000 = 0.2 ml
  - **Expected Result:** 20.0 units

#### Test 2.4
- **Vial:** 20 mg
- **BAC Water:** 5 ml
- **Desired Dose:** 300 mcg
- **Calculation:** 
  - Vial: 20 × 1000 = 20,000 mcg
  - Concentration: 20,000/5 = 4,000 mcg/ml
  - Volume: 300/4,000 = 0.075 ml
  - **Expected Result:** 7.5 units

### Category 3: Weight-Based Vials (mg) with mg Doses

#### Test 3.1
- **Vial:** 10 mg
- **BAC Water:** 2 ml
- **Desired Dose:** 0.25 mg
- **Calculation:** 
  - Vial: 10 × 1000 = 10,000 mcg
  - Dose: 0.25 × 1000 = 250 mcg
  - Concentration: 10,000/2 = 5,000 mcg/ml
  - Volume: 250/5,000 = 0.05 ml
  - **Expected Result:** 5.0 units

#### Test 3.2
- **Vial:** 5 mg
- **BAC Water:** 1 ml
- **Desired Dose:** 0.5 mg
- **Calculation:** 
  - Vial: 5 × 1000 = 5,000 mcg
  - Dose: 0.5 × 1000 = 500 mcg
  - Concentration: 5,000/1 = 5,000 mcg/ml
  - Volume: 500/5,000 = 0.1 ml
  - **Expected Result:** 10.0 units

### Category 4: Weight-Based Vials (mcg) with mcg Doses

#### Test 4.1
- **Vial:** 5000 mcg
- **BAC Water:** 2 ml
- **Desired Dose:** 250 mcg
- **Calculation:** 
  - Concentration: 5000/2 = 2,500 mcg/ml
  - Volume: 250/2,500 = 0.1 ml
  - **Expected Result:** 10.0 units

#### Test 4.2
- **Vial:** 10000 mcg
- **BAC Water:** 3 ml
- **Desired Dose:** 500 mcg
- **Calculation:** 
  - Concentration: 10,000/3 = 3,333.33 mcg/ml
  - Volume: 500/3,333.33 = 0.15 ml
  - **Expected Result:** 15.0 units

### Category 5: Invalid Combinations (Should Return NULL)

#### Test 5.1
- **Vial:** 20 IU
- **BAC Water:** 3 ml
- **Desired Dose:** 250 mcg
- **Expected Result:** NULL (cannot convert IU vial to mcg dose)

#### Test 5.2
- **Vial:** 10 mg
- **BAC Water:** 2 ml
- **Desired Dose:** 5 IU
- **Expected Result:** NULL (cannot convert mg vial to IU dose)

#### Test 5.3
- **Vial:** 10 mg
- **BAC Water:** 2 ml
- **Desired Dose:** 2 pills
- **Expected Result:** NULL (calculator doesn't apply to pills)

### Category 6: Edge Cases - Warnings

#### Test 6.1 - Very Small Dose
- **Vial:** 10 mg
- **BAC Water:** 1 ml
- **Desired Dose:** 10 mcg
- **Calculation:** 
  - Vial: 10,000 mcg
  - Concentration: 10,000/1 = 10,000 mcg/ml
  - Volume: 10/10,000 = 0.001 ml
  - **Expected Result:** 0.1 units
  - **Warning:** ⚠️ Very small dose - consider using more BAC water

#### Test 6.2 - Exceeds Syringe
- **Vial:** 5 mg
- **BAC Water:** 1 ml
- **Desired Dose:** 6 mg
- **Calculation:** 
  - Vial: 5,000 mcg
  - Dose: 6,000 mcg
  - Concentration: 5,000/1 = 5,000 mcg/ml
  - Volume: 6,000/5,000 = 1.2 ml
  - **Expected Result:** 120.0 units
  - **Warning:** ⚠️ Exceeds syringe capacity

#### Test 6.3 - Large Dose
- **Vial:** 10 mg
- **BAC Water:** 2 ml
- **Desired Dose:** 3 mg
- **Calculation:** 
  - Vial: 10,000 mcg
  - Dose: 3,000 mcg
  - Concentration: 10,000/2 = 5,000 mcg/ml
  - Volume: 3,000/5,000 = 0.6 ml
  - **Expected Result:** 60.0 units
  - **Warning:** ⚠️ Large dose - please double-check

## Testing Procedure

1. For each test case, input the values exactly as specified
2. Verify the calculated result matches the expected result
3. Check that appropriate warnings appear when specified
4. Confirm NULL results for invalid combinations

## Warning Thresholds

- **< 2 units:** "Very small dose - consider using more BAC water"
- **> 50 units:** "Large dose - please double-check"
- **> 100 units:** "Exceeds syringe capacity"

## Notes

- All calculations use a 100-unit insulin syringe (1ml = 100 units)
- Results are rounded to 1 decimal place
- The calculator prevents mixing incompatible units (IU ↔ mg/mcg)
- Users should always verify calculations independently - this is not medical advice
