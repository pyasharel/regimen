
# Version Bump to v1.0.4 Build 28

## Summary

Bump the app version from 1.0.3 to 1.0.4 and increment the build number to 28. This is required because version 1.0.3 is already approved/released on the App Store and cannot accept new builds.

## Changes

### 1. Update `capacitor.config.ts`

Update the version constants:
- `appVersion`: `'1.0.3'` → `'1.0.4'`
- `appBuild`: `'27'` → `'28'`

## After Approval

Run these commands to update Xcode and upload to TestFlight:

```bash
git pull
npm install
npm run build
npx cap sync ios
./sync-version.sh
npx cap open ios
```

Then in Xcode:
1. Verify General tab shows Version 1.0.4, Build 28
2. Product → Archive
3. Distribute App → App Store Connect

## Release Notes for v1.0.4

**User-Facing:**
> - Improved app startup reliability
> - Fixed an issue where the app could become unresponsive after reopening
> - Performance improvements

**TestFlight (Internal):**
> Build 28: noOpLock fix for iOS Supabase deadlock. Test hard close/reopen and notification tap scenarios.
