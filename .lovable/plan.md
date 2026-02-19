
# Fix Tab Switch Animations + Remove Progress Pull-to-Refresh

## Problems

1. **Today header still bleeding** -- The code fix is already in place (inline style removed). You need to sync the latest build to your phone. Run: `npm run build && npx cap sync ios && npx cap run ios`

2. **My Stack "shifts up" on every tab switch** -- Each compound card has an `animate-slide-up` CSS class that plays a 0.4s slide-up animation. With persistent tabs, switching from Today to My Stack changes the wrapper from `display: none` to `display: flex`, which re-triggers CSS animations. This makes cards visually "jump up" every time you switch to My Stack.

3. **Progress graph rebuilds on every tab switch** -- Recharts charts animate on mount by default. The `display: none` to `display: flex` transition causes the chart to re-measure its container and replay its entrance animation. The chart needs `isAnimationActive={false}` to prevent this.

4. **Pull-to-refresh on Progress** -- Currently functional but unnecessary since data loads automatically. Removing it simplifies the UI.

## Changes

### 1. `src/components/MyStackScreen.tsx`
- Remove `animate-slide-up` from compound card divs (line 537)
- This prevents the slide animation from replaying on every tab switch
- Cards will appear instantly, which is the correct behavior for persistent tabs

### 2. `src/components/progress/MetricChart.tsx` (or wherever Recharts is used in Progress)
- Add `isAnimationActive={false}` to chart components to prevent animation replay on tab switch
- Charts will render instantly with data already in place

### 3. `src/components/ProgressScreen.tsx`
- Remove `usePullToRefresh` hook and `PullToRefreshIndicator` component
- Remove `{...pullToRefresh.handlers}` from the scroll container div
- Data loads on mount and stays cached via persistent tabs -- no manual refresh needed

## Technical Detail

The root cause of issues 2 and 3 is how CSS and the browser handle `display: none` to `display: flex` transitions. When an element goes from hidden to visible:
- CSS animations replay from their start state
- Layout-dependent components (charts) re-measure and re-animate

The fix is straightforward: disable entrance animations on components that are meant to stay mounted persistently.

## Sync Command

After these changes, sync to your phone:

```text
npm run build && npx cap sync ios && npx cap run ios
```

The Today header fix from the previous round will also be included in this sync.
