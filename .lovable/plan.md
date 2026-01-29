
# Fix Loading Screen Hang After Notification Permission Request

## Problem Summary
After enabling notifications in onboarding, returning to the app causes it to get stuck on "Loading..." indefinitely. The "Loading..." screen is from `ProtectedRoute.tsx`, indicating that `supabase.auth.getSession()` is hanging and never resolving.

## Root Cause
When the user taps "Enable Reminders", iOS shows a system permission dialog. This triggers multiple rapid `appStateChange` events with `isActive: false` (visible in Xcode logs). When the user returns, the Supabase auth session check in `ProtectedRoute` hangs, likely due to:
1. Race conditions from rapid background/foreground cycling during the permission prompt
2. The Supabase client's internal state becoming confused
3. `onAuthStateChange` not firing as expected

## Solution Overview
Implement a **timeout-protected session check with fast-path fallback** in `ProtectedRoute.tsx`. If the Supabase session check hangs for more than 3 seconds, fall back to checking localStorage for a cached session (similar to what we did in `Splash.tsx`).

## Technical Changes

### 1. Update ProtectedRoute with Timeout Protection
**File: `src/components/ProtectedRoute.tsx`**

Add a timeout wrapper around `getSession()` and use the cached session as a fast fallback:

```text
Current Flow (Broken):
  ProtectedRoute mounts
         ↓
  supabase.auth.getSession() called
         ↓
  [HANGS FOREVER after permission dialog]
         ↓
  loading: true stays forever
         ↓
  User sees "Loading..." forever

New Flow (Resilient):
  ProtectedRoute mounts
         ↓
  Start 3-second timeout race
         ↓
  supabase.auth.getSession() called
         ↓
  If hangs → timeout fires → check localStorage cache
         ↓
  If cache valid → use cached session → render children
  If cache invalid → redirect to /auth
```

Key changes:
- Import `getCachedSession` from the auth cache utility
- Race `getSession()` against a 3-second timeout
- If timeout wins, check localStorage for cached session
- If cached session exists and not expired, use it
- If no cached session, redirect to auth

### 2. Add Resilience to Auth State Change Handling
Ensure that even if `onAuthStateChange` fires with stale data during background transitions, we don't reset the session incorrectly.

### 3. Add Debounce Protection in useAppStateSync
The `useAppStateSync` hook runs heavy operations on every `appStateChange`. During permission dialogs, this can trigger multiple times in quick succession. Add a debounce to prevent rapid-fire execution.

## File Changes Summary

| File | Change |
|------|--------|
| `src/components/ProtectedRoute.tsx` | Add timeout-protected session check with localStorage fallback |
| `src/hooks/useAppStateSync.tsx` | Add debounce to prevent rapid-fire execution during permission dialogs |

## Implementation Details

### ProtectedRoute.tsx Changes
```typescript
// Pseudocode for the new flow
const TIMEOUT_MS = 3000;

useEffect(() => {
  let isMounted = true;
  
  const checkSession = async () => {
    try {
      // Race getSession against timeout
      const result = await Promise.race([
        supabase.auth.getSession(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS)
        )
      ]);
      
      if (isMounted) {
        setSession(result.data.session);
        setLoading(false);
      }
    } catch (error) {
      // Timeout or error - fall back to cached session
      console.warn('[ProtectedRoute] Session check timed out, checking cache');
      const cached = getCachedSession();
      
      if (isMounted) {
        if (cached) {
          // Create a minimal session object from cache
          setSession(cached as Session);
        }
        setLoading(false);
      }
    }
  };
  
  checkSession();
  
  // Auth state listener remains unchanged
  const { data: { subscription } } = supabase.auth.onAuthStateChange(...);
  
  return () => {
    isMounted = false;
    subscription.unsubscribe();
  };
}, []);
```

### useAppStateSync.tsx Debounce
```typescript
// Add debounce to prevent rapid execution during permission dialogs
const lastSyncTime = useRef(0);
const DEBOUNCE_MS = 2000;

const syncNotifications = async () => {
  const now = Date.now();
  if (now - lastSyncTime.current < DEBOUNCE_MS) {
    console.log('[AppStateSync] Debounced - too soon since last sync');
    return;
  }
  lastSyncTime.current = now;
  
  // ... rest of sync logic
};
```

## Why This Fixes the Issue
1. **Timeout Protection**: If `getSession()` hangs (as it does after permission dialogs), we don't wait forever
2. **Fast Fallback**: Cached session from localStorage provides immediate recovery
3. **Debounce**: Prevents `useAppStateSync` from running multiple times during rapid background/foreground cycling from the permission dialog
4. **Safety Net**: `onAuthStateChange` will eventually fire with the correct session, updating state as needed

## Testing Plan
1. Build and deploy to iPhone
2. Delete app and fresh install
3. Go through onboarding to the notification permission screen
4. Tap "Enable Reminders"
5. Grant or deny permission in the iOS dialog
6. Continue onboarding to completion
7. Exit the app
8. Re-enter the app
9. **Expected**: App loads the Today screen without getting stuck on "Loading..."

Repeat with both "Enable" and "Skip" options to verify both paths work.

## Risks and Mitigations
| Risk | Mitigation |
|------|------------|
| Stale cached session | `onAuthStateChange` will correct it; ProtectedRoute redirects if truly invalid |
| Timeout too short | 3 seconds is generous; can increase if needed |
| Cache format mismatch | getCachedSession already handles parsing errors gracefully |
