

# Fix Deployment Sync + Restore Premium Animations + Black Screen Fix

## Issue 1: Deployment Not Syncing

**Root cause:** The sync command is missing `git pull`. Lovable edits live in the git repo, but the local machine still has old code. All commands going forward should start with `git pull`.

**Correct sync command:**
```text
git pull && npm run build && npx cap sync ios && npx cap run ios
```

## Issue 2: Restore One-Time Animations (Premium Feel)

The slide-up on My Stack and chart draw-in on Progress both feel premium. The problem is only that they replay on every tab switch due to persistent tabs toggling `display: none` to `display: flex`.

**Fix approach:** Use a React ref to track whether the component has already rendered once. On first render, apply the animation class. On subsequent renders (tab switches), skip it.

### MyStackScreen.tsx
- Add a `hasAnimated` ref that starts `false` and flips to `true` after first render
- Conditionally apply `animate-slide-up` only when `!hasAnimated.current`
- Set `hasAnimated.current = true` in a `useEffect` on mount

### MetricChart.tsx  
- Revert `isAnimationActive={false}` back to `isAnimationActive={true}` (or remove the prop entirely)
- Add a `hasAnimated` ref, same pattern
- Pass `isAnimationActive={!hasAnimated.current}` so charts animate on first view only

### Additional Premium Animations (New)
- **Today screen dose cards**: Add a subtle staggered fade-in on first load (each card fades in 50ms after the previous one). Use the same one-time ref pattern.
- **Streak badge**: Add a gentle scale-in animation when it first appears

## Issue 3: Black Screen After Fresh Install Sign-In

**Root cause:** After signing in on a fresh install, the Auth page navigates to `/today`, which mounts ProtectedRoute. The fast-path cache check fails because the Supabase auth state change writes the session token to localStorage asynchronously -- there's a brief window where the navigate has fired but the cache key hasn't been written yet. The slow path then starts, but if there's any contention (e.g., the auth client is still processing the sign-in), it can hang briefly, producing the black screen.

**Fix:** In Auth.tsx, after the `SIGNED_IN` event fires, explicitly write the session to the cache key BEFORE navigating. This seeds the fast-path so ProtectedRoute's cache check will hit immediately.

### Auth.tsx changes
- On `SIGNED_IN` event, before calling `navigate("/today")`:
  - Write the session data to `localStorage` under the standard Supabase cache key (`sb-{projectId}-auth-token`)
  - This ensures ProtectedRoute's fast-path always finds the session on fresh login

## Issue 4: Bump Build Number

- Update `capacitor.config.ts`: change `appBuild` from `'41'` to `'43'`
- The user manually used 42 for a TestFlight upload, so the next available is 43

## Summary of Changes

| File | Change |
|------|--------|
| `src/components/MyStackScreen.tsx` | Restore `animate-slide-up` with one-time-only ref guard |
| `src/components/progress/MetricChart.tsx` | Restore chart animation with one-time-only ref guard |
| `src/components/TodayScreen.tsx` | Add staggered fade-in on dose cards (one-time only) |
| `src/pages/Auth.tsx` | Seed session cache before navigating on SIGNED_IN |
| `capacitor.config.ts` | Bump appBuild to '43' |

## Sync Command (After Implementation)

```text
git pull && npm run build && npx cap sync ios && npx cap run ios
```

Note: this time the command includes `git pull` so the latest code actually reaches the phone.

