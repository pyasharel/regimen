# Memory: deployment/native-version-sync-workflow
Updated: 2026-02-20

## The Problem
`npx cap sync` copies web assets but does NOT update native build numbers.
`./sync-version.sh` updates the iOS `project.pbxproj` and Android `build.gradle` with the correct version/build numbers.
Xcode can still cache old build numbers — must do a Clean Build Folder in Xcode after syncing.

## Full Deployment Command (run from project root)

```bash
git pull && npm install && ./sync-version.sh && npm run build && npx cap sync
```

## After Running That Command

### iOS (TestFlight):
1. Open Xcode: `npx cap open ios`
2. Cmd+Shift+K — Clean Build Folder
3. Confirm build number is correct in General tab (should match appBuild in capacitor.config.ts)
4. Product → Archive → Distribute

### Android (Play Store):
1. Open Android Studio: `npx cap open android`
2. Build → Generate Signed Bundle / APK
3. Upload AAB to Play Console

## Key Facts
- `appVersion` and `appBuild` in `capacitor.config.ts` are the source of truth
- `./sync-version.sh` writes those values into native project files
- Xcode "Clean Build Folder" (Cmd+Shift+K) is required after every sync to avoid stale builds
- If phone still shows old build: delete app from phone, then reinstall from Xcode/TestFlight
- Local project path: `/Users/Zen/regimen-health-hub`
