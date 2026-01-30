# Post-Mortem: v1.0.3 Supabase Deadlock Incident

**Date:** January 2026  
**Severity:** Critical (P0)  
**Affected Versions:** v1.0.3 (Build 27 and earlier)  
**Resolution:** v1.0.4 (Build 28)  
**Platforms:** iOS and Android (Capacitor WebView)

---

## 1. Incident Summary

### Symptoms
- **Black screen** on app open/resume
- **Empty data** - UI structure visible but no content loaded
- **"Slow connection"** toast messages
- **App hangs** indefinitely after closing and reopening
- Users unable to log doses or view their stack

### User Reports
Multiple beta testers reported the app becoming unresponsive after:
- Closing the app via home button and reopening
- Receiving a notification and tapping it
- Leaving the app in background for extended periods
- Force-quitting and relaunching

### Resolution
Deployed Build 28 with `noOpLock` fix to bypass the `navigator.locks` API deadlock.

---

## 2. Timeline of Events

| Phase | Description |
|-------|-------------|
| **Detection** | Beta testers report app hanging after close/reopen |
| **Initial Investigation** | Suspected RevenueCat, OAuth, Android Play Store configs |
| **Exclusionary Diagnostics** | Ruled out external services; focused on Supabase client |
| **Root Cause Identified** | `navigator.locks` API deadlock in `@supabase/auth-js` |
| **Fix Implemented** | Added `noOpLock` to both Supabase clients |
| **Build 28 Deployed** | iOS submitted for expedited review; Android promoted through testing tracks |
| **Verification** | Both iOS and Android testers confirmed fix works |

---

## 3. Root Cause Analysis

### The Deadlock Chain

```
1. User opens app → Supabase auth acquires navigator.lock
2. iOS/Android suspends app (home button, notification, etc.)
3. Lock is never released (WebView bug)
4. User reopens app → all auth.getSession() calls wait forever
5. dataClient tries to get token → also blocked
6. All network requests hang → empty UI
```

### Why It Happened

The `@supabase/auth-js` library uses the Web Locks API (`navigator.locks`) to prevent race conditions when multiple browser tabs try to refresh auth tokens simultaneously. However:

1. **iOS WebView Bug**: When iOS suspends an app mid-lock-acquisition, the lock is never released on resume
2. **Android WebView Bug**: Same behavior affects Android Capacitor apps
3. **No Timeout**: The Supabase SDK waits indefinitely for the lock, with no timeout mechanism
4. **Cascading Failure**: Since `dataClient` also needed auth tokens, all database queries blocked

### Reference
- GitHub Issue: [supabase/auth-js#866](https://github.com/supabase/auth-js/issues/866)

---

## 4. The Fix: noOpLock

### Why Mobile Apps Don't Need Locking

The `navigator.locks` mechanism exists to coordinate session refresh across **multiple browser tabs**. Mobile apps are:
- **Single-instance** - only one WebView runs at a time
- **No tab competition** - no risk of concurrent token refresh
- **Session isolated** - each app instance has its own storage

### Implementation

Added to both `src/integrations/supabase/client.ts` and `src/integrations/supabase/dataClient.ts`:

```typescript
/**
 * No-op lock for iOS Capacitor WebView compatibility.
 * 
 * The default navigator.locks API deadlocks on iOS when the app
 * is suspended and resumed. Since mobile apps are single-instance,
 * we don't need cross-tab locking.
 * 
 * See: https://github.com/supabase/auth-js/issues/866
 */
const noOpLock = async <T>(
  name: string,
  acquireTimeout: number,
  fn: () => Promise<T>
): Promise<T> => {
  return await fn(); // Execute immediately, no locking
};

const clientOptions = {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    lock: noOpLock, // Bypass navigator.locks
  }
};
```

### Safety Verification

This fix is safe because:
1. Mobile apps run as single instances
2. No concurrent tabs can race for token refresh
3. The lock only existed for multi-tab browser scenarios
4. Tested across multiple app lifecycle scenarios (hard close, notification tap, background resume)

---

## 5. Supporting Fixes

### 5.1 Dual Client Recreation

On every native cold start and app resume, both Supabase clients are recreated:

```typescript
recreateSupabaseClient();  // Main auth client
recreateDataClient();      // Data-fetching client
```

This clears any corrupted internal state from iOS hard-close.

### 5.2 AbortController for Stuck Requests

All `dataClient` requests use `AbortController` to ensure timed-out requests are actually cancelled:

```typescript
const abortableFetchInstance = createAbortableFetch({
  defaultTimeoutMs: 8000,
  tag: 'DataClient',
});
```

On client recreation, all inflight requests are aborted:

```typescript
export const recreateDataClient = (): SupabaseClient<Database> => {
  const abortedCount = abortableFetchInstance.abortAll();
  // ... recreate client
};
```

### 5.3 Failed Boot Detection

A 4-second global boot timeout shows recovery UI if the app fails to initialize:

```typescript
// In main.tsx
setTimeout(() => {
  if (!bootCompleted) {
    showRecoveryUI();
  }
}, 4000);
```

### 5.4 Boot Tracer Diagnostics

The `BootTracer` utility records timestamped events throughout boot, providing visibility without a debugger:

- Settings → Help → Boot Diagnostics
- Events persisted to localStorage
- Allows users to copy/share diagnostic data

---

## 6. Prevention Checklist

### Patterns to Avoid

| ❌ Don't | ✅ Do Instead |
|----------|---------------|
| Use default Supabase lock on mobile | Provide `noOpLock` in client config |
| Call `auth.getSession()` in boot-critical paths | Use `dataClient` with cached tokens |
| Make unbounded network requests | Always use timeouts and AbortController |
| Assume app state survives iOS suspend | Recreate clients on every resume |

### Testing Scenarios

Before any release, verify these scenarios on physical devices:

1. **Hard close**: Double-tap home, swipe app away, reopen
2. **Notification tap**: Receive notification while app backgrounded, tap to open
3. **Long background**: Leave app 5+ minutes, return to it
4. **Low memory**: Open many other apps, return to this app
5. **Airplane mode resume**: Enable airplane mode, background app, disable, resume

### Warning Signs

Watch for these symptoms during development:

- "Slow connection" toasts appearing frequently
- Empty UI after resuming from background
- Queries returning empty arrays when data exists
- Auth state showing "loading" indefinitely
- Boot tracer showing gaps in event timeline

---

## 7. Deployment Lessons

### iOS App Store

- **Version constraints**: Cannot add new builds to a closed/submitted version
- **Expedited reviews**: Available for critical bugs via [Apple Contact Form](https://developer.apple.com/contact/app-store/?topic=expedite)
- **Update propagation**: 2-24 hours after approval; auto-update takes 24-48 hours

### Google Play

- **versionCode requirements**: Each track requires incrementing versionCode
- **Track promotion**: Internal → Closed → Open → Production
- **CDN propagation**: Can take 2-24 hours even after release is "Active"
- **Cache issues**: Users may need to clear Play Store cache for immediate update

### User Communication

When deploying a critical fix:

1. **Prepare announcement** before approval
2. **Include clear instructions**: "Force quit → Check for update → Reopen"
3. **Set expectations**: "Updates may take up to 24 hours to appear"
4. **Provide workaround**: "Try deleting and reinstalling if update doesn't appear"

---

## 8. Code References

| File | Purpose |
|------|---------|
| `src/integrations/supabase/client.ts` | Main Supabase client with `noOpLock` |
| `src/integrations/supabase/dataClient.ts` | Auth-lock-resistant data client |
| `src/utils/abortableFetch.ts` | AbortController wrapper for fetch |
| `src/utils/bootTracer.ts` | Boot diagnostics utility |
| `.storage/memory/architecture/supabase-nooplock-fix.md` | Architecture decision record |

---

## 9. Lessons Learned

1. **Mobile WebViews are different**: Web APIs that work in browsers may fail in Capacitor WebViews
2. **Always have timeouts**: Never wait indefinitely for any operation
3. **Test lifecycle scenarios**: App suspend/resume is a common failure point
4. **Build in diagnostics**: Boot tracing was critical for identifying the issue
5. **Document workarounds**: Having the fix documented prevents future regressions
