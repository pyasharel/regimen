# Memory: architecture/auth-lock-contention-fix
Updated: 2026-02-08

## Problem
Android (and iOS) cold starts after 24+ hours in background cause "Connection issue" screens with `all_fail` support code. The app shows "Restoring your session..." for ~20 seconds before failing.

## Root Cause
Race condition between `SubscriptionContext.onAuthStateChange` and `ProtectedRoute.hydrateSessionOrNull()`:
1. Both systems attempt Supabase auth calls simultaneously on cold start
2. Supabase maintains a global auth lock - first caller blocks subsequent calls
3. On mobile, slower network startup means the first call holds the lock while waiting
4. `ProtectedRoute` exhausts hydration attempts while `SubscriptionContext` holds the lock

## Solution - Fire-and-Forget Pattern

### ProtectedRoute.tsx
- Sets `window.__authHydrationComplete = true` after successful hydration
- Dispatches `regimen:hydration-complete` custom event
- Other systems can now wait for hydration before making auth calls

### SubscriptionContext.tsx
1. **Boot Gate**: `initialize()` waits for `regimen:hydration-complete` event (max 5s timeout) before proceeding
2. **Non-blocking onAuthStateChange**: Callback is synchronous, uses `setTimeout(() => ..., 0)` to defer:
   - RevenueCat initialization
   - User identification
   - `refreshSubscription()` calls
3. **Removed redundant getUser()**: `refreshSubscription()` no longer calls `supabase.auth.getUser()` - uses userId from `getUserIdWithFallback()` instead

## Key Principle
Never await async operations inside `supabase.auth.onAuthStateChange()` callbacks. This follows the recommended Supabase pattern for mobile apps.

## Files Modified
- `src/components/ProtectedRoute.tsx` - hydration complete signal
- `src/contexts/SubscriptionContext.tsx` - boot gate + fire-and-forget pattern
