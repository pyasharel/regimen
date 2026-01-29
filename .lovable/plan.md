

# Critical Bug Fix: iOS Cold Start Data Loading Failure

## Problem Analysis

After analyzing the Xcode logs and code, I've identified the root causes of why the app shows blank data after a hard close:

### Key Issues from Xcode Logs

1. **"Connection interrupted"** - iOS is killing network connections during cold starts
2. **`RevenueCat.BackendError error 0`** with `$countryCode` attribute error - RevenueCat is failing with an invalid attribute name
3. **Multiple `isActive:false` events** - The app receives many background state change events in quick succession
4. **Cascading auth failures** - When RevenueCat fails, it blocks the subscription context which blocks data loading

### Root Cause Chain

```text
Cold Start
    |
    v
RevenueCat tries to set '$countryCode' attribute (INVALID - $ prefix is reserved)
    |
    v
RevenueCat SDK throws BackendError
    |
    v
identifyRevenueCatUser() fails or hangs
    |
    v
refreshSubscription() never completes (watchdog may not trigger fast enough)
    |
    v
SubscriptionContext.isLoading stays true
    |
    v
TodayScreen waits for subscription data before loading user data
    |
    v
Blank screens with loading skeletons
```

## Root Cause: Invalid RevenueCat Attribute

In `SubscriptionContext.tsx` line 745-748, the code tries to set `'$countryCode'` as an attribute:

```typescript
await Purchases.setAttributes({
  '$countryCode': countryCode, // <-- INVALID! $ prefix is reserved
  locale: locale,
});
```

RevenueCat reserves the `$` prefix for built-in attributes. This causes the SDK to throw an error, which cascades into blocking the entire subscription initialization.

## Solution

### Phase 1: Fix the RevenueCat Attribute Error (Critical)

**File: `src/contexts/SubscriptionContext.tsx`**

Change line 745 to use a valid attribute name (without `$` prefix):

```typescript
await Purchases.setAttributes({
  country_code: countryCode,  // <-- Remove $ prefix
  locale: locale,
});
```

### Phase 2: Make Subscription Initialization Non-Blocking

Currently, if RevenueCat fails, the entire subscription context hangs. We need to:

1. Wrap RevenueCat attribute setting in try/catch (already exists but error isn't fully isolated)
2. Ensure `setIsLoading(false)` is called even when RevenueCat init fails
3. Reduce the watchdog timeout from 8s to 5s for faster recovery

### Phase 3: Decouple Data Loading from Subscription Status

TodayScreen currently waits on subscription status before showing data. This is unnecessary - we should:

1. Load user data immediately (compounds, doses, levels)
2. Show subscription status independently when ready
3. Never block compound data on subscription checks

### Phase 4: Theme Persistence Fix

Bootstrap theme from Capacitor Preferences before React renders to prevent dark mode reversion.

## Technical Changes

### 1. Fix RevenueCat Invalid Attribute (src/contexts/SubscriptionContext.tsx)

At line 745-748, change:
```typescript
// BEFORE (invalid)
await Purchases.setAttributes({
  '$countryCode': countryCode,
  locale: locale,
});

// AFTER (valid)
await Purchases.setAttributes({
  country_code: countryCode,
  locale: locale,
});
```

### 2. Improve RevenueCat Error Isolation

The try/catch at line 753 exists but the enrichment code block can still cause issues. Add explicit early-return safety:

```typescript
// In identifyRevenueCatUser, wrap attribute setting more defensively
try {
  // Set country/locale - use valid attribute names (no $ prefix)
  const locale = navigator.language || 'en-US';
  const countryCode = locale.split('-')[1] || 'Unknown';
  await Purchases.setAttributes({
    country_code: countryCode,  // Fixed attribute name
    locale: locale,
  });
} catch (localeError) {
  // Log but don't throw - this should never block subscription
  console.warn('[RevenueCat] Could not set country/locale:', localeError);
}
```

### 3. Reduce Watchdog Timeout (src/contexts/SubscriptionContext.tsx)

Change line 202:
```typescript
// BEFORE
const REFRESH_WATCHDOG_MS = 8000;

// AFTER - faster recovery
const REFRESH_WATCHDOG_MS = 5000;
```

### 4. Bootstrap Theme Before React Renders (src/main.tsx)

Add async bootstrap step that reads theme from Capacitor Preferences before rendering:

```typescript
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

// Theme bootstrap for native platforms
const bootstrapTheme = async () => {
  if (!Capacitor.isNativePlatform()) return;
  
  try {
    const [themeResult, variantResult] = await Promise.all([
      Preferences.get({ key: 'vite-ui-theme' }),
      Preferences.get({ key: 'vite-ui-theme-variant' }),
    ]);
    
    const theme = themeResult.value || 'dark';
    const variant = variantResult.value || 'refined';
    
    // Sync to localStorage so ThemeProvider picks it up
    localStorage.setItem('vite-ui-theme', theme);
    localStorage.setItem('vite-ui-theme-variant', variant);
    
    // Apply to document immediately
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
    document.documentElement.classList.add(`design-${variant}`);
  } catch (e) {
    console.warn('[ThemeBootstrap] Failed:', e);
  }
};

// Bootstrap theme before rendering
bootstrapTheme().finally(() => {
  createRoot(document.getElementById("root")!).render(...);
});
```

### 5. Increase Levels Card Spacing (src/components/MedicationLevelsCard.tsx)

Change top margin from `mt-2` to `mt-3` for better dark mode visibility.

## Files Changed

| File | Change |
|------|--------|
| `src/contexts/SubscriptionContext.tsx` | Fix `$countryCode` to `country_code`, reduce watchdog to 5s |
| `src/main.tsx` | Add theme bootstrap from Capacitor Preferences |
| `src/components/MedicationLevelsCard.tsx` | Increase top margin (mt-2 to mt-3) |

## Testing After Fix

```bash
git pull && npm install && npm run build && npx cap sync ios
cd ios/App && pod install && cd ../..
# In Xcode: Delete app, reinstall, run
```

**Test scenarios:**
1. Sign in - data should load
2. Hard close and reopen - data should load (no blank screens)
3. Set light mode, hard close, reopen - should stay light
4. Check dark mode - levels card should have proper spacing
5. Navigate between tabs - all data should be present

## Why This Will Work

The `$countryCode` attribute error was causing a cascading failure that blocked the entire subscription initialization. By:

1. **Fixing the attribute name** - RevenueCat SDK will no longer throw
2. **Reducing watchdog timeout** - Faster recovery from any remaining failures
3. **Bootstrapping theme** - Prevents dark mode reversion on cold starts
4. **Improving spacing** - Better visual hierarchy in dark mode

The subscription context will initialize properly, which unblocks all downstream data loading.

