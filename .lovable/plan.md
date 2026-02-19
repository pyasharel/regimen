

## Fix: Android Session Loss After Extended Idle

### The Problem

Android's WebView can wipe `localStorage` when your app has been backgrounded for a long time (days). Since the Supabase auth token is stored in `localStorage`, this means users get signed out after the app sits idle. The auth token mirror (Capacitor Preferences / native storage) exists as a backup, but it's not being used early enough during boot to prevent the sign-out.

### Root Cause

The current boot flow is:
1. `main.tsx` calls `recreateSupabaseClient()` -- new client has no session (localStorage was wiped)
2. `ProtectedRoute` tries fast-path from localStorage -- fails (wiped)
3. Slow path tries `supabase.auth.getSession()` -- no session in client
4. Cache hydration tries `getCachedSessionForHydration()` -- reads localStorage again, still empty
5. Mirror restore tries `restoreSessionFromMirror()` -- loads from Capacitor Preferences, BUT the token may be expired (days old), so `setSession()` refresh fails
6. User gets redirected to `/auth`

### The Fix (3 changes)

**1. Pre-hydrate localStorage from Capacitor Preferences before Supabase client creation**

In `main.tsx`, before `recreateSupabaseClient()` runs, read the auth token mirror from Capacitor Preferences and write it back into `localStorage`. This way the recreated Supabase client immediately picks up the token, and Supabase's built-in auto-refresh handles expiry.

```text
Boot flow (before):
  recreateSupabaseClient() --> empty client (localStorage wiped)
  
Boot flow (after):
  Read mirror from Preferences --> write to localStorage
  recreateSupabaseClient() --> client has token, auto-refreshes
```

**2. Save the full Supabase auth token blob to the mirror (not just access/refresh)**

Currently the mirror saves only `access_token`, `refresh_token`, `expires_at`, and `user_id`. But Supabase's localStorage key stores a richer object. We should mirror the entire token blob so we can restore it byte-for-byte into localStorage, making the recreated client think nothing changed.

**3. Add a "mirror write-back" step in `handleAppBecameActive` (resume path)**

When the app resumes after a cold start (>30s background), before recreating clients, check if localStorage auth token is missing but mirror exists, and restore it. This covers the resume path in addition to cold boot.

### Additional Hardening

- **Notification permission state**: Already stored in Capacitor Preferences (survives localStorage wipe) -- no changes needed.
- **Build version**: User is on Build 39. Build 43 already has other stability fixes. These changes go into Build 44.

### Files to Change

| File | Change |
|------|--------|
| `src/utils/authTokenMirror.ts` | Save full token blob; add `writeBackToLocalStorage()` export |
| `src/main.tsx` | Call mirror write-back before `recreateSupabaseClient()` on native |
| `src/hooks/useAppStateSync.tsx` | Call mirror write-back before client recreation on cold resume |

### Testing Checklist

- Sign in on Android, background the app for 10+ minutes, reopen -- should stay signed in
- Clear localStorage manually via dev tools, reopen app -- mirror should restore session
- Notifications should still fire after long idle periods
- iOS should be unaffected (same flow, but iOS rarely wipes localStorage)

