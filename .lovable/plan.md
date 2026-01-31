
# Build 30: Notification-Entry Session Preservation Fix

## Summary

This build fixes the issue where tapping a notification (especially after hours in the background) incorrectly routes users to the onboarding screen, making it appear they were signed out.

**Root Cause**: `src/pages/Splash.tsx` only checks localStorage for cached sessions. On iOS cold starts from notifications, localStorage can be temporarily unavailable, but valid tokens exist in the **native token mirror** (Capacitor Preferences). The current logic doesn't consult the mirror before deciding to route to onboarding.

**Solution**: Update Splash.tsx to check for tokens in *both* localStorage AND the native mirror before routing to onboarding. If tokens exist anywhere, route to `/today` and let `ProtectedRoute` handle session restoration.

---

## What Changes

### File: `src/pages/Splash.tsx`

**Current behavior:**
1. Check `getCachedSession()` from localStorage (fast-path)
2. If miss, call `supabase.auth.getSession()` with 3-second timeout
3. If no session or timeout → navigate to `/onboarding`

**New behavior:**
1. Check `getCachedSession()` from localStorage (fast-path) → if valid, go to `/today`
2. Check `hasAnyAuthTokens()` which checks BOTH localStorage AND native mirror
3. If tokens exist anywhere → navigate to `/today` (let ProtectedRoute handle hydration)
4. Only if NO tokens anywhere → navigate to `/onboarding`

This removes the unreliable `supabase.auth.getSession()` call from Splash entirely, since that's prone to timeout/deadlock during iOS cold starts.

### File: `capacitor.config.ts`

Update build number:
```text
export const appBuild = '29';  →  export const appBuild = '30';
```

---

## Technical Implementation Details

### Updated Splash.tsx Logic

```typescript
// NEW: Import hasAnyAuthTokens to check both localStorage and native mirror
import { hasAnyAuthTokens } from "@/utils/safeAuth";

// In the useEffect:

// Fast-path: Check localStorage cache synchronously
const cachedSession = getCachedSession();
if (cachedSession && !hasNavigated.current) {
  console.log('[Splash] Fast-path: Valid cached session');
  hasNavigated.current = true;
  navigate("/today", { replace: true });
  return;
}

// Medium-path: Check if we have tokens anywhere (localStorage OR native mirror)
// If tokens exist, route to /today and let ProtectedRoute handle hydration
const checkTokensAndRoute = async () => {
  if (hasNavigated.current) return;
  
  const hasTokens = await hasAnyAuthTokens();
  
  if (hasNavigated.current) return;
  hasNavigated.current = true;
  
  if (hasTokens) {
    console.log('[Splash] Tokens found (mirror-path), routing to /today');
    navigate('/today', { replace: true });
  } else {
    console.log('[Splash] No tokens anywhere, routing to /onboarding');
    navigate('/onboarding', { replace: true });
  }
};

checkTokensAndRoute();
```

### Why This Works

1. **Fast-path preserved**: If localStorage has a valid cached session, we still navigate instantly to `/today`

2. **Mirror-path added**: If localStorage fails but native mirror has tokens, we still route to `/today` where `ProtectedRoute` will:
   - Show "Restoring your session..."
   - Call `hydrateSessionOrNull()` which tries `restoreSessionFromMirror()`
   - Successfully restore the session

3. **Only route to onboarding when truly logged out**: `hasAnyAuthTokens()` returns false only when there are no tokens in localStorage AND no tokens in native storage

4. **Removes unreliable getSession call**: The current 3-second timeout on `supabase.auth.getSession()` is problematic during iOS cold starts. By removing it from Splash and letting ProtectedRoute handle hydration, we get more robust behavior.

---

## Diagnostic Logging

Splash.tsx will log the decision path for easier debugging:

- `[Splash] Fast-path: Valid cached session, navigating to /today`
- `[Splash] Mirror-path: Tokens found, navigating to /today`
- `[Splash] No tokens anywhere, navigating to /onboarding`

---

## Version and Build

| Platform | Version | Build |
|----------|---------|-------|
| iOS      | 1.0.5   | 30    |
| Android  | 1.0.5   | 30    |

The version stays at 1.0.5 since this is a hotfix. Only the build number increases.

---

## Release Workflow

After approval, you'll need to run these commands locally:

```bash
git pull && npm install && npm run build && ./sync-version.sh && npx cap sync
```

Then:
- **iOS**: Open Xcode (`npx cap open ios`), Archive, upload to TestFlight
- **Android**: Open Android Studio (`npx cap open android`), generate signed AAB, upload to Play Console

---

## Test Plan

### Test 1: Notification Cold Start (Primary Bug)
1. Sign in and ensure everything works
2. Background the app for 30+ minutes (or force-close it)
3. Wait for an engagement or dose notification
4. Tap the notification
5. **Expected**: Brief "Restoring your session..." → lands on `/today`
6. **Not expected**: Landing on onboarding or sign-in

### Test 2: Expired Token Scenario
1. Sign in
2. Wait several hours (long enough for access token to expire)
3. Tap a notification
4. **Expected**: Session restored via refresh token, lands on `/today`

### Test 3: Fresh Install Regression
1. Delete the app
2. Reinstall from TestFlight
3. Open the app
4. **Expected**: Should land on onboarding (no tokens exist)

### Test 4: Normal App Open
1. Sign in, use the app normally
2. Close the app (don't force-close)
3. Reopen by tapping app icon
4. **Expected**: Fast-path to `/today`, no visible loading

---

## Files Modified

| File | Change |
|------|--------|
| `src/pages/Splash.tsx` | Add token-mirror check before routing to onboarding |
| `capacitor.config.ts` | Bump `appBuild` from '29' to '30' |

---

## Risk Assessment

**Low risk**: This change is additive and conservative:
- The fast-path (localStorage cache) is unchanged
- We're adding a fallback check, not changing existing logic
- If `hasAnyAuthTokens()` fails or times out (it has internal timeouts), we fall through to onboarding as before
- ProtectedRoute already handles token-mirror restoration, so routing to `/today` with mirror tokens is a tested path
