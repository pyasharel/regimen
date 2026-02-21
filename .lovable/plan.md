

## Release Build 48 to App Store and Google Play

### Step 1: Bump Build Number

Update `capacitor.config.ts`:
- `appVersion` stays at `'1.1.0'`
- `appBuild` changes from `'47'` to `'48'`

This is a one-line change in `capacitor.config.ts`.

### Step 2: Full Sync Commands

After the build bump is committed by Lovable, run these on your Mac:

**iOS:**
```bash
cd ~/regimen-health-hub
git pull && npm install && npm run build && npx cap update ios && cd ios/App && pod install && cd ../.. && ./sync-version.sh
```

Then in Xcode:
1. Open via `npx cap open ios` (verify title bar ends in `.../regimen-health-hub/ios`)
2. Hold Option, then Product -> Clean Build Folder
3. Delete the app from your phone
4. Click Run to verify on device
5. When ready: Product -> Archive -> Upload to App Store Connect

**Android:**
```bash
cd ~/regimen-health-hub
git pull && npm install && npm run build && npx cap update android && ./sync-version.sh
```

Then in Android Studio:
1. Open via `npx cap open android` (verify title bar ends in `.../regimen-health-hub/android`)
2. Build -> Clean Project
3. Build -> Rebuild Project
4. Uninstall the app from the device
5. Click Run to verify on device
6. When ready: Build -> Generate Signed Bundle / APK -> Upload to Google Play Console

### Step 3: Verify on Device

Before archiving for release, confirm:
- Settings shows version 1.1.0 (Build 48)
- Streak badge appears in the header bar (not in the greeting row)
- Long names display fully in the greeting
- Rating button in Settings triggers the native dialog

### What's in This Release (v1.1.0 Build 48)
- Streak badge moved to header bar for better layout
- Rating button reverted to native-first approach
- All prior stability fixes from builds 41-47

### Not Blocking Release
- Onboarding testimonial quote updates (cosmetic, can ship in a future build)

### Technical Details

**File changed:** `capacitor.config.ts`
- Line 7: `export const appBuild = '47';` changes to `export const appBuild = '48';`

No other code changes needed for this release.

