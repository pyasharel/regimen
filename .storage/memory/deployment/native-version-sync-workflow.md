# Memory: deployment/native-version-sync-workflow
Updated: 2026-02-20

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
- Check Logcat (Android) or Safari Web Inspector (iOS) for the latest version tag in logs (e.g. `[BannerGuard v4]`)
- Check Settings → Help for Bundle timestamp — should match when `npm run build` was run

## For App Store / Play Store releases
- `appVersion` and `appBuild` in `capacitor.config.ts` are the source of truth
- `./sync-version.sh` writes those values into native project files — must run AFTER cap update/sync
- Local project path: `/Users/Zen/regimen-health-hub` (shell alias: `regimen`)
