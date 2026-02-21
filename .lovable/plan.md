

# Update HealthKit Spec + Native Splash Screen Guidance

## Part 1: Expand Health Metrics in HEALTHKIT_INTEGRATION_SPEC.md

Update the spec document to replace Steps with a broader set of health metrics relevant to the app's user base (GLP-1 users, bodybuilders, peptide users).

### Metrics to Include

| Metric | Category Key | HealthKit ID | Health Connect Type | Why |
|--------|-------------|--------------|-------------------|-----|
| Weight | `weight` | `bodyMass` | `WeightRecord` | Core metric, already supported |
| Body Fat % | `body_fat` | `bodyFatPercentage` | `BodyFatRecord` | Body recomp tracking |
| Lean Body Mass | `lean_mass` | `leanBodyMass` | `LeanBodyMassRecord` | Muscle growth tracking for bodybuilders |
| Sleep | `sleep` | `sleepAnalysis` | `SleepSessionRecord` | Replace manual sleep logging with auto-sync |
| Resting Heart Rate | `resting_hr` | `restingHeartRate` | `RestingHeartRateRecord` | Peptide/cardio effect monitoring |
| Heart Rate Variability | `hrv` | `heartRateVariabilitySDNN` | `HeartRateVariabilityRmssdRecord` | Recovery and stress indicator |

### What Changes in the Spec

1. **Section 5 (iOS Config)**: Update `Info.plist` usage description to mention heart rate and sleep data
2. **Section 6 (Android Config)**: Add `READ_HEART_RATE`, `READ_SLEEP`, `READ_LEAN_BODY_MASS` permissions
3. **Section 7 (React Hook)**: Replace `readSteps()` with `readLeanBodyMass()`, `readSleep()`, `readRestingHeartRate()`, `readHRV()`
4. **Section 10 (Database)**: Update category examples to include the new metric types
5. **Section 11 (Prompts)**: Update copy-paste prompts 2-5 to reference the expanded metric set
6. **Prompt 3 specifically**: The hook should now export readers for all 6 metrics instead of 3

### NOT Including
- **BMI**: Calculated locally from weight + height (already in `profiles` table)
- **Steps**: Not relevant to the app's core use case (medication/supplement tracking)
- **Active Energy**: Same reasoning as steps

---

## Part 2: Add Native Splash Screen Section to Spec

Add a new **Section 12** to `HEALTHKIT_INTEGRATION_SPEC.md` (or a separate doc) covering the native animated splash screen, since the user will already be working in Cursor.

### Current State
- `LaunchScreen.storyboard` shows a static `Splash` image (1366x1366)
- Capacitor `SplashScreen` plugin configured with `launchShowDuration: 400` and `launchAutoHide: false`
- The JS-side `Splash.tsx` page handles routing logic but has no visual animation — just a pulsing logo and spinner

### What the Spec Will Recommend

**Option A (Simpler — Recommended First):**
- Replace the static splash image with a properly branded one (black background, Regimen logo centered, wordmark below)
- This requires only updating the image assets in `ios/App/App/Assets.xcassets/Splash.imageset/` and `android/app/src/main/res/`
- No code changes needed

**Option B (Premium — Lottie Animation):**
- Install `lottie-ios` via CocoaPods and `lottie-react-native` or a Capacitor Lottie plugin
- Create a custom launch view controller that plays a Lottie animation (logo scales in, wordmark fades up)
- Replace `LaunchScreen.storyboard` approach with a programmatic splash
- This is more complex but gives the "premium app" feel

### Cursor Prompts to Include

Prompt for Option A:
```
I need to update my iOS splash screen. Replace the images in 
ios/App/App/Assets.xcassets/Splash.imageset/ with a properly 
branded version. The splash should have a solid black (#000000) 
background with the Regimen logo centered. The source logo is 
at src/assets/regimen-wordmark-transparent.png. Generate 1x 
(1024x1024), 2x (2048x2048), and 3x (3072x3072) versions.
```

---

## Part 3: Micro-Animations (Lovable-Side Enhancements)

These are things that can be done in Lovable after the HealthKit work, to make the app feel more polished:

- Tab transition animations (cross-fade between Today/Stack/Progress)
- Card entrance animations on scroll (staggered fade-in)
- Metric log success animation (checkmark draw + haptic)
- Pull-to-refresh spring physics refinement

These do NOT need to go in the spec — they're Lovable tasks for a future session.

---

## Summary of File Changes

| File | Change |
|------|--------|
| `HEALTHKIT_INTEGRATION_SPEC.md` | Expand metrics (replace Steps with Sleep, Lean Mass, Resting HR, HRV). Update Sections 5, 6, 7, 10, 11. Add Section 12 for native splash screen. |

## Technical Notes

- All new HealthKit identifiers are read-only (no write permissions needed for HR/HRV/Sleep)
- Sleep data from HealthKit comes as time intervals (in-bed, asleep, awake stages) — the hook will need to calculate total sleep hours from the sleep analysis samples
- HRV uses the SDNN measurement on iOS and RMSSD on Android — the spec will note this difference
- The `progress_entries` table needs no schema changes; the `metrics` JSONB field handles all new data types
- The unique index `(user_id, entry_date, category)` covers all new categories

