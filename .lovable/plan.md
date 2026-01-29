

# Fix: Auth Deadlock Causing Blank Screen / "Restoring your session..." Loop

## Summary
Multiple users (iOS and Android) are stuck on "Restoring your session..." because the Supabase auth system is deadlocked. The fix is to make ProtectedRoute trust the cached session that Splash already validated, avoiding concurrent auth calls.

## Root Cause (from your Xcode logs)

The logs show this exact sequence:

```text
✅ [Splash] Fast-path: Valid cached session found, navigating immediately
✅ [SubscriptionContext] Auth event: SIGNED_IN  
✅ [AuthMirror] Auth state change: SIGNED_IN
↓
🔄 [ProtectedRoute] Starting session hydration attempt 1
🔄 [SafeAuth] Attempting getSession...
↓
⏰ [SafeAuth] getSession timed out (8 seconds)
⏰ [SafeAuth] setSession timed out (2 seconds)  
⏰ [ProtectedRoute] Watchdog triggered after 12000 ms
```

**What's happening:**
1. Splash validates the session (works fine)
2. Navigation to `/today` triggers SubscriptionContext mount
3. SubscriptionContext calls `supabase.auth.getUser()` internally
4. ProtectedRoute mounts and calls `supabase.auth.getSession()`
5. Both calls compete for Supabase's **global auth lock**
6. One call blocks the other → **deadlock** → all auth calls time out

## The Fix

### Strategy: Trust the Cache, Skip the Lock

Since Splash already validated the session using the localStorage cache, ProtectedRoute should check that cache first and only call Supabase auth methods if the cache is empty or invalid.

```text
┌──────────────────────────────────────────────────────────────────┐
│                     CURRENT (Deadlocks)                          │
├──────────────────────────────────────────────────────────────────┤
│  Splash validates cache → navigates                             │
│  ProtectedRoute calls getSession() ← blocks on auth lock        │
│  SubscriptionContext calls getUser() ← holds auth lock          │
│  = Deadlock                                                      │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                     FIXED (No Deadlock)                          │
├──────────────────────────────────────────────────────────────────┤
│  Splash validates cache → navigates                             │
│  ProtectedRoute checks cache first:                             │
│    - Cache valid? → Use cached session, skip auth calls         │
│    - Cache empty? → Call getSession() (only when necessary)     │
│  = No contention                                                 │
└──────────────────────────────────────────────────────────────────┘
```

---

## Technical Changes

### File 1: `src/components/ProtectedRoute.tsx`

**Add fast-path that trusts the localStorage cache:**

- Before calling any async Supabase auth methods, check if we have a valid cached session
- If the cache is valid (not expired, has user ID), construct a Session object from it
- Only fall back to `hydrateSessionOrNull()` if the cache is missing or invalid

### File 2: `src/utils/authSessionCache.ts`

**Add a helper to construct a usable Session from cache:**

- Create `getCachedSessionAsSupabaseSession()` that returns a properly typed Session object
- This avoids calling Supabase auth methods entirely when we have valid cache

### File 3: `src/utils/safeAuth.ts`

**Add a fast-path check:**

- Create `getSessionFromCacheOrHydrate()` that checks cache first
- Only calls `hydrateSessionOrNull()` if cache is unavailable

---

## Code Changes

### ProtectedRoute.tsx - Add Cache Fast-Path

```typescript
// NEW: Fast-path check using localStorage cache
const tryFastPath = useCallback((): Session | null => {
  console.log('[ProtectedRoute] Checking cache fast-path...');
  const cached = getCachedSessionAsSupabaseSession();
  
  if (cached) {
    console.log('[ProtectedRoute] ✅ Fast-path: Using cached session, skipping auth calls');
    return cached;
  }
  
  return null;
}, []);

// In attemptHydration:
const attemptHydration = useCallback(async (): Promise<void> => {
  // TRY CACHE FIRST - avoids auth lock contention
  const fastPathSession = tryFastPath();
  if (fastPathSession) {
    setSession(fastPathSession);
    setHydrationState('hydrated');
    clearWatchdog();
    return;
  }
  
  // Only call Supabase auth if cache is unavailable
  const hydratedSession = await hydrateSessionOrNull(HYDRATION_TIMEOUT_MS);
  // ... rest of existing logic
}, []);
```

### authSessionCache.ts - Add Session Constructor

```typescript
/**
 * Constructs a Supabase-compatible Session object from the localStorage cache.
 * Returns null if cache is missing, invalid, or expired.
 * 
 * Use this to avoid calling supabase.auth.getSession() which can deadlock.
 */
export const getCachedSessionAsSupabaseSession = (): Session | null => {
  const cached = getCachedSession(); // Existing function with expiry check
  
  if (!cached) {
    return null;
  }
  
  // Construct a Session object that matches Supabase's type
  return {
    access_token: cached.access_token,
    refresh_token: cached.refresh_token,
    expires_at: cached.expires_at,
    expires_in: cached.expires_at - Math.floor(Date.now() / 1000),
    token_type: 'bearer',
    user: {
      id: cached.user.id,
      email: cached.user.email,
      // ... minimal required fields
    } as User,
  };
};
```

---

## Why This Works

1. **No auth lock contention:** ProtectedRoute reads from localStorage (synchronous, instant) instead of calling `getSession()`
2. **Splash already validated:** If Splash's fast-path succeeded, the cache is definitely valid
3. **Fallback preserved:** If cache is missing (new user), we still call `hydrateSessionOrNull()` 
4. **Works on both platforms:** localStorage is available on iOS and Android

---

## Edge Cases Handled

| Scenario | Behavior |
|----------|----------|
| Valid cache exists | Use immediately, skip Supabase calls |
| Cache expired | Fall back to `hydrateSessionOrNull()` |
| No cache (new user) | Fall back to `hydrateSessionOrNull()` |
| Token about to expire | Supabase auto-refreshes on next API call |
| Session was invalidated | RLS will fail, user gets redirected to auth |

---

## Deployment

This is a **frontend-only change** that requires a new TestFlight/Play Store build. The server-side Stripe fix we already deployed remains in place and helps with overall performance.

---

## Immediate Workaround for Current Users

While waiting for the new build:
1. **Force-close the app, wait 30+ seconds, then reopen** - sometimes the auth lock releases
2. **Delete and reinstall the app** - guaranteed to work
3. **Clear app data** (Android: Settings → Apps → Regimen → Clear Data)

---

## Verification Steps

After deploying the new build:
1. Install the update
2. Log in normally
3. Force-close the app
4. Reopen immediately
5. App should load instantly (no "Restoring your session..." spinner)

The key indicator of success: the logs should show `[ProtectedRoute] ✅ Fast-path: Using cached session` instead of `[SafeAuth] Attempting getSession...`

