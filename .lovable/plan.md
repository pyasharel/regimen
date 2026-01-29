
# Fix Session Restoration Timeout During Notification Cold Starts

## Problem Summary
When users tap a notification to open the app after a force-close, the app shows "Taking longer than expected" instead of loading the Today screen. This happens because the Supabase session check in `Splash.tsx` times out (5 seconds) before completing.

## Root Cause Analysis
The current flow during a notification-triggered cold start:

```text
User taps notification
        ↓
    App cold starts
        ↓
  main.tsx preflight runs
        ↓
  React mounts → Router → Splash.tsx
        ↓
  supabase.auth.getSession() called
        ↓
  [HANGS HERE - network/token refresh slow]
        ↓
  5 second timeout triggers
        ↓
  "Taking longer than expected" shown
```

The problem is that `getSession()` during cold starts can be slow because:
- WebView is still initializing
- Supabase client needs to warm up
- Token refresh may be in progress
- Network requests are queued behind other startup tasks

## Solution Overview
Implement a **fast-path session check** that reads cached auth data from localStorage first, then validates in the background. This provides instant navigation while still ensuring security.

## Technical Changes

### 1. Create Auth Session Cache Utility
**New file: `src/utils/authSessionCache.ts`**

```typescript
// Fast, synchronous check for cached session data
// Supabase stores session in localStorage under a predictable key

export const getCachedSession = () => {
  // Supabase stores auth state here
  const key = `sb-${projectId}-auth-token`;
  const cached = localStorage.getItem(key);
  
  if (!cached) return null;
  
  try {
    const parsed = JSON.parse(cached);
    // Check if token is expired (with 5 min buffer)
    if (parsed.expires_at && parsed.expires_at * 1000 > Date.now() + 300000) {
      return parsed;
    }
    return null; // Expired
  } catch {
    return null;
  }
};
```

### 2. Update Splash.tsx with Fast-Path Logic
**Modify: `src/pages/Splash.tsx`**

New strategy:
1. **First (instant)**: Check localStorage for cached session
2. **If cached session exists and not expired**: Navigate immediately to `/today`
3. **Background**: Trigger async session refresh (Supabase handles token refresh automatically)
4. **If no cached session**: Fall back to current `getSession()` flow with timeout

```text
Notification tap → Cold start
        ↓
    Check localStorage cache (instant, <1ms)
        ↓
  Session found? ─────────────────→ Navigate to /today immediately
        │                                    ↓
        │                           Background: getSession() validates
        │                           (ProtectedRoute handles any issues)
        ↓
  No cached session
        ↓
  Fall back to getSession() with timeout
        ↓
  Navigate to /onboarding or show error
```

### 3. Leverage ProtectedRoute as Safety Net
`ProtectedRoute.tsx` already:
- Calls `getSession()` on mount
- Listens to `onAuthStateChange`
- Redirects to `/auth` if session is invalid

This means the fast-path is safe: if the cached session is stale, `ProtectedRoute` will catch it and redirect appropriately.

### 4. Add Session Warming Hook
**New file: `src/hooks/useSessionWarming.ts`**

On app resume and initial load, proactively warm the Supabase session in the background:

```typescript
export const useSessionWarming = () => {
  useEffect(() => {
    // Warm session on mount (non-blocking)
    supabase.auth.getSession().catch(() => {});
    
    // Warm session on app resume
    const listener = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        supabase.auth.getSession().catch(() => {});
      }
    });
    
    return () => listener.remove();
  }, []);
};
```

### 5. Increase Timeout as Fallback
Increase the Splash timeout from 5s to 8s as an additional buffer, since the fast-path should handle most cases anyway.

## File Changes Summary

| File | Change |
|------|--------|
| `src/utils/authSessionCache.ts` | New file - fast localStorage session check |
| `src/pages/Splash.tsx` | Use fast-path first, fallback to async check |
| `src/hooks/useSessionWarming.ts` | New file - background session warming |
| `src/App.tsx` | Add `useSessionWarming()` hook |

## Testing Plan
After implementing, test on physical iPhone:

1. **Force close app** (swipe up from app switcher)
2. **Trigger a notification** (schedule one for 1 minute out)
3. **Tap the notification**
4. **Expected**: App opens directly to Today screen without showing "Taking longer than expected"

Repeat 10 times to confirm reliability.

## Why This Works
- **Speed**: localStorage read is synchronous and takes <1ms
- **Safety**: ProtectedRoute validates the session in the background
- **Fallback**: If cache is empty/expired, the existing flow still works
- **No user impact**: Users with valid sessions see instant loading; users without sessions still get proper auth flow

## Risks and Mitigations
| Risk | Mitigation |
|------|------------|
| Stale session cached | ProtectedRoute validates and redirects if needed |
| localStorage unavailable | Falls back to async getSession() |
| Race condition with auth | onAuthStateChange listener handles changes |
