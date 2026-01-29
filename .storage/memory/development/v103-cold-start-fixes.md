# Memory: development/v103-cold-start-fixes
Updated: 2025-01-29

## Critical Fixes in v1.0.3 (Build 18)

### 1. RevenueCat Attribute Naming Constraint
**Issue**: Setting `$countryCode` as a custom RevenueCat attribute caused a BackendError (code 0) on iOS, blocking subscription initialization and hanging the app on cold start.

**Root Cause**: RevenueCat reserves the `$` prefix for its own special attributes.

**Fix**: Changed `$countryCode` to `country_code` in `src/contexts/SubscriptionContext.tsx`. All custom attributes must use regular naming without the `$` prefix.

**Key Code Change**:
```typescript
// Before (broken):
await Purchases.setAttributes({ '$countryCode': countryCode });

// After (working):
await Purchases.setAttributes({ 'country_code': countryCode });
```

### 2. Theme Bootstrap from Capacitor Preferences
**Issue**: Theme would reset to dark mode on cold boot, causing a visual flash.

**Fix**: In `src/main.tsx`, the app now reads the stored theme from Capacitor Preferences before React mounts and immediately applies it to the document. This ensures the correct theme is displayed from the very first paint.

### 3. Subscription Initialization Watchdog
**Improvement**: Reduced watchdog timeout from 8s to 5s in `SubscriptionContext.tsx` to prevent extended hangs during initialization failures.

### 4. Medication Levels Card Default Selection
**Issue**: Card defaulted to showing the first alphabetical compound, which often had no logged doses (flat line chart).

**Fix**: Changed priority order in `getDefaultCompound()`:
1. User's saved preference
2. **Most recently taken dose's compound** (has actual data)
3. First alphabetical compound (fallback)

This ensures users see a compound with logged doses and chart data on first view.

### 5. UI Spacing Fix
**Change**: `MedicationLevelsCard` margin changed from `mt-2` to `mt-3` to prevent overlapping with calendar section in dark mode.

## Testing Checklist for Cold Start Issues
1. Hard close app
2. Wait 10+ seconds
3. Reopen app
4. Verify: data loads, subscription status correct, theme persists, no hangs
5. Test notification tap to ensure app resumes properly
