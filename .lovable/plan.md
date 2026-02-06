

# Fix: ProtectedRoute Stuck on "Restoring your session..."

## Problem Summary

Jam is stuck on the "Restoring your session..." screen. The watchdog timer (12 seconds) that should trigger the recovery UI is being prematurely cleared due to a React useEffect dependency bug.

## Root Cause Analysis

In `ProtectedRoute.tsx`, the watchdog timer and hydration logic share the same `useEffect` hook with problematic dependencies:

```typescript
useEffect(() => {
  // Start watchdog timer (12 seconds)
  watchdogRef.current = setTimeout(() => {
    if (isMountedRef.current && hydrationState === 'loading') {
      setHydrationState('failed');
    }
  }, WATCHDOG_TIMEOUT_MS);
  
  // Early return that clears watchdog on re-runs
  if (hydrationAttemptRef.current > 0 && retryCount === 0) {
    clearWatchdog();  // BUG: Kills the watchdog!
    return;
  }
  
  attemptHydration(1);
  
  return () => clearWatchdog();
}, [attemptHydration, retryCount, clearWatchdog, hydrationState]); // hydrationState triggers re-runs
```

**The Bug:**
1. Effect runs on mount → watchdog starts → `attemptHydration(1)` called
2. `attemptHydration` is async and takes 8-10+ seconds (multiple timeout steps)
3. If `hydrationState` changes during this time, the effect re-runs
4. On re-run: `hydrationAttemptRef.current > 0 && retryCount === 0` evaluates to `true`
5. `clearWatchdog()` is called → watchdog is dead
6. If hydration then hangs, there's no safety net → **infinite spinner**

## Solution

Separate the watchdog timer into its own `useEffect` that:
1. Only depends on `hydrationState` (to detect when to stop)
2. Doesn't interact with the hydration logic's lifecycle
3. Cannot be accidentally cleared by the hydration flow

Additionally, add a **global unhandled rejection handler** to catch any async errors that slip through try/catch blocks (as suggested in the Stack Overflow context).

## Implementation Plan

### Step 1: Separate Watchdog Effect
Split the monolithic useEffect into two:
- **Watchdog Effect**: Independent timer that only monitors `hydrationState`
- **Hydration Effect**: Handles the actual session restoration

### Step 2: Add Global Error Handler
Add a global `unhandledrejection` listener in the component to catch promise rejections that escape try/catch blocks. This prevents the app from silently hanging.

### Step 3: Reduce Total Timeout Budget
The current `hydrateSessionOrNull` can take up to 10+ seconds:
- getSession: 4s
- setSession: 2s  
- mirror restore: 2.5s
- verify getSession: 1.5s

Reduce these to ensure the total stays under 8 seconds so the watchdog actually fires before user patience runs out.

---

## Technical Details

### File: `src/components/ProtectedRoute.tsx`

**Change 1: Separate useEffect for watchdog**

Current (lines 195-220):
```typescript
useEffect(() => {
  isMountedRef.current = true;
  
  watchdogRef.current = setTimeout(() => { ... }, WATCHDOG_TIMEOUT_MS);
  
  if (hydrationAttemptRef.current > 0 && retryCount === 0) {
    clearWatchdog();
    return;
  }
  hydrationAttemptRef.current++;
  attemptHydration(1);
  
  return () => { ... };
}, [attemptHydration, retryCount, clearWatchdog, hydrationState]);
```

New approach:
```typescript
// Watchdog effect - completely independent
useEffect(() => {
  // Only run watchdog if we're in loading state
  if (hydrationState !== 'loading') return;
  
  const watchdog = setTimeout(() => {
    console.warn('[ProtectedRoute] Watchdog triggered');
    setSupportCode(generateSupportCode());
    setHydrationState('failed');
  }, WATCHDOG_TIMEOUT_MS);
  
  return () => clearTimeout(watchdog);
}, [hydrationState]); // Only depends on hydrationState

// Hydration effect - handles actual session restoration
useEffect(() => {
  isMountedRef.current = true;
  
  if (hydrationAttemptRef.current > 0 && retryCount === 0) {
    return;
  }
  hydrationAttemptRef.current++;
  attemptHydration(1);
  
  return () => { isMountedRef.current = false; };
}, [attemptHydration, retryCount]);
```

**Change 2: Add global error handler**

Add to the component:
```typescript
useEffect(() => {
  const handleRejection = (event: PromiseRejectionEvent) => {
    console.error('[ProtectedRoute] Unhandled rejection:', event.reason);
    // If still in loading state, trigger recovery
    if (hydrationState === 'loading') {
      setSupportCode('unhandled-rejection');
      setHydrationState('failed');
    }
    event.preventDefault();
  };
  
  window.addEventListener('unhandledrejection', handleRejection);
  return () => window.removeEventListener('unhandledrejection', handleRejection);
}, [hydrationState]);
```

### File: `src/utils/safeAuth.ts`

Reduce timeout budgets:
- `GET_SESSION_TIMEOUT_MS`: 4000 → 3000
- `SET_SESSION_TIMEOUT_MS`: 2000 → 1500
- `MIRROR_RESTORE_TIMEOUT_MS`: 2500 → 1500 (in authTokenMirror.ts)
- Final verify: 1500 → 1000

This ensures total worst-case is ~7 seconds, well under the 12-second watchdog.

---

## Summary

| Issue | Fix |
|-------|-----|
| Watchdog cleared prematurely | Separate into independent useEffect |
| Unhandled rejections can cause hang | Add global rejection handler |
| Total timeout budget too long | Reduce individual step timeouts |

After these changes, even if hydration hangs indefinitely, the watchdog will **always** fire after 12 seconds and show the recovery UI with "Try Again" and "Reload App" buttons.

