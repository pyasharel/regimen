

# Fix Stale Closure Bug in useSwipeBack Hook

## The Problem

There is a bug in `useSwipeBack` that will cause unreliable behavior. The `handleTouchEnd` callback reads `state.translateX` from React state, but because `useCallback` captures the value at render time, it often sees `0` instead of the actual drag distance. This means the user could swipe far enough but the gesture won't trigger navigation.

## The Fix

Use a `useRef` to track the current `translateX` value in real-time, alongside the existing state (which is still needed for rendering the overlay). The `handleTouchEnd` reads from the ref instead of state.

## Technical Details

### File: `src/hooks/useSwipeBack.ts`

Changes:
- Add a `translateXRef` that gets updated every time `translateX` changes
- In `handleTouchEnd`, read from `translateXRef.current` instead of `state.translateX`
- This removes `state.translateX` from the `handleTouchEnd` dependency array, which also eliminates unnecessary re-registration of event listeners on every drag frame

The fix is about 5 lines of code. No other files need to change.

### Why this matters

Without this fix, the swipe-back gesture will feel broken roughly 50% of the time -- the user drags far enough, releases, and nothing happens. That's worse than not having the feature at all. With the fix, it works reliably every time.

### Risk assessment

- Very low risk change (adding a ref, reading from it instead of state)
- No changes to any other component
- All the Drawer conversions and overlay rendering remain untouched
- The gesture parameters (edge zone, threshold, max drag) stay the same

