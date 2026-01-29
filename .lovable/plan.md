# iOS Session Hydration Hang Fix - IMPLEMENTED

## Summary
Fixed the "Restoring your session..." infinite spinner issue on iOS resume after ~30 minutes by:

1. **Added strict timeouts to native mirror operations** (`authTokenMirror.ts`)
   - `loadFromMirror()` now has 1000ms timeout
   - `restoreSessionFromMirror()` now has 2500ms timeout on `setSession()`

2. **Added ProtectedRoute watchdog** (`ProtectedRoute.tsx`)
   - 12-second absolute watchdog timer
   - Recovery UI with "Try Again", "Reload App", "Sign In Instead" buttons
   - Support code showing last hydration stage for diagnostics

3. **Disabled session warming on iOS** (`useSessionWarming.ts`)
   - iOS completely skips resume warming to prevent auth deadlocks
   - Android still warms with 2-second delay after resume

4. **Gated subscription auth calls** (`SubscriptionContext.tsx`)
   - `refreshSubscription()` now uses `getUserIdWithFallback()` (3s timeout)
   - Prevents indefinite hangs from `getUser()` on iOS resume

5. **Added hydration stage diagnostics** (`safeAuth.ts`)
   - Stage markers stored in localStorage at each hydration step
   - `getLastHydrationStage()` function for recovery UI

## Test Plan
### iPhone (critical)
1. Open app → confirm it loads
2. Background for 30-60 minutes
3. Return to app
4. Expected: Quick restore OR recovery UI within ~12 seconds (never infinite spinner)
5. If recovery UI shows, tap "Try Again" → should work
6. If still stuck, tap "Reload App" → forces clean reload

### Android (regression check)
- Notifications should still fire
- No new splash loops

### Web (regression check)
- Login and navigation unaffected
