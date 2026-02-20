# Memory: deployment/native-version-sync-workflow
Updated: 2026-02-20

## ⚠️ FIRST DIAGNOSTIC STEP — Before anything else, confirm Android Studio title bar

**If the device shows old code after Clean + Rebuild + Run:**
- Check Android Studio title bar — it MUST end in `.../regimen-health-hub/android`
- If it shows ANY nested path (e.g. `.../regimen-health-hub/regimen/android`), **STOP**
- Close Android Studio, then run: `npx cap open android`
- Then run the full chain again

**This is the #1 cause of stale builds. Check this FIRST before any other debugging.**

---

## ⚠️ CRITICAL RULE — ALWAYS GIVE THE FULL CHAIN
Any time a code change needs to reach the physical device, ALWAYS give the user the full command chain below. NEVER skip `git pull`. NEVER say "just run npx cap sync". The device will keep running stale code otherwise.

---

## Android — Full Sync Chain (ALWAYS use this for device testing)
```bash
cd ~/regimen-health-hub
git pull && npm install && npm run build && npx cap update android && ./sync-version.sh
```
Then in **Android Studio**:
1. Build → Clean Project
2. Build → Rebuild Project
3. **Uninstall** the app from the device
4. Click Run ▶

## iOS — Full Sync Chain (ALWAYS use this for device testing)
```bash
cd ~/regimen-health-hub
git pull && npm install && npm run build && npx cap update ios && cd ios/App && pod install && cd ../.. && ./sync-version.sh
```
Then in **Xcode**:
1. Hold Option → Product → Clean Build Folder
2. Delete the app from the phone
3. Click Run ▶

---

## Why each step matters
- `git pull` — pulls Lovable's latest committed code. WITHOUT this, the device gets stale code no matter what was changed in Lovable.
- `npm install` — ensures any new deps are installed
- `npm run build` — compiles the fresh web bundle
- `npx cap update android/ios` — MORE THOROUGH than `npx cap sync`; updates native deps AND copies web assets
- `./sync-version.sh` — MUST run LAST; prevents `cap update` from resetting native build numbers (CURRENT_PROJECT_VERSION, MARKETING_VERSION)
- Clean + Uninstall — clears Android WebView cache and stale Xcode artifacts

## Verifying the fix reached the device
- Check Logcat (Android) or Safari Web Inspector (iOS) for the latest version tag in logs (e.g. `[BannerGuard v5]`)
- Check Settings → Help for Bundle timestamp — should match when `npm run build` was run
- The JS bundle hash in Logcat should change after a fresh build (e.g. from `Ddsv-A9r` to a new hash)

## For App Store / Play Store releases
- `appVersion` and `appBuild` in `capacitor.config.ts` are the source of truth
- `./sync-version.sh` writes those values into native project files — must run AFTER cap update/sync
- Local project path: `/Users/Zen/regimen-health-hub` (shell alias: `regimen`)

---

## ⚠️ CRITICAL: Always Open the IDE from the Correct Project
**The #1 cause of "changes not appearing" is Android Studio or Xcode opening the wrong project directory.**

### WRONG way (leads to stale builds):
- Double-clicking an `.xcworkspace` or `build.gradle` file from Finder
- Using a "recent projects" shortcut in Android Studio/Xcode that points to a nested or old directory

### CORRECT way — always use npx cap open:
```bash
cd ~/regimen-health-hub
npx cap open android   # Opens Android Studio on the correct project
npx cap open ios       # Opens Xcode on the correct project
```

This guarantees the IDE is pointed at `~/regimen-health-hub/android` (or `ios`), not a stale nested copy.

### How to verify you're in the right project in Android Studio:
- The title bar should show a path ending in `.../regimen-health-hub/android`
- NOT `.../regimen-health-hub/regimen/android` or any nested path
- If you see a nested path, close Android Studio and reopen using `npx cap open android`
