
# v1.0.7 Release (Build 35)

## What's Included in This Release

Changes since v1.0.6 that will ship with this update:

1. GA4 iOS platform detection fix (users were being tagged as "web" instead of "ios")
2. CJC-1295 / Ipamorelin blend added to compound catalog
3. Welcome email fixes (coral checkmarks + landing page CTA link)

---

## Code Change

### File: `capacitor.config.ts`

Update version and build number:

```
appVersion = '1.0.7'
appBuild = '35'
```

This is the only code change needed. The welcome email fix (edge function) is already deployed. Everything else is already in the codebase.

---

## After Approval: Your Build Steps

### iOS (TestFlight / App Store)
1. git pull
2. ./sync-version.sh
3. npm run build
4. npx cap sync ios
5. Open Xcode: npx cap open ios
6. Product -> Archive -> Upload to App Store Connect
7. Submit for review (keep current ASO keywords -- too early to change)

### Android (Google Play)
1. git pull
2. ./sync-version.sh
3. npm run build
4. npx cap sync android
5. Open Android Studio: npx cap open android
6. Build -> Generate Signed Bundle
7. Upload to Google Play Console -> Production track

---

## ASO Recommendation

Keep current keywords unchanged for this release. Rationale:
- Only ~5 days since last keyword update -- Apple needs 1-2 weeks minimum to re-index
- The "testosterone broad" Apple Ads campaign showing 4-6 installs validates your targeting
- Evaluate keyword rankings with your ASO tool around Feb 16-19 before making changes
- Consider updating keywords with v1.0.8 if data shows opportunities

---

## Android Monitoring Checklist

After this release, check these to verify Android health:
- Google Play Console -> Statistics for download/install counts
- RevenueCat Dashboard -> filter by Google Play store
- GA4 -> filter by user_platform = "android" (now that platform detection is fixed)
