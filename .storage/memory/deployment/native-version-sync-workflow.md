# Memory: deployment/native-version-sync-workflow
Updated: 2026-02-20

## The Problem
`npx cap sync` copies web assets but can overwrite native build numbers.
`./sync-version.sh` MUST run AFTER `npx cap sync` so it doesn't get overwritten.

## Full Deployment Command (run from project root)
**ORDER MATTERS — sync-version.sh goes last:**

```bash
git pull && npm install && npm run build && npx cap sync && ./sync-version.sh
```

## After Running That Command

### iOS (TestFlight):
1. Open Xcode: `npx cap open ios`
2. Confirm build number is correct in General tab (should match appBuild in capacitor.config.ts)
3. Product → Archive → Distribute

### Android (Play Store):
1. Open Android Studio: `npx cap open android`
2. Build → Generate Signed Bundle / APK
3. Upload AAB to Play Console

## Key Facts
- `appVersion` and `appBuild` in `capacitor.config.ts` are the source of truth
- `./sync-version.sh` writes those values into native project files — must run AFTER cap sync
- If phone still shows old build: delete app from phone, then reinstall from Xcode/TestFlight
- Local project path: `/Users/Zen/regimen-health-hub`
