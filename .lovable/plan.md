

# Persistent Tabs + Fresh Device Sync

## Summary

The changes from the last round (header fix, skeleton removal, overlay removal, pull-to-refresh removal) are already in the codebase but not on your phone yet. This plan adds persistent tabs on top of those changes so tab switching is instant, then gives you a clean sync command.

## What's Already Done (just needs syncing)

- Header border removed (no more line bleeding into status bar)
- Skeleton screens removed from Today and My Stack
- Coral swipe-back overlay removed from all screens
- Pull-to-refresh removed from Today and My Stack (kept on Progress)

## New Change: Persistent Tabs

### The Problem

Right now, React Router unmounts the Today screen when you tap "My Stack", then rebuilds it from scratch when you tap back. That triggers a fresh data fetch and any loading state, even if brief, causes a flash.

### The Solution

Render all four tab screens (Today, My Stack, Progress, Settings) simultaneously and toggle their visibility with CSS `display: none` vs `display: flex`. The bottom navigation updates which one is visible. Non-tab routes (settings sub-pages, compound details, add compound) still use normal React Router.

### Architecture

```text
AppContent
  |
  +-- PersistentTabContainer (always mounted)
  |     +-- TodayScreen       (visible when path = /today)
  |     +-- MyStackScreen      (visible when path = /stack)
  |     +-- ProgressScreen     (visible when path = /progress)
  |     +-- SettingsScreen     (visible when path = /settings)
  |
  +-- <Routes> (for non-tab pages only)
        +-- /auth, /onboarding, /add-compound, /stack/:id, 
        +-- /settings/account, /settings/notifications, etc.
```

### Files to Change

1. **New: `src/components/PersistentTabContainer.tsx`**
   - Renders all 4 tab screens simultaneously
   - Uses `useLocation()` to determine which is visible
   - Wraps each screen in a div with `display: none` when inactive
   - Only renders when user is authenticated (checks same auth state as ProtectedRoute)

2. **Modified: `src/App.tsx`**
   - Remove individual `/today`, `/stack`, `/progress`, `/settings` routes from `<Routes>`
   - Add `<PersistentTabContainer />` alongside `<Routes>` inside AppContent
   - Non-tab routes remain unchanged in `<Routes>`

3. **Modified: `src/components/BottomNavigation.tsx`**
   - Change from `navigate(path)` to using a context or callback that toggles the active tab
   - Actually, since we use `useLocation()` in the container, navigate still works fine. When you tap "My Stack", `navigate('/stack')` updates the URL, and the container reacts by showing MyStackScreen. No changes needed here.

### Downsides

- Slightly higher memory usage since all 4 screens stay mounted (roughly 5-10MB extra, negligible)
- All 4 screens will fetch their data on first load rather than on-demand. This means the initial load takes slightly longer, but every subsequent tab switch is instant with zero loading.
- We need to make sure each screen's `useEffect` data-fetching doesn't re-run unnecessarily when the screen becomes visible again (should already be fine since the component stays mounted and effects only run on mount)

### How to Sync to Your Phone

After this is implemented, run:

```bash
git pull && npm install && npm run build && npx cap sync ios && npx cap run ios
```

No need to delete the app first. This will overwrite the existing build with fresh code.

