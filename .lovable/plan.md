
# Android Build Implementation Plan

## Overview

Your project is approximately **80% ready** for Android. The Capacitor infrastructure is already configured, and most of the work involves configuration and asset generation rather than code changes.

## Phase 1: Complete Android Project Structure (30 minutes)

### Current State
The `android/` directory exists but is incomplete. It only contains:
- `android/app/src/main/AndroidManifest.xml` (already configured with permissions)

### Required Actions
1. **Regenerate the full Android project** by running these commands locally:
   ```bash
   # Remove incomplete android folder
   rm -rf android
   
   # Reinstall node modules to ensure clean state
   npm install
   
   # Build the web assets
   npm run build
   
   # Add Android platform (generates full project structure)
   npx cap add android
   
   # Sync web assets to Android
   npx cap sync android
   ```

2. **Verify project structure** - after running the commands, you should have:
   ```text
   android/
   ├── app/
   │   ├── src/main/
   │   │   ├── java/com/regimen/app/MainActivity.java
   │   │   ├── res/
   │   │   │   ├── drawable/
   │   │   │   ├── mipmap-*/  (app icons)
   │   │   │   ├── values/
   │   │   │   └── xml/
   │   │   └── AndroidManifest.xml
   │   └── build.gradle
   ├── build.gradle
   ├── settings.gradle
   └── variables.gradle
   ```

---

## Phase 2: App Icons & Splash Screen (1 hour)

### App Icons
Android requires multiple icon sizes in `mipmap` folders. You'll need to generate these from your existing `app-icon-1024.png`:

| Folder | Size | Purpose |
|--------|------|---------|
| mipmap-mdpi | 48x48 | Medium density |
| mipmap-hdpi | 72x72 | High density |
| mipmap-xhdpi | 96x96 | Extra high |
| mipmap-xxhdpi | 144x144 | Extra extra high |
| mipmap-xxxhdpi | 192x192 | Extra extra extra high |

**Tool recommendation**: Use [Android Asset Studio](https://romannurik.github.io/AndroidAssetStudio/icons-launcher.html) or [App Icon Generator](https://www.appicon.co/) to generate all sizes from your 1024x1024 source.

### Splash Screen
The splash screen is already configured in `capacitor.config.ts`. After generating assets:
1. Place `splash.png` in `android/app/src/main/res/drawable/`
2. Create a 9-patch or use the Capacitor splash screen plugin's default behavior

---

## Phase 3: RevenueCat Android Configuration (2 hours)

### Current Issue
The app uses a hardcoded iOS API key:
```typescript
const REVENUECAT_API_KEY = 'appl_uddMVGVjstgaIPpqOpueAFpZWmJ';
```

### Required Changes

1. **Create Android app in RevenueCat Dashboard**:
   - Log into RevenueCat → Your App → Settings → Apps
   - Click "Add New App" → Select "Google Play Store"
   - You'll receive an Android API key (starts with `goog_...`)

2. **Update SubscriptionContext.tsx** to use platform-specific keys:
   ```typescript
   // Before
   const REVENUECAT_API_KEY = 'appl_uddMVGVjstgaIPpqOpueAFpZWmJ';
   
   // After
   const REVENUECAT_IOS_KEY = 'appl_uddMVGVjstgaIPpqOpueAFpZWmJ';
   const REVENUECAT_ANDROID_KEY = 'goog_YOUR_ANDROID_KEY_HERE';
   
   const getRevenueCatApiKey = () => {
     return Capacitor.getPlatform() === 'android' 
       ? REVENUECAT_ANDROID_KEY 
       : REVENUECAT_IOS_KEY;
   };
   ```

3. **Set up Google Play products** in Google Play Console:
   - Create the same subscription products (monthly, annual) with matching identifiers
   - Link them in RevenueCat to your existing offerings

4. **Update billing management URL** in `SettingsSubscriptionSection.tsx`:
   ```typescript
   const handleManageSubscription = async () => {
     if (isNativePlatform && subscriptionProvider === 'revenuecat') {
       const url = Capacitor.getPlatform() === 'android'
         ? 'https://play.google.com/store/account/subscriptions'
         : 'https://apps.apple.com/account/subscriptions';
       await Browser.open({ url });
       return;
     }
     // ... rest of function
   };
   ```

---

## Phase 4: Google Sign-In Android Configuration (1-2 hours)

### Current State
`capacitor.config.ts` has iOS and web client IDs but no Android client ID:
```typescript
SocialLogin: {
  google: {
    webClientId: '495863490632-...',
    iOSClientId: '495863490632-...',
    // Missing: androidClientId
  },
},
```

### Required Steps

1. **Get your app's SHA-1 fingerprint**:
   ```bash
   cd android
   ./gradlew signingReport
   ```
   Copy the SHA-1 fingerprint from the debug or release variant.

2. **Create Android OAuth Client in Google Cloud Console**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
   - Click "Create Credentials" → "OAuth client ID"
   - Select "Android" as application type
   - Enter package name: `com.regimen.app`
   - Enter the SHA-1 fingerprint
   - Save the client ID

3. **Update capacitor.config.ts**:
   ```typescript
   SocialLogin: {
     google: {
       webClientId: '495863490632-pu5gu0svgcviivgr3la0c7esmakn6396.apps.googleusercontent.com',
       iOSClientId: '495863490632-lp0fckcnkiv0ktqeq2v4gout41bl8698.apps.googleusercontent.com',
       androidClientId: 'YOUR_NEW_ANDROID_CLIENT_ID.apps.googleusercontent.com',
     },
   },
   ```

---

## Phase 5: Android-Specific Native Plugins (1-2 hours)

### In-App Review Plugin
Your iOS app has a custom `InAppReviewPlugin.swift` for requesting reviews. Android needs an equivalent.

**Option A: Use an existing Capacitor plugin** (Recommended)
Install `@nicepro/capacitor-in-app-review` which handles both platforms:
```bash
npm install @nicepro/capacitor-in-app-review
npx cap sync
```

Then update your code to use this instead of the custom plugin.

**Option B: Create custom Android plugin**
Create `android/app/src/main/java/com/regimen/app/InAppReviewPlugin.java`:
```java
package com.regimen.app;

import com.getcapacitor.Plugin;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.google.android.play.core.review.ReviewManager;
import com.google.android.play.core.review.ReviewManagerFactory;

@CapacitorPlugin(name = "InAppReview")
public class InAppReviewPlugin extends Plugin {
    @PluginMethod
    public void requestReview(PluginCall call) {
        ReviewManager manager = ReviewManagerFactory.create(getContext());
        manager.requestReviewFlow().addOnCompleteListener(task -> {
            if (task.isSuccessful()) {
                manager.launchReviewFlow(getActivity(), task.getResult());
                call.resolve();
            } else {
                call.reject("Failed to request review");
            }
        });
    }
}
```

### TestFlight Detector
This is iOS-specific and doesn't have a direct Android equivalent. The plugin already has a web fallback that returns `false`, which will work for Android. No changes needed.

---

## Phase 6: First Build & Test (2-4 hours)

### Build Steps
```bash
# Ensure latest web build
npm run build

# Sync to Android
npx cap sync android

# Open in Android Studio
npx cap open android
```

### In Android Studio
1. Wait for Gradle sync to complete
2. Connect your Android phone via USB (enable USB debugging in Developer Options)
3. Select your device from the dropdown
4. Click the green "Run" button

### Testing Checklist
- [ ] App launches and shows splash screen
- [ ] Onboarding flow works
- [ ] Sign up / Sign in with email works
- [ ] Google Sign-In works (if configured)
- [ ] Navigation between screens works
- [ ] Today screen displays correctly
- [ ] My Stack shows compounds
- [ ] Adding/editing compounds works
- [ ] Notifications permission request appears
- [ ] Camera/photo picker works
- [ ] Haptic feedback works
- [ ] Dark mode works
- [ ] RevenueCat offerings load (if configured)
- [ ] Purchase flow works (test in sandbox)

---

## Phase 7: Google Play Console Setup (2 hours)

### Initial Setup
1. **Create developer account** at [Google Play Console](https://play.google.com/console) ($25 one-time fee)
2. **Create new app**:
   - App name: "Regimen"
   - Default language: English (United States)
   - App or game: App
   - Free or paid: Free

### Store Listing
- **Short description**: Use your App Store subtitle
- **Full description**: Use your App Store description
- **Screenshots**: Can reuse iOS screenshots (but ideally create Android-specific ones)
- **Feature graphic**: 1024x500px banner image (required for Google Play)

### App Signing
- Use Google Play App Signing (recommended)
- Upload your signed APK or AAB (Android App Bundle)

### Build & Upload
```bash
# Generate release build
cd android
./gradlew bundleRelease
```

The AAB file will be at `android/app/build/outputs/bundle/release/app-release.aab`

---

## Phase 8: Version Sync Script Update (30 minutes)

Update `sync-version.sh` to also update Android version:

```bash
#!/bin/bash
# Sync version from capacitor.config.ts to iOS and Android

VERSION=$(grep "export const appVersion" capacitor.config.ts | sed "s/.*= '\\(.*\\)';/\\1/")
BUILD=$(grep "export const appBuild" capacitor.config.ts | sed "s/.*= '\\(.*\\)';/\\1/")

echo "📱 Syncing version..."
echo "   Version: $VERSION"
echo "   Build: $BUILD"

# Update iOS (existing code)
# ...

# Update Android build.gradle
GRADLE_FILE="android/app/build.gradle"
if [ -f "$GRADLE_FILE" ]; then
  sed -i '' "s/versionCode [0-9]*/versionCode $BUILD/g" "$GRADLE_FILE"
  sed -i '' "s/versionName \"[^\"]*\"/versionName \"$VERSION\"/g" "$GRADLE_FILE"
  echo "✅ Android project updated"
fi
```

---

## Summary: Estimated Timeline

| Phase | Time |
|-------|------|
| Phase 1: Project Structure | 30 min |
| Phase 2: Icons & Splash | 1 hour |
| Phase 3: RevenueCat Setup | 2 hours |
| Phase 4: Google Sign-In | 1-2 hours |
| Phase 5: Native Plugins | 1-2 hours |
| Phase 6: Build & Test | 2-4 hours |
| Phase 7: Play Console Setup | 2 hours |
| Phase 8: Version Script | 30 min |
| **Total** | **10-14 hours** |

---

## Technical Details

### Files to Modify

1. **src/contexts/SubscriptionContext.tsx**
   - Add platform-specific RevenueCat API keys
   - Update `Purchases.configure()` call

2. **src/components/subscription/SettingsSubscriptionSection.tsx**
   - Add Android billing management URL

3. **capacitor.config.ts**
   - Add `androidClientId` for Google Sign-In
   - Optionally add Android-specific config section

4. **sync-version.sh**
   - Add Android build.gradle version updates

### New Files/Assets Needed

1. Android app icons (multiple sizes)
2. Android splash screen asset
3. (Optional) Android In-App Review plugin if not using third-party
4. Google Play feature graphic (1024x500)
5. Google Play screenshots

### External Configuration Required

1. RevenueCat: Add Android app, get API key, configure products
2. Google Cloud Console: Create Android OAuth client
3. Google Play Console: Create app, configure store listing
4. (If using push notifications) Firebase: Add Android app, download google-services.json
