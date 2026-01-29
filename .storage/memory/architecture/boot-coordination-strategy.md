# Memory: architecture/boot-coordination-strategy
Updated: 2026-01-29

## Problem
Multiple systems respond to iOS `appStateChange` events simultaneously, causing race conditions during cold starts and app resumes. This leads to "slow connection" errors, theme flickers, and inconsistent subscription status.

## Staggered Resume Timing Strategy

To prevent all systems from hitting the network at once, we use staggered delays:

| System | Delay | Priority | Purpose |
|--------|-------|----------|---------|
| useSessionWarming | 0ms | 1st | Auth session refresh (foundation) |
| ThemeProvider | 0ms (guarded) | 1st | Theme already bootstrapped by main.tsx |
| SubscriptionContext | 800ms | 2nd | Subscription status check |
| useAppStateSync | 1500ms | 3rd | Heavy sync (doses, notifications) |
| useAnalytics | 2000ms | 4th | GA4 tracking (non-critical) |

## Theme Bootstrap Guard

To prevent double Capacitor reads:
1. `main.tsx` sets `localStorage.setItem('theme_bootstrapped_session', 'true')` after applying theme
2. `ThemeProvider.syncWithCapacitor()` checks this flag and skips redundant Capacitor sync
3. The flag is session-scoped (cleared naturally on app restart)

## Timeout Strategy

All async Capacitor/network calls use timeouts:
- Theme bootstrap: 500ms (falls back to localStorage)
- ThemeProvider sync: 500ms (falls back to localStorage)
- Auth getUserIdWithFallback: 3000ms (uses cached session)
- Subscription refresh watchdog: 5000ms (forces isLoading=false)
- Individual query timeouts: 5000ms (via withQueryTimeout)

## Key Files

- `src/main.tsx` - Theme bootstrap with timeout + flag
- `src/components/ThemeProvider.tsx` - Timeout + bootstrap guard
- `src/hooks/useAppStateSync.tsx` - 1500ms resume delay
- `src/contexts/SubscriptionContext.tsx` - 800ms resume delay
- `src/hooks/useAnalytics.tsx` - 2000ms resume delay
