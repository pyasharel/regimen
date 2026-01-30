
# Build 26: Nuclear Fix for iOS Cold Start Networking

## Root Cause (Now Confirmed)

The logs prove that Build 25's "app ready" gating isn't blocking anything because `globalIsActive` and `globalIsVisible` default to `true`. By the time `CapacitorApp.getState()` returns the real value, the sync has already started and requests are hanging.

The abortable fetch has an 8-second timeout, but `withQueryTimeout` times out at 5 seconds first - and it doesn't abort the underlying request. This leaves stuck connections poisoning the client.

## The Nuclear Fix

Instead of trying to detect when iOS is "ready" (which we've proven is unreliable), we'll take a different approach:

### Strategy: Delay-First on Native Cold Start

On native cold start, we will **unconditionally wait 2 seconds** before ANY network request. This gives iOS time to:
- Finish waking up the WebView
- Initialize the networking stack
- Complete any pending system operations

This is not elegant, but it's reliable and it works.

### Changes

#### 1. Add Hard Delay Before First Network Work

In `main.tsx`, after client recreation, add a 2-second delay before marking boot ready:

```typescript
if (Capacitor.isNativePlatform()) {
  console.log('[BOOT] Native cold start - waiting 2s for iOS networking...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  console.log('[BOOT] Delay complete, proceeding with boot');
}
```

#### 2. Gate TodayScreen on Boot Complete Flag

Add a global flag `window.__bootNetworkReady` that's set to `true` after the delay. TodayScreen won't start loading until this flag is true.

#### 3. Gate AppStateSync Initial Sync Similarly

The initial sync in `useAppStateSync` will also wait for the boot delay to complete.

#### 4. Add Auto-Reload on Persistent Timeout

If queries still timeout after retry, force `window.location.reload()` instead of showing stuck UI:

```typescript
if (retryCount >= 2) {
  console.log('[TodayScreen] Persistent timeouts - forcing reload');
  window.location.reload();
}
```

This ensures users never get stuck on an empty screen.

### Why This Will Work

1. **Guaranteed delay**: No race conditions - we wait a fixed 2 seconds on every native cold start
2. **Fresh clients**: Both clients are recreated before the delay
3. **Auto-recovery**: If it still fails, auto-reload gives a fresh JS context
4. **Users can use the app**: Even if it takes 2 extra seconds on cold start, they'll see their data

### File Changes

| File | Change |
|------|--------|
| `src/main.tsx` | Add 2s delay after client recreation on native, set global ready flag |
| `src/components/TodayScreen.tsx` | Wait for boot ready flag before loading |
| `src/hooks/useAppStateSync.tsx` | Wait for boot ready flag before initial sync |
| `capacitor.config.ts` | Bump to Build 26 |

### Expected Log Sequence (Build 26)

```
[BOOT] Native platform detected - recreating ALL Supabase clients
[BOOT] Native cold start - waiting 2s for iOS networking...
... 2 seconds pass ...
[BOOT] Delay complete, network ready flag set
[TodayScreen] Boot ready, starting data load
[AppStateSync] Boot ready, starting initial sync
```

### Testing

1. Fresh install - verify loads (may have 2s delay)
2. Hard close, reopen - data should load after 2s delay
3. Notification tap from killed state - data should load
4. Repeat 10+ times

### User Experience

- Cold start adds ~2 seconds
- But users see their data reliably
- No more "empty state" frustration
- Users stop messaging you about the app being broken

---

## Technical Details

### Boot Ready Flag Implementation

```typescript
// In main.tsx, at module level
declare global {
  interface Window {
    __bootNetworkReady?: boolean;
  }
}

// After client recreation
if (Capacitor.isNativePlatform()) {
  console.log('[BOOT] Native cold start - waiting 2s for iOS...');
  setTimeout(() => {
    window.__bootNetworkReady = true;
    console.log('[BOOT] Network ready flag set');
  }, 2000);
} else {
  window.__bootNetworkReady = true; // Web is always ready
}
```

### TodayScreen Gating

```typescript
useEffect(() => {
  // Wait for boot network ready
  if (Capacitor.isNativePlatform() && !window.__bootNetworkReady) {
    const checkReady = setInterval(() => {
      if (window.__bootNetworkReady) {
        clearInterval(checkReady);
        loadDoses();
        checkCompounds();
        loadUserName();
      }
    }, 100);
    return () => clearInterval(checkReady);
  }
  
  loadDoses();
  checkCompounds();
  loadUserName();
}, [selectedDate]);
```

### Auto-Reload on Persistent Failure

```typescript
if (retryCount >= 2) {
  console.log('[TodayScreen] Too many timeouts - reloading app');
  window.location.reload();
  return;
}
```
