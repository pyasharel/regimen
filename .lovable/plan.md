
## Fix: Recreate Supabase Client on App Resume (Not Just Cold Start)

### Root Cause Analysis

The current fix recreates the Supabase client at the **top of `main.tsx`**, which only runs on true cold starts (fresh JS context). But the bug occurs when:

1. App is running, user hard-closes it
2. App enters "suspended" state (not terminated)
3. User taps a notification
4. **iOS resumes the suspended app** - JS context is STILL ALIVE with corrupted client
5. `main.tsx` doesn't re-run because it already executed
6. All auth operations timeout because the client is corrupted

This explains why:
- Manual cold starts work (main.tsx runs fresh)
- Notification taps sometimes fail (app resumes from suspension)
- Multiple hard closes eventually work (iOS eventually terminates the suspended app)

### The Fix

We need to recreate the Supabase client **on every app resume**, not just cold start. This means hooking into Capacitor's `appStateChange` event.

### Technical Implementation

```text
+----------------------------------+
|  main.tsx (cold start)           |
|  recreateSupabaseClient()  ✓     |
+----------------------------------+
              ↓
+----------------------------------+
|  App Running                      |
+----------------------------------+
              ↓ (user hard closes)
+----------------------------------+
|  App Suspended (corrupted)        |
+----------------------------------+
              ↓ (notification tap)
+----------------------------------+
|  useAppStateSync                  |
|  appStateChange → isActive       |
|  recreateSupabaseClient()  ← NEW |
|  THEN run sync operations        |
+----------------------------------+
```

### Files to Modify

| File | Change |
|------|--------|
| `src/main.tsx` | Fix duplicate Capacitor import error (if present) |
| `src/hooks/useAppStateSync.tsx` | Add `recreateSupabaseClient()` call at start of `appStateChange` handler |
| `capacitor.config.ts` | Bump build to 23 for testing |

### Implementation Details

**useAppStateSync.tsx changes:**

```typescript
import { recreateSupabaseClient } from '@/integrations/supabase/client';

// In the appStateChange listener:
CapacitorApp.addListener('appStateChange', ({ isActive }) => {
  if (isActive && isMounted) {
    console.log('[AppStateSync] App became active - recreating Supabase client');
    
    // CRITICAL: Recreate client FIRST to clear corrupted state from suspension
    recreateSupabaseClient();
    
    // Then delay heavy sync slightly on resume
    setTimeout(() => {
      if (isMounted) {
        syncNotifications();
      }
    }, RESUME_DELAY_MS);
  }
});
```

### Why This Works

1. **Covers all resume paths**: Whether the app resumes from background or gets a fresh cold start, we always have a clean client
2. **Runs before auth operations**: The client is recreated BEFORE any sync operations try to use it
3. **No performance penalty**: Creating a new client is fast (~1ms), and we're already in a "wait for resume" phase
4. **Preserves existing tokens**: The localStorage tokens remain intact; we just need a non-corrupted client instance to use them

### Testing Plan

After implementation (Build 23):
1. Fresh install, sign in, verify data loads
2. Let app sit for 1 minute (enters background)
3. Send a test notification from Settings
4. Tap the notification when it arrives
5. Verify: Console shows "[AppStateSync] App became active - recreating Supabase client" THEN data loads correctly
6. Repeat hard-close + notification-tap cycle 10 times

### Risk Assessment

**Very low risk**: 
- `recreateSupabaseClient()` is already tested and working for cold starts
- Adding it to app resume is the same operation, just triggered at a different time
- The Supabase client is designed to be instantiated multiple times
