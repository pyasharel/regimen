

## Update Build Number to 18

### Change Required

Update `capacitor.config.ts` to increment the build number from 17 to 18 while keeping the version at 1.0.3.

### File: capacitor.config.ts

**Current:**
```typescript
export const appVersion = '1.0.3';
export const appBuild = '17';
```

**Change to:**
```typescript
export const appVersion = '1.0.3';
export const appBuild = '18';
```

### After Approval

Once you approve this change and fix the npm issue, run:

```bash
./sync-version.sh
```

This script will automatically propagate the build number to:
- **iOS**: Updates `CURRENT_PROJECT_VERSION` in the Xcode project
- **Android**: Updates `versionCode` in `build.gradle`

### Android Studio Note

If the sync script doesn't update Android automatically, you can manually update in Android Studio:
1. Open `android/app/build.gradle`
2. Find `versionCode` and change it to `18`
3. Click "Sync Now" when prompted

### Complete Build Sequence

After approving this change:

```bash
# Fix npm + build + sync
cd /Users/Zen/regimen-health-hub && rm -rf node_modules && npm cache clean --force && npm install && npm run build

# Sync version numbers to native projects
./sync-version.sh

# Sync to both platforms
npx cap sync ios && npx cap sync android

# Open IDEs
npx cap open ios
npx cap open android
```

