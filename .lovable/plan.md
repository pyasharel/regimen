
# Fix Rating & Share: Correct Store URLs

## The Problem

Both iOS and Android rating/share features are broken because the store URLs in the code point to wrong apps:

| Platform | Current (Wrong) | Correct (Confirmed by You) |
|----------|-----------------|---------------------------|
| iOS | `id6753005449` | `id6753905449` |
| Android | `app.lovable.348ffbbac09744d8bbbea7cee13c09a9` | `com.regimen.app` |

Additionally, the share sheet shows the iOS App Store link even when on Android.

---

## What Will Be Fixed

### 1. Rating Button (Settings -> "Rate")
When tapped, this tries the native in-app review API first. If that fails or is unavailable, it falls back to opening the store directly. Currently the fallback URLs are wrong.

### 2. Share Button (Settings -> "Share")  
Currently always shares the iOS App Store link, even on Android devices.

---

## Implementation

### Step 1: Create Centralized Store URLs

Create a new file to keep all store links in one place:

**New file: `src/constants/storeUrls.ts`**

```typescript
// Centralized store URLs - single source of truth
// iOS App ID: 6753905449 (confirmed by user)
// Android Package: com.regimen.app (from Play Store URL)

export const STORE_URLS = {
  ios: {
    // Full URL with app name for sharing (name can change, ID is permanent)
    appStore: 'https://apps.apple.com/us/app/regimen-peptide-trt-tracker/id6753905449',
    // Shorter format for review deep link (internal use only)
    review: 'https://apps.apple.com/app/id6753905449?action=write-review',
  },
  android: {
    playStore: 'https://play.google.com/store/apps/details?id=com.regimen.app',
    // market:// URI opens Play Store app directly
    review: 'market://details?id=com.regimen.app',
    // Web fallback if market:// doesn't work
    reviewWeb: 'https://play.google.com/store/apps/details?id=com.regimen.app',
  },
  // Landing page for web users
  web: 'https://getregimen.app',
};
```

### Step 2: Update Rating Helper

**File: `src/utils/ratingHelper.ts`**

Replace the hardcoded STORE_URLS (lines 11-17) with import from centralized constants:

```text
Before:
  ios: 'https://apps.apple.com/app/id6753005449?action=write-review'
  android: 'market://details?id=app.lovable.348ffbbac09744d8bbbea7cee13c09a9'

After:
  Import from @/constants/storeUrls and use correct IDs
```

### Step 3: Update Share Sheet with Platform Detection

**File: `src/components/SettingsScreen.tsx`**

The `handleShareApp` function (around line 96) currently hardcodes the iOS URL. Update to:

1. Import the centralized store URLs
2. Detect which platform the user is on using `Capacitor.getPlatform()`
3. Use the correct store URL for that platform

```typescript
const handleShareApp = async () => {
  trackShareAction('app');
  
  if (!Capacitor.isNativePlatform()) {
    toast.info('Sharing is available in the native app');
    return;
  }
  
  const platform = Capacitor.getPlatform();
  const storeUrl = platform === 'android' 
    ? STORE_URLS.android.playStore 
    : STORE_URLS.ios.appStore;
  
  try {
    await Share.share({
      title: 'Check out Regimen',
      text: 'I use Regimen to track my health protocol. You should try it!',
      url: storeUrl,
      dialogTitle: 'Share Regimen',
    });
  } catch (error) {
    console.log('Share cancelled or failed:', error);
  }
};
```

### Step 4: Update PartnerLanding.tsx for Consistency

**File: `src/pages/PartnerLanding.tsx`**

Change line 41 to import from the centralized constants instead of hardcoding:

```typescript
import { STORE_URLS } from '@/constants/storeUrls';

const APP_STORE_URL = STORE_URLS.ios.appStore;
```

This ensures if you ever update the App Store URL, you only change it in one place.

---

## Files Changed

| File | Change |
|------|--------|
| `src/constants/storeUrls.ts` | **NEW** - Central source of truth for all store URLs |
| `src/utils/ratingHelper.ts` | Fix iOS ID (6753005449 -> 6753905449), fix Android package ID |
| `src/components/SettingsScreen.tsx` | Add platform detection for share, import from constants |
| `src/pages/PartnerLanding.tsx` | Import from constants for consistency |

---

## About App Name Changes

The App Store URL has two parts:
- **App name slug** (`regimen-peptide-trt-tracker`) - Just for readability, Apple ignores it
- **App ID** (`id6753905449`) - Permanent identifier, never changes

If you rename your app to "Regimen Pro" or anything else:
- The ID stays `6753905449` forever
- Old links continue to work because Apple redirects based on ID
- You can optionally update the slug in the code for aesthetics, but it's not required

---

## Technical Notes

### Why the native review API sometimes doesn't show a dialog

Both Apple and Google's in-app review APIs have internal rate limiting:
- **Apple**: May show the dialog only 3 times per year per user
- **Google**: Quota-based, may not show if user recently saw it or app was recently installed

The app is designed to fall back to opening the store directly when this happens. Currently those fallback URLs are wrong, which is why nothing happens at all. After this fix:

- **Rating from Settings**: Will either show native dialog OR open the correct store page
- **Share from Settings**: Will share the correct store link based on platform
- **Rating during onboarding**: Still uses `skipStoreFallback: true`, so it won't redirect (intentional to not interrupt flow)
