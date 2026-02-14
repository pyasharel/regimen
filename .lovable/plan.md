

# Fix Plan: Three User-Reported Issues

## Issue 1: Notification "Take Now" doesn't reflect immediately on Today screen

**What's happening:** When you tap "Take Now" on a notification, the medication gets marked as taken in the database, but the Today screen doesn't show it until you navigate away and back. The pending action is processed in the background sync, but the Today screen loads its own data independently and doesn't know to refresh.

**Fix:** After `processPendingActions` completes with any processed actions, dispatch a custom event that TodayScreen listens for to trigger a `loadDoses()` refresh.

## Issue 2: YouTube pauses when opening the app

**What's happening:** The app uses the Web Audio API (`AudioContext`) to play sound effects when you check off a dose. On iOS, creating an AudioContext claims the audio session, which forces other apps (like YouTube) to pause. This happens even before you interact with anything.

**Fix:** Configure the AudioContext with `{ playsInline: true }` and the iOS-specific `webkit-playsinline` category to mix with other audio instead of interrupting it. Specifically, set the audio session category to "ambient" so it doesn't steal focus from background media.

## Issue 3: "As Needed" medications can't record a second dose without restarting

**What's happening:** When you check off an "as needed" medication, it creates a real dose record in the database and marks the virtual dose as taken in local state. But there's no mechanism to reset the virtual dose or create a new slot for another dose — the only way to get a fresh checkbox is to reload the screen.

**Fix:** After successfully recording an "as needed" dose, call `loadDoses()` to refresh the list. This will re-create the virtual "as needed" dose (always starts untaken), and the already-recorded dose will show up as a separate taken entry from the database query. This naturally supports multiple doses per day.

---

## Technical Details

### File: `src/hooks/useAppStateSync.tsx`
- After `processPendingActions` returns with `processed > 0`, dispatch a `window.dispatchEvent(new Event('regimen:doses-updated'))` custom event

### File: `src/components/TodayScreen.tsx`
1. **Notification refetch:** Add an event listener for `regimen:doses-updated` that calls `loadDoses()`, so pending notification actions immediately reflect on screen
2. **AudioContext fix:** When creating the AudioContext for sound effects, pass the option `{ playsInline: true }` and for iOS, configure it to use the "ambient" mixing category so it doesn't interrupt background audio from other apps
3. **As Needed refresh:** After successfully inserting an "as needed" dose record (line ~707), call `loadDoses()` to refresh the dose list, which will re-create a fresh virtual dose slot while keeping the recorded dose visible

### Risks
- All three fixes are low-risk and isolated
- The AudioContext ambient mode may make the app's sounds slightly quieter relative to other audio, but that's the expected tradeoff
- The `loadDoses()` call after as-needed recording adds one extra DB query, but it's lightweight

