

# Quick Fix: Stop Rejecting Sessions That Can Be Refreshed

## The Bug (Confirmed)

In `authSessionCache.ts`, line 46-54:
```typescript
// Check if token is expired (with 5 minute buffer for safety)
const expiresAtMs = parsed.expires_at * 1000;
const bufferMs = 5 * 60 * 1000; // 5 minutes
const isExpired = expiresAtMs < Date.now() + bufferMs;

if (isExpired) {
  console.log('[AuthCache] Cached session expired or expiring soon');
  return null;  // ← THIS IS THE PROBLEM
}
```

Access tokens typically expire in 1 hour. If the user opens the app 55+ minutes after their last session refresh, the 5-minute buffer kicks in, cache returns `null`, and the app thinks there's no session → redirect to `/auth`.

But the **refresh_token is still valid** and can get a new access token. We're not using it.

## The Fix

**File: `src/utils/authSessionCache.ts`**

Create a new function that returns cached tokens even if the access token is expired (as long as refresh_token exists), and rename the strict check:

```typescript
/**
 * Returns cached session tokens for hydration attempts.
 * Does NOT check access_token expiry - we rely on setSession() to refresh.
 * Only returns null if there's genuinely no cached data.
 */
export const getCachedSessionForHydration = (): CachedSession | null => {
  try {
    const key = `sb-${SUPABASE_PROJECT_ID}-auth-token`;
    const cached = localStorage.getItem(key);
    
    if (!cached) {
      console.log('[AuthCache] No cached session found');
      return null;
    }
    
    const parsed = JSON.parse(cached);
    
    // Only require refresh_token - that's what setSession needs
    if (!parsed.refresh_token) {
      console.log('[AuthCache] No refresh token in cache');
      return null;
    }
    
    console.log('[AuthCache] Found cached tokens for hydration');
    return parsed as CachedSession;
  } catch (error) {
    console.warn('[AuthCache] Error reading cached session:', error);
    return null;
  }
};
```

**File: `src/utils/safeAuth.ts`**

Update line 68 to use the new function:
```typescript
// Step 2: Try to hydrate from cached tokens
console.log('[SafeAuth] Falling back to cache hydration...');
const cached = getCachedSessionForHydration(); // ← Use new function

if (!cached?.refresh_token) {
  console.log('[SafeAuth] No refresh token available, user is not authenticated');
  return null;
}
```

## Why This Works

- `supabase.auth.setSession({ access_token, refresh_token })` will automatically refresh an expired access token using the refresh token
- Refresh tokens are valid for much longer (typically 7+ days by default)
- We only need to check that we HAVE tokens, not that they're unexpired

## Files to Change

1. `src/utils/authSessionCache.ts` - Add `getCachedSessionForHydration()` that skips expiry check
2. `src/utils/safeAuth.ts` - Use new function in `hydrateSessionOrNull()`

## What the Logs Will Show After Fix

When access token is expired but refresh token is valid:
```
[AuthCache] Found cached tokens for hydration
[SafeAuth] Calling setSession with cached tokens...
[SafeAuth] Cache hydration succeeded in 200 ms
```

Instead of current behavior:
```
[AuthCache] Cached session expired or expiring soon
[SafeAuth] No cached tokens available, user is not authenticated
→ Redirect to /auth
```

## Testing

1. Build and run on device
2. Wait 55+ minutes (or manually advance device clock)
3. Hard close and reopen
4. Should see "Restoring session" briefly, then load data - NOT redirect to login

