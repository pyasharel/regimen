

# Native Polish: Pull-to-Refresh, Skeleton Loading, and Web Safety Fix

## 1. Gate Swipe-Back to Native Only

**Problem**: The `useSwipeBack` hook currently runs on all platforms, including mobile web browsers. On iOS Safari, the left-edge swipe zone overlaps with the browser's own back gesture, which could cause weird double-navigation or gesture conflicts.

**Fix**: Add an early return in `useSwipeBack` if `Capacitor.isNativePlatform()` is false. The hook will be a no-op on web. No changes needed to any of the 11 screens that use it.

**File**: `src/hooks/useSwipeBack.ts`

---

## 2. Pull-to-Refresh

Add native-feeling pull-to-refresh on the three main content screens:
- **Today screen** -- refreshes compounds, doses, and streak data
- **My Stack screen** -- refreshes the compound list
- **Progress screen** -- refreshes metrics and photos

### How it works
- A new `usePullToRefresh` hook listens for touch-start at the top of the scroll container, tracks a downward drag, and triggers a refresh callback when the user pulls past a threshold (~60px)
- Shows a small spinner/indicator at the top during the pull and while refreshing
- Uses existing React Query `refetch()` calls to reload data (no new API calls needed)
- Haptic feedback on pull threshold (native only)

### New files
- `src/hooks/usePullToRefresh.ts` -- reusable hook
- `src/components/ui/PullToRefreshIndicator.tsx` -- the visual spinner/arrow component

### Modified files
- `src/components/TodayScreen.tsx` -- wrap scrollable area, connect to data refetch
- `src/components/MyStackScreen.tsx` -- same
- `src/components/ProgressScreen.tsx` -- same

---

## 3. Skeleton Loading

Replace the loading spinners/blank states with skeleton placeholders that match the shape of the actual content. This eliminates the "flash" feeling when switching tabs or loading data.

### Skeleton screens to create
- **TodayScreenSkeleton** -- mimics the Today layout (banner placeholder, dose cards, streak card)
- **MyStackScreenSkeleton** -- mimics the stack list (compound card shapes)
- **ProgressScreenSkeleton** -- mimics the chart area and stats row

### Approach
- Use the existing `Skeleton` component from `src/components/ui/skeleton.tsx` (already has shimmer animation)
- Each skeleton is a simple component that renders placeholder rectangles matching the real layout dimensions
- Replace the current loading states (spinners or empty divs) with these skeleton components

### New files
- `src/components/skeletons/TodayScreenSkeleton.tsx`
- `src/components/skeletons/MyStackScreenSkeleton.tsx`
- `src/components/skeletons/ProgressScreenSkeleton.tsx`

### Modified files
- `src/components/TodayScreen.tsx` -- show skeleton while data loads
- `src/components/MyStackScreen.tsx` -- show skeleton while data loads
- `src/components/ProgressScreen.tsx` -- show skeleton while data loads

---

## Risk Assessment

- **Pull-to-refresh**: Low risk. It's additive (new hook + indicator). Only fires on intentional downward drag from top of scroll. Won't interfere with normal scrolling because it checks scroll position before activating.
- **Skeleton loading**: Very low risk. It's purely visual, swapping one loading indicator for another. Uses an existing component.
- **Web safety gate**: Zero risk. One-line early return.

## Summary of all changes

| Change | New Files | Modified Files | Risk |
|--------|-----------|----------------|------|
| Gate swipe-back to native | 0 | 1 | Zero |
| Pull-to-refresh | 2 | 3 | Low |
| Skeleton loading | 3 | 3 | Very low |

