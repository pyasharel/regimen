

# Root Cause Analysis: App Loading Issues After Theme Change

## Executive Summary

The app is experiencing loading failures, "slow connection" errors, and theme persistence issues due to **multiple competing async operations that race against each other during app resume**. The current fixes (timeouts, caches) are mitigations, not solutions.

## Root Cause 1: Competing `appStateChange` Listeners

Five separate systems all respond to the iOS `appStateChange` event simultaneously:

```text
+-------------------+     +------------------+     +--------------------+
|     App.tsx       |     | useAppStateSync  |     | useSessionWarming  |
| SplashScreen.hide |     | DB cleanup       |     | auth.getSession()  |
| 3s empty root     |     | Dose regen       |     +--------------------+
| reload check      |     | Notifications    |              |
+-------------------+     +------------------+              |
         |                        |                         |
         +------------------------+-------------------------+
                                  |
                      ALL FIRE SIMULTANEOUSLY
                                  |
         +------------------------+-------------------------+
         |                        |                         |
+-------------------+     +------------------+     +--------------------+
|  useAnalytics     |     | Subscription     |     |    ThemeProvider   |
|  GA4 tracking     |     |   Context        |     |  Capacitor sync    |
|  Session events   |     | RevenueCat init  |     +--------------------+
+-------------------+     | Customer info    |
                          | Cache loading    |
                          +------------------+
```

When these all run on a cold start after a hard close:
- Native bridge is still initializing (iOS slow start)
- Multiple network requests compete for bandwidth
- Auth session might not be ready yet
- Race conditions cause inconsistent state

## Root Cause 2: Double Theme Read Pattern

**Sequence on cold boot:**

1. `main.tsx:bootstrapTheme()` reads Capacitor Preferences (with 500ms timeout)
2. Timeout fires → falls back to localStorage
3. React renders → `ThemeProvider` mounts
4. `ThemeProvider.syncWithCapacitor()` reads Capacitor Preferences AGAIN (no timeout)
5. If this second read returns different value → theme can flip

The 500ms timeout in `main.tsx` helps, but `ThemeProvider` still makes an unbounded async call.

## Root Cause 3: Timeout Cascade Mismatch

Current timeout values create conflicts:

| Component | Timeout | Purpose |
|-----------|---------|---------|
| main.tsx boot fallback | 6000ms | Show recovery UI |
| Splash.tsx watchdog | 8000ms | Session check timeout |
| ProtectedRoute | 3000ms | Session check timeout |
| Theme bootstrap | 500ms | Capacitor read |
| useAppStateSync debounce | 2000ms | Prevent rapid sync |
| useAppStateSync resume delay | 600ms | Let network stabilize |
| getUserIdWithFallback | 3000ms | Auth fallback |
| Individual query timeouts | 5000ms | Database operations |

A slow Capacitor Preferences read that takes 4 seconds:
- Passes the 500ms theme timeout (uses fallback)
- But blocks the React render
- App.tsx 6s timeout might fire before React mounts
- Creates confusing state

## Root Cause 4: No Coordinated Boot Sequence

The app lacks a **single boot coordinator** that ensures:
1. Native bridge is ready
2. Auth session is verified
3. Theme is applied
4. THEN start background sync operations

Currently, everything starts simultaneously.

## The Fix Strategy

### Phase 1: Immediate Stabilization (Hotfix)

1. **Add timeout to ThemeProvider's Capacitor sync** (match main.tsx pattern)
2. **Reduce appStateChange listener count** - defer non-critical listeners
3. **Add staggered delays** to prevent all systems hitting network at once

### Phase 2: Architectural Fix (Post-Hotfix)

1. **Create boot coordinator** that sequences initialization
2. **Consolidate appStateChange handling** into single orchestrator
3. **Implement proper readiness signals** before triggering background work

## Immediate Fixes for Hotfix

### Fix 1: ThemeProvider Timeout

Add the same timeout pattern used in `main.tsx` to `ThemeProvider.tsx`:

```typescript
// In syncWithCapacitor():
const result = await Promise.race([
  getStoredTheme(storageKey),
  new Promise<null>(r => setTimeout(() => r(null), 500))
]);
// Use result only if not null
```

### Fix 2: Staggered Resume Delays

Increase delay offsets so systems don't all fire together:

| System | Current Delay | New Delay |
|--------|--------------|-----------|
| useSessionWarming | 0ms | 0ms (first) |
| useAppStateSync | 600ms | 1500ms |
| SubscriptionContext resume | 0ms | 800ms |
| useAnalytics | 0ms | 2000ms |

### Fix 3: Guard Against Double Theme Sync

In `ThemeProvider`, skip Capacitor sync if `main.tsx` already applied theme:

```typescript
// Check if main.tsx already bootstrapped
const alreadyBootstrapped = localStorage.getItem('theme_bootstrapped');
if (alreadyBootstrapped) {
  setIsLoaded(true);
  return;
}
```

## Technical Implementation

### Files to Modify

1. **`src/components/ThemeProvider.tsx`**
   - Add 500ms timeout to `syncWithCapacitor()`
   - Add "already bootstrapped" guard

2. **`src/main.tsx`**
   - Set `localStorage.setItem('theme_bootstrapped', 'true')` after bootstrap
   - Clear on theme change

3. **`src/hooks/useAppStateSync.tsx`**
   - Increase RESUME_DELAY_MS from 600ms to 1500ms

4. **`src/contexts/SubscriptionContext.tsx`**
   - Add 800ms delay before resume handling

5. **`src/hooks/useAnalytics.tsx`**
   - Add 2000ms delay before resume tracking

6. **Create `.storage/memory/architecture/boot-coordination-strategy.md`**
   - Document the staggered timing strategy

## Testing Protocol

After implementing:

1. Change theme to light mode
2. Hard close app (swipe away)
3. Wait 10+ seconds
4. Reopen app
5. **Expected**: Theme persists, data loads without "slow connection"

6. Repeat steps 1-5 three times to verify consistency

7. Test notification tap cold start
8. **Expected**: App opens, navigates to Today, data loads

## Why Previous Fixes Were Insufficient

The 500ms timeout in `main.tsx` helped but:
- `ThemeProvider` still has unbounded Capacitor calls
- All resume handlers still fire simultaneously
- No coordination between competing async operations

The cached session fast-path helped but:
- Doesn't prevent race conditions in data loading
- SubscriptionContext can still fall back to 'none' during races

