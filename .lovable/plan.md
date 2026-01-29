
# Fix React Hooks Mismatch Error and Async Listener Cleanup

## Problem Summary
The web preview is showing "Something went wrong" due to a React error: **"Rendered more hooks than during the previous render"** in `AnalyticsWrapper`. This is caused by an async listener setup pattern that can cause race conditions during component unmount/remount cycles.

## Root Cause Analysis
In `useSessionWarming.ts`, the Capacitor listener is set up asynchronously:

```typescript
CapacitorApp.addListener('appStateChange', ...).then((handle) => {
  listener = handle; // Sets AFTER promise resolves
});

return () => {
  listener?.remove(); // May run BEFORE promise resolves
};
```

This creates a race condition:
1. Component mounts, starts async listener setup
2. Component unmounts quickly (e.g., during HMR or navigation)
3. Cleanup runs, but `listener` is still `null`
4. Promise resolves, sets `listener`, but the listener is now orphaned
5. React reconciliation gets confused, thinks hooks count changed

The same pattern exists in `useAnalytics.tsx` line 111-115.

## Solution
Fix the async listener patterns in both hooks to properly handle cleanup during the async gap. Use an `isMounted` flag pattern.

## Technical Changes

### 1. Fix useSessionWarming.ts
**File: `src/hooks/useSessionWarming.ts`**

```typescript
export const useSessionWarming = () => {
  useEffect(() => {
    let isMounted = true;
    let listener: { remove: () => void } | null = null;
    
    // Warm session on mount (non-blocking)
    console.log('[SessionWarming] Warming session on mount...');
    supabase.auth.getSession()
      .then(({ data }) => {
        if (!isMounted) return; // Skip if unmounted
        if (data.session) {
          console.log('[SessionWarming] Session warmed successfully');
        } else {
          console.log('[SessionWarming] No active session');
        }
      })
      .catch((error) => {
        console.warn('[SessionWarming] Failed to warm session:', error);
      });
    
    // Warm session on app resume
    CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive && isMounted) {
        console.log('[SessionWarming] App resumed, warming session...');
        supabase.auth.getSession().catch(() => {});
      }
    }).then((handle) => {
      if (isMounted) {
        listener = handle;
      } else {
        // Already unmounted, clean up immediately
        handle.remove();
      }
    }).catch(() => {});
    
    return () => {
      isMounted = false;
      listener?.remove();
    };
  }, []);
};
```

### 2. Fix useAnalytics.tsx (same pattern issue)
**File: `src/hooks/useAnalytics.tsx`**

Lines 111-115 have the same async pattern issue. Apply the same `isMounted` fix.

### 3. Fix useAppStateSync.tsx (same pattern issue)
**File: `src/hooks/useAppStateSync.tsx`**

Lines 196-202 have the same pattern. Apply the `isMounted` fix.

## File Changes Summary

| File | Change |
|------|--------|
| `src/hooks/useSessionWarming.ts` | Add isMounted guard for async listener setup |
| `src/hooks/useAnalytics.tsx` | Add isMounted guard for async listener setup |
| `src/hooks/useAppStateSync.tsx` | Add isMounted guard for async listener setup |

## Why This Fixes the Issue
1. **Prevents orphaned listeners**: If component unmounts during async setup, the listener is cleaned up immediately when the promise resolves
2. **Prevents stale callbacks**: The `isMounted` check ensures callbacks don't run after unmount
3. **Stabilizes hook count**: By preventing race conditions, React can properly track hook ordering

## Testing
1. After fix, hard refresh the web preview (Cmd+Shift+R)
2. Navigate between pages rapidly
3. The "Something went wrong" error should not appear
4. On iOS, rebuild and test notification cold starts

## Command Line for iOS Testing
```bash
git pull && npm run build && npx cap sync ios && cd ios/App && pod install && cd ../..
```
