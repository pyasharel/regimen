

# Fix Native Polish Issues -- Remove/Refine Features That Don't Feel Right

## Summary

Several recently added "native feel" features are actually making the app feel worse. This plan removes or tones down the ones that aren't working while keeping what does.

## Changes

### 1. Fix Header Bleeding Into Status Bar

The `border-b border-border` on MainHeader creates a visible line that collides with the iOS status bar area.

**Fix:** Remove the `border-b` from the header. The header was clean before without it.

**File:** `src/components/MainHeader.tsx` (line 16)

---

### 2. Remove Skeleton Screens From Tab Switches

The Today and My Stack skeletons flash for a fraction of a second every time you switch tabs because the components unmount/remount and `loading` starts as `true`. This looks worse than what we had before.

**Fix:** Instead of showing a full skeleton screen during the loading state, just show nothing (or the previous content). The simplest approach: change the skeleton return to show the actual screen layout with invisible/transparent content rather than gray blocks, OR skip the skeleton entirely and just let the content pop in.

The cleanest fix: remove the skeleton returns from TodayScreen and MyStackScreen. Instead, let the screens render their shell (header, nav, empty content area) immediately, and only show a subtle inline loader if data takes more than ~300ms. Progress screen already works fine as you noted.

**Files:**
- `src/components/TodayScreen.tsx` (line 1369-1371) -- remove skeleton, render the shell immediately
- `src/components/MyStackScreen.tsx` (line 453-455) -- same treatment

---

### 3. Remove Swipe Back Overlay (Coral Glow + Chevron)

The coral edge glow and arrow chevron don't feel premium. On iOS, the native back swipe has no visible indicator -- it just slides the view. Since our WebView can't do a true view-slide animation, the overlay just draws attention to the fact that it's not native.

**Fix:** Remove the SwipeBackOverlay component rendering from all screens. Keep the `useSwipeBack` hook (it still triggers `navigate(-1)` which is useful), but stop rendering the visual overlay.

**Files to update (remove `<SwipeBackOverlay ... />` JSX):**
- `src/components/settings/DataSettings.tsx`
- `src/components/settings/DisplaySettings.tsx`
- `src/components/settings/NotificationsSettings.tsx`
- `src/components/settings/HelpSettings.tsx`
- `src/components/settings/TermsSettings.tsx`
- `src/components/settings/PrivacySettings.tsx`
- `src/components/settings/AccountSettings.tsx`
- `src/components/CompoundDetailScreen.tsx`
- `src/components/CompoundDetailScreenV2.tsx`
- `src/components/AddCompoundScreen.tsx`
- `src/components/PhotoCompareScreen.tsx`

---

### 4. Remove Pull to Refresh From Today and My Stack

The pull-to-refresh gesture doesn't add clear value on these screens since data loads automatically. It also adds visual noise (the spinner indicator at top).

**Fix:** Remove the `usePullToRefresh` hook usage, the `PullToRefreshIndicator` component, and the touch handlers from TodayScreen and MyStackScreen. Keep the code files around in case we want them later, just stop using them.

**Files:**
- `src/components/TodayScreen.tsx` -- remove pull-to-refresh hook, indicator, and touch handlers
- `src/components/MyStackScreen.tsx` -- same

The Progress screen can keep pull-to-refresh if it works well there (you said it loads nicely).

---

## What We Keep

- **Haptic feedback** on dose checkmarks and other interactions -- this works well
- **Swipe back navigation** (the `useSwipeBack` hook) -- the gesture itself works, just no visual overlay
- **Progress screen skeleton** -- you said this one looks good
- **Pull to refresh on Progress** -- if it's working well there, keep it

## Technical Details

### Skeleton removal approach

In TodayScreen, instead of:
```typescript
if (loading) {
  return <TodayScreenSkeleton />;
}
```

Change to render the real screen shell immediately with the header and nav, and just show an empty content area while loading. The data will pop in within milliseconds on a warm cache, so users won't even notice.

### SwipeBackOverlay removal

Each settings screen currently has:
```tsx
const swipeBack = useSwipeBack();
// ... in JSX:
<SwipeBackOverlay active={swipeBack.active} translateX={swipeBack.translateX} />
```

We keep the `useSwipeBack()` call (so the gesture still triggers navigation) but remove the `<SwipeBackOverlay>` line and its import.

