
# Increment Build Number & Generate Android AAB

## Change Required

Update `capacitor.config.ts` line 6:

```typescript
// BEFORE
export const appBuild = '14';

// AFTER
export const appBuild = '15';
```

---

## After I Make This Change, Follow These Steps

### Step 1: Pull the Updated Code

```bash
cd ~/regimen-health-hub/regimen
git pull
```

### Step 2: Sync the Version to Android

```bash
./sync-version.sh
```

You should see output confirming:
- Version: 1.0.3
- Build: 15
- "✅ Android project updated"

### Step 3: Build and Sync

```bash
npm run build
npx cap sync android
```

### Step 4: Open Android Studio

```bash
npx cap open android
```

This ensures you open the correct project at `~/regimen-health-hub/regimen/android`

### Step 5: Generate Signed AAB

1. Wait for Gradle sync to complete (bottom progress bar)
2. Menu: **Build → Generate Signed Bundle / APK**
3. Select **Android App Bundle** → Next
4. **Keystore path**: `/Users/Zen/regimen-health-hub/regimen-keystore.jks`
5. **Key alias**: `regimen`
6. **Passwords**: Enter your keystore password
7. Click **Next**
8. Select **release** build variant
9. Click **Create**

### Step 6: Find Your AAB

After build completes, check Android Studio's **Event Log** (bottom right) - it will show the exact path, typically:

```
android/app/release/app-release.aab
```

### Step 7: Upload to Play Console

1. Go to [Google Play Console](https://play.google.com/console)
2. Select **Regimen**
3. Navigate to **Testing → Internal testing**
4. Click **Create new release**
5. Upload your `.aab` file
6. Release notes: `Internal test build - v1.0.3 (Build 15)`
7. **Review and roll out**

### Step 8: Add Testers

1. Go to **Testing → Internal testing → Testers**
2. Create email list with your email + beta tester's email
3. Share the opt-in link with testers

---

## How to Check Build Number in Android Studio

If you ever need to verify the version in Android Studio:

1. Open **android/app/build.gradle** in the left file tree
2. Look for these lines:

```groovy
versionCode 15
versionName "1.0.3"
```

The `versionCode` is what Play Store uses to determine if a build is newer.

---

## File to Modify

| File | Change |
|------|--------|
| `capacitor.config.ts` | `appBuild = '14'` → `appBuild = '15'` |
