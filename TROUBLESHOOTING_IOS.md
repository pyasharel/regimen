# iOS Troubleshooting Guide

## CocoaPods Dependency Issues

### Problem
When running `npx cap open ios`, you may encounter CocoaPods-related errors like:
- Missing dependencies
- Pod installation failures
- Workspace not found errors

### Solution (Permanent Fix)

1. **Clean Homebrew cache** (if you have conflicting CocoaPods versions):
   ```bash
   brew cleanup
   ```
   Wait for this to complete (terminal prompt returns).

2. **Ensure CocoaPods is properly linked**:
   ```bash
   brew link --overwrite cocoapods
   ```

3. **Install pods and generate workspace**:
   ```bash
   cd ios/App
   pod install
   cd ../..
   ```

4. **Open in Xcode**:
   ```bash
   npx cap open ios
   ```

5. **When Xcode shows "Version on Disk" dialog**:
   - Select "Use Version on Disk"
   - This loads the freshly generated `.xcworkspace` file

### Result
- CocoaPods dependencies are properly installed
- Xcode workspace is generated
- You won't need to repeat these steps unless you add new native dependencies

## Running on iOS Simulator

### Without Development Team (No Signing Required)

1. **In Xcode**, at the top toolbar:
   - Click the device dropdown (next to the Play button)
   - Select any iOS Simulator device (e.g., "iPhone 15 Pro", "iPhone SE")
   - **Do NOT** select a physical device

2. **Click the Play button** (or press Cmd+R)
   - App will build
   - Simulator will launch
   - App will install and run on simulator

### No signing needed for simulator testing!

## Running on Physical Device

Requires:
- Active Apple Developer account
- Development team selected in Xcode
- Signing & Capabilities configured

**Note**: If your Apple Developer account is being transferred, wait for the transfer to complete (usually 24-48 hours) before attempting to run on physical devices.

## Common Issues

### Build Fails with "Signing Required"
- **Solution**: Use iOS Simulator instead (see above)
- Or wait for Apple Developer transfer to complete

### "Could not create a sandbox extension" Error (COMMON!)
This is a **macOS Sonoma/Xcode 15+** issue that can cause stale assets:

1. In Xcode, select the **App** target (left sidebar)
2. Go to **Build Settings** tab
3. Search for **"User Script Sandboxing"**
4. Set it to **No**

This allows CocoaPods scripts to run properly and copy fresh web assets.

### Yellow "Run Script" Warnings
- These are normal for CocoaPods projects
- Won't prevent app from building/running
- Safe to ignore

### App Not Updating After Code Changes

**Symptoms:**
- Made changes in Lovable but app still shows old content
- Changes appear in `ios/App/App/public/` but not in the running app
- App is stuck on an old version despite pulling latest code

---

## ✅ THE PROVEN FIX (Use This First!)

When your iOS app is stuck on an old version and normal sync doesn't work, run this **full rebuild chain**:

```bash
# 1. Build the web app
npm run build

# 2. UPDATE (not just sync!) - THIS IS THE KEY DIFFERENCE
npx cap update ios

# 3. Refresh CocoaPods dependencies
cd ios/App && pod install && cd ../..

# 4. Build and run directly from Terminal (bypasses Xcode cache)
npx cap run ios
```

**Why this works:**
- `npx cap update ios` is **MORE THOROUGH** than `npx cap sync ios`
- It updates native dependencies AND copies web assets
- `pod install` ensures iOS dependencies are fresh
- `npx cap run ios` builds from scratch, completely bypassing Xcode's cached build

**For physical device:**
```bash
# List available devices (shows simulators AND connected iPhones)
npx cap run ios --list

# Run on specific device by name
npx cap run ios --target="Your iPhone Name"
```

---

## Basic Fix (Try First for Minor Issues)

1. Stop the app in Xcode
2. `npm run build` in terminal
3. `npx cap sync ios` in terminal
4. In Xcode: `Cmd + Shift + K` (Clean Build Folder)
5. `Cmd + R` to run again

---

## If Basic Fix Doesn't Work

**WKWebView Cache Issue (MOST COMMON on Physical Devices):**

On physical iOS devices, WKWebView uses a **shared cache that persists even after deleting the app**.

**Clear Safari Website Data:**
1. On iPhone: **Settings → Safari → Advanced → Website Data**
2. Find and delete entries related to your app or "localhost"
3. Rebuild and run the app

---

## Nuclear Option (Last Resort)

1. **Close Xcode completely**

2. **Delete Derived Data:**
   ```bash
   rm -rf ~/Library/Developer/Xcode/DerivedData
   ```

3. **Delete app from iPhone** (long press → Remove App)

4. **Clear Safari Website Data on iPhone** (see above)

5. **Run the full rebuild chain:**
   ```bash
   npm run build
   npx cap update ios
   cd ios/App && pod install && cd ../..
   npx cap run ios
   ```

---

## Verify Sync Worked

```bash
# Check timestamps on synced files
ls -la ios/App/App/public/
```

The files should show recent timestamps matching your last `npm run build`.

---

## Layout & UI Fixes

### Screen Rotation Lock

**Problem:** App rotates when phone is flipped to landscape orientation.

**Solution:** Lock orientation to portrait in native config files:

**iOS (Info.plist):** Remove landscape orientations from `UISupportedInterfaceOrientations`:
```xml
<key>UISupportedInterfaceOrientations</key>
<array>
    <string>UIInterfaceOrientationPortrait</string>
</array>
```

**Android (AndroidManifest.xml):** Add `screenOrientation` to the activity:
```xml
<activity
    android:screenOrientation="portrait"
    ...>
```

### Bottom Navigation Vertical Centering

**Problem:** Bottom nav icons/text not vertically centered, especially with safe area insets.

**Solution:** Apply safe-area padding to the nav wrapper, not the content container:
```tsx
<nav style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
  <div className="flex items-center justify-around h-14">
    {/* buttons with h-full to fill the fixed height */}
  </div>
</nav>
```

### Page Sliding / Bounce Issues

**Problem:** Page content slides or bounces when scrolling, especially on iOS.

**Solution:** 
1. Use `overflow-y-auto` instead of `overflow-scroll` on scroll containers
2. Add `overscroll-behavior-y-contain` to prevent pull-to-refresh interference
3. Ensure fixed elements (header, bottom nav) don't overlap scrollable content
4. Use proper safe-area padding: `pb-[calc(4rem+env(safe-area-inset-bottom))]`

---

## App Not Updating Despite Multiple Rebuilds

**Symptoms:**
- Version number in Settings doesn't change after rebuilding
- Old features/bugs persist despite code changes
- `npx cap sync` or `npx cap update` shows "ios platform has not been added yet"

**Root Cause:** Usually one of:
1. **Running commands from wrong directory** (inside `ios/App/` instead of project root)
2. Cached builds in Xcode not being cleared
3. Old app still installed on device

**Fix - Verify Directory First:**

```bash
# You MUST be in the project root (where package.json lives)
ls package.json capacitor.config.ts
```

If you see "No such file", you're in the wrong folder. Run `cd ../..` until you're in the right place.

**Fix - The Nuclear Rebuild Chain:**

```bash
npm run build
npx cap update ios
npx cap sync ios
npx cap open ios
```

Then in Xcode:
1. Hold **Option** key → **Product → Clean Build Folder**
2. **Delete the app from your phone** (long-press → Remove App)
3. Click **Run** (▶)

**Verify the fix:** Check Settings → version number should match `appBuild` in `capacitor.config.ts`

**Pro tip:** Bump `appBuild` in `capacitor.config.ts` before rebuilding to force-confirm you're running the newest bundle.

---

## Quick Reference Commands

```bash
# Sync changes (from project root!)
npm run build && npx cap sync ios

# Open in Xcode
npx cap open ios

# Reinstall pods
cd ios/App && pod install && cd ../..

# Full nuclear rebuild
npm run build && npx cap update ios && npx cap sync ios && npx cap open ios
```

---

## Android Fresh Install / Upgrade Black Screen (Build 46+)

**Symptoms:**
- App shows pure black screen immediately after installing over an existing version
- Happens when replacing an older install (Android Studio prompts to delete first)
- Hard-closing and reopening the app loads it fine on the second launch

**Root Cause:**
When Android replaces an existing app install, `localStorage` and `Capacitor Preferences` can both be wiped. This means the auth token mirror has nothing to restore, causing the boot sequence to wait the full timeout before showing recovery UI. The WebView's native background is black, so the wait feels like a freeze.

**Resolution (Build 46+):**
Fixed by three changes:
1. `index.html` sets `background-color: #0a0a0a` before any JS loads — eliminates the black void
2. Boot timeout extended to 6s on native (was 4s) — gives Android cold starts more time
3. Recovery screen now shows the Regimen logo + spinner instead of a blank black screen

**For Affected Users (pre-Build 46):**
1. Hard close the app (swipe away from app switcher)
2. Reopen — it will load correctly on the second launch
3. Update to Build 46+ from the Play Store to prevent recurrence

**For Developers Testing:**
- This scenario is most reproducible when you delete and reinstall during Android Studio deployment
- The fix means users now see a branded spinner if boot takes longer than expected, instead of a black screen
- Safe to test by: deleting the app, reinstalling via Android Studio, and confirming a dark background (not black) appears within 1-2 seconds

---

## App Hangs on Resume / Black Screen (CRITICAL)

**Symptoms:**
- App shows black screen or empty data after reopening
- "Slow connection" toast appears repeatedly
- UI structure visible but no content loads
- App becomes unresponsive after closing and reopening

**Root Cause:**
The `@supabase/auth-js` library uses the `navigator.locks` API, which deadlocks on iOS/Android WebViews when the app is suspended mid-operation. The lock is never released on resume, causing all auth and data operations to hang indefinitely.

**Resolution (Build 28+):**
This was fixed in v1.0.4 (Build 28) by implementing a `noOpLock` bypass in both Supabase clients. Mobile apps don't need cross-tab locking since they run as single instances.

**For Affected Users:**
1. Force quit the app (swipe up from app switcher)
2. Check for updates in the App Store / Play Store
3. Update to v1.0.4 or later
4. If update doesn't appear, try deleting and reinstalling the app

**For Developers:**
See the full post-mortem: `.storage/memory/postmortems/v103-supabase-deadlock-incident.md`

Key files:
- `src/integrations/supabase/client.ts` - Main client with `noOpLock`
- `src/integrations/supabase/dataClient.ts` - Data client with `noOpLock`

**Reference:** [supabase/auth-js#866](https://github.com/supabase/auth-js/issues/866)

---

## TestFlightDetectorPlugin Build Stability

### Problem
The `TestFlightDetectorPlugin.swift` file was not formally included in the Xcode project configuration (`project.pbxproj`), causing `npx cap update ios` to break the build with "cannot find TestFlightDetectorPlugin" errors.

### Solution (Now Permanently Fixed)
The `ios/App/App.xcodeproj/project.pbxproj` now includes `TestFlightDetectorPlugin.swift` in all required sections:
- **PBXFileReference** - File reference entry
- **PBXBuildFile** - Build file entry
- **PBXGroup** - Group membership
- **PBXSourcesBuildPhase** - Compile sources phase

This means builds remain stable even after running `npx cap sync ios` or `npx cap update ios`.

### Verifying the Latest Web Bundle
Settings → Help now shows a **"Bundle"** timestamp (e.g., `2026-01-20T14:30:00.000Z`).
This confirms exactly which web code is running, independent of the native build number (`appBuild`).

**To verify your changes are deployed:**
1. Check the Bundle timestamp in Settings → Help
2. It should match approximately when you ran `npm run build`

### DEBUG Guard
The plugin includes a `#if DEBUG` guard that returns `isTestFlight: false` during Xcode development runs. This prevents the TestFlight migration modal from appearing while testing locally, ensuring a clean development experience.

```swift
#if DEBUG
// In debug builds, always return false to avoid migration modal during development
call.resolve(["isTestFlight": false])
return
#endif
```

---

## Adding Custom Swift Plugins

When adding custom Swift plugins (like `TestFlightDetectorPlugin.swift` or `InAppReviewPlugin.swift`):

1. **Create the Swift file** in `ios/App/App/`
2. **Open `ios/App/App.xcworkspace`** in Xcode (NOT `.xcodeproj`)
3. **Right-click the `App` folder** → "Add Files to App..."
4. **Ensure the `App` target is checked** in the dialog
5. **Clean Build Folder** (Cmd+Shift+K)
6. **Rebuild** (Cmd+B)

This ensures the Swift file is properly linked to the build target and won't break after `cap sync`.
