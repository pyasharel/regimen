
# Version Bump to 1.0.5 Build 29

## Overview
Update the app version from 1.0.4 (Build 28) to 1.0.5 (Build 29) in preparation for deploying the auth preservation fix.

## Why This Approach Works
- TestFlight builds can be promoted directly to App Store review
- No need to upload a new binary if beta testing confirms the fix
- Same build number (29) works for both iOS and Android

## Implementation

### File: `capacitor.config.ts`

Update the version constants:

```typescript
// Before
export const appVersion = '1.0.4';
export const appBuild = '28';

// After
export const appVersion = '1.0.5';
export const appBuild = '29';
```

## After Approval - Your Next Steps

Run these commands locally after pulling the changes:

```bash
# 1. Pull the updated code
git pull

# 2. Install dependencies (if needed)
npm install

# 3. Build the web app
npm run build

# 4. Sync version to native projects
./sync-version.sh

# 5. Sync Capacitor
npx cap sync

# 6. Test on your devices (with existing 1.0.4 installed)
npx cap run ios
npx cap run android
```

This will install Build 29 over your existing 1.0.4, simulating what your beta testers will experience when they update.
