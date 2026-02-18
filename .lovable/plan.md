

# Version Bump to 1.0.9 (Build 40)

Update the version constants in `capacitor.config.ts`:

- `appVersion`: keep as `'1.0.9'` (already set)
- `appBuild`: change from `'39'` to `'40'`

That's the only file change needed. After publishing from Lovable, you'll run `./sync-version.sh` locally to propagate the new build number to your Xcode and Android Studio projects before archiving.

