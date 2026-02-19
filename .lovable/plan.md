
# Performance Fixes: My Stack Animation + Date Lag

Two issues identified from Jay's feedback:

---

## Issue 1: My Stack Animates on Every Tab Switch

**Root cause (line 538 in MyStackScreen.tsx):**
```
className="... animate-slide-up"
```
Every active compound card has `animate-slide-up` applied unconditionally. Because the app uses `PersistentTabContainer` (tabs stay mounted), this animation still fires every time the user switches to My Stack — because CSS animations re-trigger when the tab becomes visible again (switching from `display:none` to `display:block`).

**Fix:**
- Remove `animate-slide-up` from the compound card `className` entirely.
- The cards don't need a per-visit entrance animation — they should just be there instantly, like a native app list.
- The existing `hasAnimatedProgress` session-guard pattern already exists for the progress bar, so we just remove the redundant card animation that wasn't gated the same way.

---

## Issue 2: Date Changing is Very Laggy

**Root cause (line 286-307 in TodayScreen.tsx):**
```js
useEffect(() => {
  // On native, wait for the 2s boot delay to complete
  if (Capacitor.isNativePlatform() && !window.__bootNetworkReady) {
    const checkReady = setInterval(() => { ... }, 100);
    ...
  }
  loadDoses();
  ...
}, [selectedDate]);
```

The `useEffect` that loads doses runs **every time `selectedDate` changes**. This is intentional — but the problem is that `loadDoses` is a full async function that:
1. Calls `getUserIdWithFallback(3000)` — can take up to 3 seconds
2. Makes **two sequential database queries** (doses + as-needed compounds)
3. Only sets `loading = false` when both finish

When the user taps a different date, they have to wait for this whole chain before the UI updates. There's no optimistic UI feedback, no loading indicator for the date change, and no caching between date switches.

**Fixes:**
1. **Optimistic empty state**: When `selectedDate` changes, immediately clear `doses` to `[]` and show a lightweight "loading" indicator instead of keeping stale previous-day doses visible while the new fetch runs.
2. **Separate the boot guard from date-change loads**: The `setInterval` boot-wait check (for `__bootNetworkReady`) should only run on initial mount — not on every subsequent date change. On date changes after boot, call `loadDoses()` directly without the boot guard check.
3. **Add a `isDateLoading` state** that's set to `true` immediately when date changes and `false` when doses finish loading, so the UI can show a subtle spinner on the date strip instead of appearing frozen.

---

## Files to Change

**`src/components/MyStackScreen.tsx`** (line 538):
- Remove `animate-slide-up` from active compound card `className`

**`src/components/TodayScreen.tsx`**:
- Split the `useEffect([selectedDate])` into two:
  - One effect runs only on **mount** with the `__bootNetworkReady` guard
  - A second effect runs on **date changes** (skipping the boot guard since the app is already ready) and clears doses first for instant feedback
- Add `isDateLoading` state to show a visual indicator when switching dates
- Show a subtle spinner or skeleton on the dose list area while `isDateLoading` is true instead of stale cards

---

## Technical Notes

- The `getUserIdWithFallback(3000)` call on every date change may be slow. After the initial load, the userId is almost certainly cached. We can short-circuit with a module-level cache (already partially implemented via `authSessionCache.ts`) — but the biggest win is the immediate UI clear + separate boot guard, which will make it *feel* instant even if the network round trip takes 500ms.
- No database schema changes required.
- No new dependencies required.
