
# Fix: Intermittent Loading Spinner on Cold Start

## The Problem

When you open the app after ~30+ minutes away, it sometimes gets stuck on "Starting..." forever. This is happening because:

1. **Multiple auth calls compete on startup** - Splash.tsx, useSessionWarming, and SubscriptionContext all call `supabase.auth.getSession()` simultaneously
2. **Supabase auth uses a global lock** - Only one auth operation can run at a time; others queue
3. **If the first call hangs (slow network, token refresh), everything hangs** - The 8-second timeout doesn't help because the Promise never resolves OR rejects while the lock is held
4. **The 5-minute expiry buffer in getCachedSession() is too aggressive** - If your token expires in 4 minutes, it's rejected as "invalid", forcing the slow network path

## The Fix (3 targeted changes)

### Change 1: Remove the Aggressive Expiry Buffer in Auth Cache

**File: `src/utils/authSessionCache.ts`**

The current code rejects tokens that expire within 5 minutes. But Supabase will auto-refresh tokens that are about to expire - we should trust it. Change the buffer from 5 minutes to 0 for the fast-path check.

```typescript
// BEFORE (line 46-49):
const bufferMs = 5 * 60 * 1000; // 5 minutes
const isExpired = expiresAtMs < Date.now() + bufferMs;

// AFTER:
const bufferMs = 30 * 1000; // 30 seconds - trust Supabase to refresh
const isExpired = expiresAtMs < Date.now() + bufferMs;
```

This lets users with tokens expiring in 1-4 minutes take the fast path instead of hitting the network.

### Change 2: Disable Competing Auth Calls During Cold Start

**File: `src/hooks/useSessionWarming.ts`**

This hook calls `getSession()` on mount AND on resume, but Splash.tsx and ProtectedRoute already do this. The duplicate call can acquire the auth lock first, blocking the critical Splash path.

Add a flag to skip the initial mount call (resume is fine):

```typescript
// Add at the top of the effect:
// SKIP initial mount - Splash.tsx handles cold start auth
// Only warm on resume events
let isInitialMount = true;

// Warm session on mount - DISABLED to prevent lock contention with Splash
// Splash.tsx already calls getSession() on cold start
if (!isInitialMount) {
  console.log('[SessionWarming] Warming session on mount...');
  supabase.auth.getSession()...
}
isInitialMount = false;
```

Actually, simpler approach - just remove the mount call entirely:

```typescript
useEffect(() => {
  let isMounted = true;
  let listener: { remove: () => void } | null = null;
  
  // NOTE: Removed initial getSession() call on mount
  // Splash.tsx and ProtectedRoute handle cold start auth
  // This hook only warms session on app RESUME
  
  // Warm session on app resume
  CapacitorApp.addListener('appStateChange', ({ isActive }) => {
    if (isActive && isMounted) {
      console.log('[SessionWarming] App resumed, warming session...');
      supabase.auth.getSession().catch(() => {});
    }
  })...
```

### Change 3: Add an Absolute Boot Watchdog to Splash.tsx

**File: `src/pages/Splash.tsx`**

Even with the above fixes, we need a safety net. If the app is STILL stuck after 10 seconds, auto-navigate to recovery:

```typescript
// Add a hard watchdog that fires regardless of Promise.race state
useEffect(() => {
  const watchdog = setTimeout(() => {
    if (!hasNavigated.current) {
      console.error('[Splash] Watchdog triggered - forcing recovery UI');
      setState('timeout');
      setSupportCode(generateSupportCode());
    }
  }, 10000); // 10 second absolute max
  
  return () => clearTimeout(watchdog);
}, []);
```

This ensures users ALWAYS see recovery options instead of infinite spinner.

## Why These Changes Work

1. **Reduced expiry buffer** → More cold starts take the instant localStorage path
2. **Removed competing getSession() call** → No lock contention on critical path  
3. **Absolute watchdog** → Even if auth hangs, user sees "Try Again" after 10s

## Files to Modify

1. `src/utils/authSessionCache.ts` - Reduce expiry buffer from 5 min to 30 sec
2. `src/hooks/useSessionWarming.ts` - Remove initial mount getSession() call
3. `src/pages/Splash.tsx` - Add absolute 10-second watchdog

## Testing

After deploying:
1. Use the app normally, then close it
2. Wait 30+ minutes (or manually clear session cache)
3. Open the app - should never hang more than 10 seconds
4. If it does show recovery UI, "Try Again" should work

## What This Doesn't Change

- ProtectedRoute retry logic (still good)
- Notification permission handling (already fixed)
- Session hydration strategy (still uses cache-first)

This is a minimal, surgical fix targeting the exact root cause.
