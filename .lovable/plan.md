

# Hide Google Sign-In on All Platforms

## What
Remove the Google Sign-In button and "Or continue with email" divider from the login/signup screen on every platform (web, iOS, and Android) until it's properly tested and configured.

## Why
- Android: confirmed broken (crashes with scope error)
- iOS: untested, native plugin registration for SocialLogin is missing from MainViewController.swift
- Web: untested, may or may not work via OAuth redirect

No point showing a button that could fail on any platform. We'll bring it back when it's properly set up.

## Scope
One file, one small change. Replacing the Android-only check with a full hide.

## Technical Details

### File: `src/pages/Auth.tsx`

**Change:** Replace the `{!isAndroidNative && (...)}` conditional block (lines 593-621) with nothing -- just remove the Google button and divider entirely. Also remove the `isAndroidNative` variable (line 28) since it's no longer needed.

The `handleGoogleSignIn` function can stay in the code for now (dead code) so we don't lose the logic when we're ready to re-enable it later.

## Impact
- Zero impact on existing users or accounts
- Login/signup screen will just show the email/password form on all platforms
- No one's current sign-in method changes

