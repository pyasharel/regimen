# Memory: fixes/android-signout-auth-preservation-fix
Updated: now

## Issue
Android beta testers reported being signed out after the app sat idle for extended periods (days). The Android WebView can wipe `localStorage` under memory pressure, destroying the Supabase auth token. The auth token mirror in Capacitor Preferences existed but was restored too late — after the Supabase client was already created without a session.

## Fix Applied (Build 44+)
Three-part fix to pre-hydrate localStorage from the native mirror BEFORE client creation:

### 1. Pre-hydrate in `main.tsx` boot sequence
- Before `recreateSupabaseClient()`, read the mirror blob from `Capacitor Preferences` and write it back to `localStorage`
- Uses a 600ms timeout to avoid blocking boot
- Skips if localStorage already has a valid token
- The recreated client then finds the token immediately and auto-refreshes

### 2. Full blob mirroring in `authTokenMirror.ts`
- Changed from saving only `access_token/refresh_token/expires_at/user_id` to saving the ENTIRE Supabase localStorage blob
- Added `writeBackToLocalStorage()` export that reads the mirror and writes it back to localStorage
- `saveFullBlobToMirror()` reads directly from `localStorage[SUPABASE_AUTH_TOKEN_KEY]` on auth state changes

### 3. Mirror write-back on app resume in `useAppStateSync.tsx`
- Before client recreation on cold resume (>30s background), calls `writeBackToLocalStorage()`
- This covers the resume path in addition to cold boot

## Code Pattern
```
Boot flow:
  preHydrateAuthFromMirror() → writes mirror blob to localStorage
  recreateSupabaseClient()   → client finds token, auto-refreshes
  
Resume flow:
  writeBackToLocalStorage()  → restores if localStorage was wiped
  recreateSupabaseClient()   → client has session
```

## Previous Fix (Build 29+)
The earlier fix preserved the auth token key during failed-boot recovery cleanup. That fix remains in place. This new fix handles the separate case where Android's WebView itself wipes localStorage during extended idle.
