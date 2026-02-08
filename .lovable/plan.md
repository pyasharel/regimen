
# Fix Plan: Android Cold Start Session Restoration Race Condition

## Problem Summary

When opening the Regimen app from the Android home screen after being in the background for ~24 hours, the app:
1. Shows "Restoring your session..." for ~20 seconds
2. Briefly shows preview mode
3. Lands on "Connection issue" screen with support code `all_fail`
4. "Reload App" fixes it

This indicates all session hydration attempts in `ProtectedRoute` are timing out despite valid tokens existing.

## Root Cause

A race condition exists between two systems fighting for Supabase auth calls during cold start:

1. **SubscriptionContext's `onAuthStateChange` listener** (lines 1184-1231) receives `INITIAL_SESSION` or `TOKEN_REFRESHED` events and immediately calls `refreshSubscription()`, which internally calls `supabase.auth.getUser()` (line 253)

2. **ProtectedRoute's `hydrateSessionOrNull()`** is simultaneously trying to call `supabase.auth.getSession()` and `supabase.auth.setSession()`

Since Supabase maintains a global auth lock, these concurrent auth operations contend with each other. On Android (and iOS), the Capacitor WebView's slower networking startup exacerbates this - the first auth call holds the lock while waiting for network, blocking subsequent calls until the timeout (8-12 seconds) is reached.

The result: `ProtectedRoute` exhausts all hydration attempts and shows "Connection issue" because the lock was held by `SubscriptionContext`.

## Solution

Apply the pattern from the provided Stack Overflow solution: **Separate initial authentication load from ongoing auth changes**. The `onAuthStateChange` listener should NOT trigger heavy async operations that compete with `ProtectedRoute`.

### Changes to SubscriptionContext.tsx

1. **Remove `supabase.auth.getUser()` call from `refreshSubscription()`**
   - The userId is already available from the session object in auth events
   - Using `getUserIdWithFallback()` is redundant when called from an auth event

2. **Make `onAuthStateChange` callback fire-and-forget for refresh**
   - Do NOT await `refreshSubscription()` in the callback
   - Use `setTimeout(() => refreshSubscription(...), 0)` to defer it off the current tick
   - This allows `ProtectedRoute` hydration to complete first

3. **Add a boot-gate to delay SubscriptionContext initialization**
   - Wait for `ProtectedRoute` hydration to complete (or fail) before running the initial subscription check
   - Use the existing `REGIMEN_BOOT_STATUS` flag or a new `hydrationComplete` signal

4. **Remove redundant `getUser()` call in refreshSubscription**
   - Line 251-258 calls `supabase.auth.getUser()` even though we already have the userId
   - This is a lock-contention hotspot - remove it

### Changes to ProtectedRoute.tsx

1. **Set a global flag when hydration completes**
   - `window.__authHydrationComplete = true` after successful hydration
   - This allows other systems to wait for it

2. **Expose hydration state for external consumers** (optional)
   - Could dispatch a custom event like `window.dispatchEvent(new Event('regimen:hydration-complete'))`

## Implementation Details

### SubscriptionContext.tsx - onAuthStateChange fix

```typescript
// Current problematic code (line 1185):
const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
  // ... calls refreshSubscription() which makes auth calls
});

// Fixed code - fire-and-forget pattern:
const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
  console.log('[SubscriptionContext] Auth event:', event);

  // Only synchronous state updates in callback
  setUser(session?.user ?? null);

  if (session?.user) {
    if (event === 'SIGNED_IN') {
      sessionStorage.removeItem('dismissedBanner');
    }
    
    // Defer refresh to next tick - prevents auth lock contention
    setTimeout(() => {
      refreshSubscription(`auth_${event.toLowerCase()}`);
    }, 0);
  } else {
    // Logged out - synchronous state reset
    setIsSubscribed(false);
    setSubscriptionStatus('none', 'auth_logout');
    setSubscriptionProvider(null);
    setIsLoading(false);
    sessionStorage.removeItem('dismissedBanner');
    
    if (isNativePlatform) {
      setTimeout(() => logoutRevenueCat(), 0);
    }
  }
});
```

### SubscriptionContext.tsx - Remove redundant getUser call

```typescript
// In refreshSubscription(), replace lines 251-258:
// Current code:
let user: User | null = null;
try {
  const { data } = await supabase.auth.getUser();
  user = data?.user ?? null;
} catch {
  user = { id: userId } as User;
}
setUser(user);

// Fixed - just use the userId we already have:
// (Remove the getUser call entirely - it's not needed)
```

### SubscriptionContext.tsx - Gate initial subscription check

```typescript
// In initialize() function, wait for boot to be ready:
const initialize = async () => {
  try {
    // Wait for boot network ready flag (set by main.tsx after 500ms)
    if (isNativePlatform && !window.__bootNetworkReady) {
      await new Promise(resolve => {
        const check = setInterval(() => {
          if (window.__bootNetworkReady) {
            clearInterval(check);
            resolve(true);
          }
        }, 50);
        setTimeout(() => { clearInterval(check); resolve(true); }, 3000);
      });
    }
    
    // ... rest of initialization
  }
};
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/contexts/SubscriptionContext.tsx` | 1. Make onAuthStateChange callback non-async, use setTimeout for refreshSubscription<br>2. Remove supabase.auth.getUser() call in refreshSubscription<br>3. Add boot-gate to initialize() |
| `src/components/ProtectedRoute.tsx` | 1. Set `window.__authHydrationComplete = true` after successful hydration |

## Testing Checklist

After implementation:
1. Cold start from app icon after 24+ hours in background
2. Cold start from notification tap
3. App resume from app switcher
4. Sign out and sign in flow
5. Verify subscription status shows correctly (not preview mode)
6. Verify no "Connection issue" screen appears

## Technical Notes

- The `noOpLock` fix in the Supabase client prevents navigator.locks deadlocks, but doesn't prevent contention from concurrent auth API calls
- The 500ms native boot delay in main.tsx helps, but isn't enough when two systems both try auth calls at the same time
- The fix follows the recommended Supabase pattern of never awaiting async operations in onAuthStateChange callbacks
