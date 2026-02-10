

# Fix Password Reset Flow on Android (and Harden iOS)

## Problem
When an Android user clicks the password reset link in their email, it opens in Chrome instead of the native app. This is because Android App Links domain verification is unreliable — the link to `https://getregimen.app/auth?mode=reset` falls through to the browser instead of being intercepted by the app.

## Solution
Use a two-part approach that's the industry standard for this exact problem:

1. Change the password reset redirect URL to use the **custom scheme** (`regimen://auth?mode=reset`) which is guaranteed to open the native app on both platforms
2. Add handling in `App.tsx` deep link handler to recognize and route this URL to the password reset screen
3. Keep the `https://getregimen.app` fallback for web users (non-native)

## Why This Is Better
- Custom scheme links (`regimen://`) are **guaranteed** to open the native app if installed — no domain verification needed
- App Links (`https://`) are "best effort" on Android and can silently fail
- This is how most production apps handle deep links for critical flows

## Technical Details

### File 1: `src/pages/Auth.tsx` (~line 266)
Change the `redirectTo` URL to detect platform and use the appropriate scheme:

```typescript
// For native apps, use custom scheme which is guaranteed to open the app
// For web, use the production domain
const isNative = Capacitor.isNativePlatform();
const redirectUrl = isNative 
  ? 'regimen://auth?mode=reset'
  : 'https://getregimen.app/auth?mode=reset';

const { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: redirectUrl,
});
```

### File 2: `src/components/settings/AccountSettings.tsx` (~line 143)
Same change — this file also triggers password resets:

```typescript
const isNative = Capacitor.isNativePlatform();
const redirectUrl = isNative 
  ? 'regimen://auth?mode=reset'
  : 'https://getregimen.app/auth?mode=reset';

const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
  redirectTo: redirectUrl,
});
```

### File 3: `src/App.tsx` (in the `AnalyticsWrapper` deep link handler)
Add handling for the `/auth` path in the `appUrlOpen` listener so when the custom scheme link is opened, the app navigates to the reset screen:

```typescript
// Handle password reset deep links
if (url.includes('/auth') || url.includes('auth?mode=reset')) {
  console.log('[DEEP-LINK] Password reset link detected');
  navigate('/auth?mode=reset', { replace: true });
  return;
}
```

## Scope
- 3 files, small targeted changes
- No database changes, no new dependencies
- Works for both Android and iOS
- Web users unaffected (still uses `https://` redirect)

## Important Note
After this change ships, the beta tester will need to be on a build that includes this fix. If he's on an older build, the old `https://` redirect will still be used. This is another reason to move him to production after publishing a new build.

