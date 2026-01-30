# Memory: architecture/supabase-nooplock-fix
Updated: 2026-01-30

## Problem: iOS Supabase Deadlock

The `@supabase/auth-js` library uses `navigator.locks` API for cross-tab session synchronization. On iOS Capacitor WebViews, this API can fail to release locks when the app is suspended and resumed, causing:

1. First auth operation acquires the lock
2. iOS suspends the app
3. On resume, the lock is never released
4. All subsequent auth operations wait forever
5. Network requests hang indefinitely (no timeout)

## Solution: noOpLock

Since mobile apps are single-instance (no tabs competing for session), we bypass the locking mechanism entirely with a no-op lock function:

```typescript
const noOpLock = async <T>(
  name: string,
  acquireTimeout: number,
  fn: () => Promise<T>
): Promise<T> => {
  return await fn();
};

const clientOptions = {
  auth: {
    lock: noOpLock,
    // ... other options
  }
};
```

## Implementation

The `noOpLock` is applied to both:
- `src/integrations/supabase/client.ts` (main auth client)
- `src/integrations/supabase/dataClient.ts` (data-fetching client)

## Safety

This is safe for mobile apps because:
- Mobile apps run as a single instance (no tabs)
- No risk of race conditions from multiple tabs refreshing tokens
- The lock mechanism only exists for multi-tab browser scenarios

## Reference

- GitHub Issue: https://github.com/supabase/auth-js/issues/866
- Build 27 implemented this fix
