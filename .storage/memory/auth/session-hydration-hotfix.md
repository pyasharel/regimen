# Memory: auth/session-hydration-hotfix
Updated: now

## Problem Solved
The app was showing "first-time user" empty state after hard closes due to:
1. ProtectedRoute creating fake sessions from cache (only user object, no auth tokens)
2. DB queries executing before auth was fully hydrated, returning empty due to RLS
3. Initial mount sync causing contention with auth hydration
4. Notification permission requests blocking the native bridge

## Solution Implemented

### 1. Real Session Hydration (safeAuth.ts)
- `hydrateSessionOrNull()`: Tries getSession with timeout, then falls back to calling `setSession()` with cached tokens to properly hydrate the Supabase client
- Returns a real Session or null - never a fake session
- This ensures RLS-protected queries have proper auth context

### 2. ProtectedRoute Rewrite
- Uses `hydrateSessionOrNull()` instead of creating fake sessions from cache
- Shows "Restoring your session..." UI while hydrating
- Provides retry/sign-in options if hydration fails
- Never renders children until a real session is confirmed

### 3. Auth-Gated Data Loads
- TodayScreen: `loadDoses`, `checkCompounds` now require userId before querying
- MyStackScreen: `loadCompounds` now requires userId before querying
- All queries explicitly include `.eq('user_id', userId)` 
- If userId not available, keeps loading state (doesn't show empty)

### 4. Reduced Startup Contention
- Removed initial-mount sync in useAppStateSync (was running after 300ms)
- Changed `scheduleAllUpcomingDoses` to use `checkPermissions()` instead of `requestPermissions()`
- This prevents iOS permission dialogs from blocking the native bridge during boot

### 5. Unified QueryClient
- Removed duplicate QueryClientProvider from App.tsx
- Single QueryClient in main.tsx ensures consistent caching/retry behavior

## Key Files Changed
- `src/utils/safeAuth.ts` - Added hydrateSessionOrNull, ensureAuthReady
- `src/components/ProtectedRoute.tsx` - Complete rewrite with proper hydration
- `src/components/TodayScreen.tsx` - Auth-gated data loads
- `src/components/MyStackScreen.tsx` - Auth-gated data loads
- `src/hooks/useAppStateSync.tsx` - Removed initial mount sync
- `src/utils/notificationScheduler.ts` - Check permissions instead of request
- `src/App.tsx` - Removed duplicate QueryClientProvider
