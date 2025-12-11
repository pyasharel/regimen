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

## Quick Reference Commands

```bash
# Sync changes to iOS
npx cap sync ios

# Open in Xcode
npx cap open ios

# Reinstall pods (if needed)
cd ios/App && pod install && cd ../..
```
