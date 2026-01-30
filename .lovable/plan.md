

## Increment Build Number for Google Play

I'll update the build number from **18 to 19** in the codebase. After I make this change, you'll run a simple script that automatically updates Android Studio for you - no manual code editing required.

---

## What I'll Change

**File:** `capacitor.config.ts`

```
Before: export const appBuild = '18';
After:  export const appBuild = '19';
```

---

## After I Make the Change

Run these commands in your terminal (from your project folder):

```bash
git pull
./sync-version.sh
```

The script will automatically update the Android `build.gradle` file to `versionCode 19`.

Then in Android Studio:
1. Click **"Sync Now"** if prompted (or File > Sync Project with Gradle Files)
2. Go to **Build > Generate Signed Bundle / APK**
3. Build your new AAB and upload it to Google Play

---

## Technical Note

The reason the AAB had `versionCode 1` is that `npx cap sync` sometimes resets native project files. The `sync-version.sh` script is designed to fix this by reading from `capacitor.config.ts` and updating both iOS and Android projects.

