

# Build 27: noOpLock Fix for iOS Supabase Deadlock

## Root Cause Identified

The issue is a **known bug in `@supabase/auth-js`** (the authentication module used by `@supabase/supabase-js`). On iOS Capacitor WebViews, the `navigator.locks` API can fail to release locks when the app is suspended/resumed. When this happens:

1. The first auth operation acquires the lock
2. iOS suspends the app
3. On resume, the lock is never released
4. All subsequent auth operations wait forever for a lock that will never be released
5. Network requests hang indefinitely (no timeout)

This matches exactly what we've been seeing: queries hang, timeouts fire, but the underlying requests stay stuck.

## The Fix: Bypass the Lock Entirely

Supabase supports a custom `lock` function in the client options. We can provide a "no-op" lock that immediately executes the function without any locking:

```typescript
const noOpLock = async <T>(
  name: string, 
  acquireTimeout: number, 
  fn: () => Promise<T>
): Promise<T> => {
  return await fn();
};
```

This is safe for mobile apps because:
- Mobile apps run as a single instance (no tabs competing for session)
- There's no risk of race conditions from multiple tabs refreshing tokens simultaneously
- The lock mechanism only exists for multi-tab browser scenarios

## Changes Required

### 1. Update Main Supabase Client (`src/integrations/supabase/client.ts`)

Add the `noOpLock` function and include it in client options:

```typescript
/**
 * No-op lock for iOS Capacitor WebView compatibility.
 * 
 * The default navigator.locks API deadlocks on iOS when the app
 * is suspended and resumed. Since mobile apps are single-instance,
 * we don't need cross-tab locking.
 */
const noOpLock = async <T>(
  name: string,
  acquireTimeout: number,
  fn: () => Promise<T>
): Promise<T> => {
  return await fn();
};

const clientOptions = {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    lock: noOpLock, // <-- ADD THIS
  }
};
```

### 2. Update Data Client (`src/integrations/supabase/dataClient.ts`)

The dataClient already has `persistSession: false` and `autoRefreshToken: false`, but for safety and consistency, we should add the same `noOpLock`:

```typescript
const createDataClientInstance = (): SupabaseClient<Database> => {
  return createClient<Database>(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        lock: noOpLock, // <-- ADD THIS for consistency
      },
      // ... rest of options
    }
  );
};
```

### 3. Remove 2-Second Boot Delay (Optional but Recommended)

With the deadlock fixed at the source, we can remove or reduce the 2-second boot delay in `main.tsx`. However, I recommend keeping a small delay (500ms) as a safety buffer for iOS networking stack initialization.

### 4. Update Documentation

Add memory file documenting this fix for future reference.

### 5. Bump Build Number

Increment to Build 27.

## Expected Behavior After Fix

1. Cold start: App boots normally, no 2-second delay needed
2. Hard close/reopen: No deadlock, queries complete normally  
3. Notification tap: No deadlock, data loads immediately
4. No more "Connection stuck" states

## Technical Notes

- The `lock` option is typed as `LockFunc` in Supabase
- Signature: `(name: string, acquireTimeout: number, fn: () => Promise<T>) => Promise<T>`
- This is documented in the Supabase source but not prominently in docs
- This fix has been used successfully by other Capacitor/React Native apps with the same issue

## Files to Modify

| File | Change |
|------|--------|
| `src/integrations/supabase/client.ts` | Add `noOpLock` function and include in auth options |
| `src/integrations/supabase/dataClient.ts` | Add same `noOpLock` for consistency |
| `src/main.tsx` | Reduce boot delay from 2s to 500ms (optional) |
| `capacitor.config.ts` | Bump to Build 27 |
| `.storage/memory/` | Add documentation for this fix |

## Testing Protocol

1. Fresh install → verify data loads immediately (no 2s delay)
2. Hard close, reopen → data should load within 1 second
3. Schedule notification 2-3 min out
4. Background app, tap notification → data should load immediately
5. Repeat 10+ times with hard closes

## Risk Assessment

**Low risk.** The lock mechanism only exists for multi-tab browser scenarios. Mobile apps:
- Never have multiple tabs
- Never compete for session refresh
- Don't need lock coordination

Many production apps use this exact workaround for Capacitor/React Native.

