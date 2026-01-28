

## Remove USE_EXACT_ALARM Permission

A one-line fix to remove the restricted permission that Google Play Console is flagging.

### What I'll Change

**File:** `android/app/src/main/AndroidManifest.xml`

Remove this line:
```xml
<uses-permission android:name="android.permission.USE_EXACT_ALARM" />
```

Keep this line (it's the correct one for medication reminders):
```xml
<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
```

### Your Steps After I Make the Change

1. **Git pull** the updated code to your local project
2. **Rebuild** from your project root:
   ```bash
   npm run build
   npx cap sync android
   ```
3. **Open Android Studio** and do: Build → Clean Project
4. **Generate new signed AAB**: Build → Generate Signed Bundle / APK
5. **Upload new AAB** to Google Play Console (Closed Testing track)

The new version will no longer trigger the "Exact alarms" permission request.

---

### Technical Note

- `USE_EXACT_ALARM` = Restricted, requires Google approval (alarm/timer apps only)
- `SCHEDULE_EXACT_ALARM` = Standard permission for apps needing precise scheduling (medication reminders qualify)

