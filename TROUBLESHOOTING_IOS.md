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

**Basic steps:**
1. Stop the app in Xcode
2. Run `npm run build` in terminal (CRITICAL - must build first!)
3. Run `npx cap sync ios` in terminal
4. Build and run again in Xcode

**WKWebView Cache Issue (MOST COMMON on Physical Devices):**

On physical iOS devices, WKWebView uses a **shared cache that persists even after deleting the app**. This is the #1 cause of stale content.

**The Fix - Clear Safari Website Data:**
1. On your iPhone, go to **Settings → Safari → Advanced → Website Data**
2. Scroll to find any entries related to your app or "localhost"
3. Swipe left and **Delete** them (or use "Remove All Website Data")
4. Now rebuild and run the app

**Alternative: Reset the iPhone's WKWebView cache completely:**
1. Settings → Safari → Clear History and Website Data
2. This clears ALL Safari/WKWebView data but guarantees fresh content

**If still not updating (Nuclear Option):**

1. **Close Xcode completely**

2. **Delete Derived Data:**
   ```bash
   rm -rf ~/Library/Developer/Xcode/DerivedData
   ```

3. **Delete app from iPhone** (long press → Remove App)

4. **Clear Safari Website Data on iPhone** (see above)

5. **Rebuild:**
   ```bash
   npm run build
   npx cap sync ios
   npx cap open ios
   ```

6. **In Xcode:** `Cmd + Shift + K` then `Cmd + R`

**Verify the sync worked:**
- After `npx cap sync ios`, check that `ios/App/App/public/` contains your latest files
- You can run `ls -la ios/App/App/public/` to see timestamps

**If STILL not updating (Scorched Earth):**

When nothing else works, try `cap update` (different from sync) or regenerate the entire iOS project:

**Option A - Cap Update:**
```bash
npm run build
npx cap update ios   # Different from sync - updates native dependencies too
npx cap open ios
```

**Option B - Regenerate iOS project:**
```bash
# 1. Backup any custom iOS files if needed
# 2. Delete and regenerate:
rm -rf ios
npx cap add ios
cd ios/App && pod install && cd ../..
npm run build
npx cap sync ios
npx cap open ios
```

**Option C - Check Xcode Build Location:**
1. In Xcode: `File → Project Settings`
2. Ensure "Derived Data" is set to "Project-relative Location" or "Default"
3. If custom, reset to default

## Quick Reference Commands

```bash
# Sync changes to iOS
npx cap sync ios

# Open in Xcode
npx cap open ios

# Reinstall pods (if needed)
cd ios/App && pod install && cd ../..
```
