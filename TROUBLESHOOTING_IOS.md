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

### Yellow "Run Script" Warnings
- These are normal for CocoaPods projects
- Won't prevent app from building/running
- Safe to ignore

### App Not Updating After Code Changes
1. Stop the app in Xcode
2. Run `npx cap sync ios` in terminal
3. Build and run again in Xcode

## Quick Reference Commands

```bash
# Sync changes to iOS
npx cap sync ios

# Open in Xcode
npx cap open ios

# Reinstall pods (if needed)
cd ios/App && pod install && cd ../..
```
