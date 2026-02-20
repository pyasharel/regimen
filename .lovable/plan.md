
# Fix: Eliminate Black Screen During Android Boot Failures

## Root Cause Analysis

Three compounding issues create the black screen:

1. `index.html` `<body>` has no background color — the WebView renders as native black before any CSS loads
2. The boot timeout recovery UI in `main.tsx` uses `background: #000` (intentional black, but wrong choice)
3. The `ProtectedRoute` loading state renders `bg-background` which is correct, but it only appears after React mounts — which can take 1-2 seconds on Android cold start

The result: users see black during the JS loading phase, then black again if either timeout fires.

## Solution: 3 Changes

### Change 1 — `index.html`: Set background color before JS loads

Add a `<style>` block in the `<head>` that applies the dark background color immediately when the HTML parses. This costs zero JS and eliminates the native-WebView black flash entirely.

```html
<style>
  html, body, #root {
    background-color: #0a0a0a; /* matches --background in dark theme */
    margin: 0;
    min-height: 100vh;
  }
</style>
```

### Change 2 — `main.tsx`: Replace the black boot timeout recovery screen

The current inline HTML uses `background: #000` and has no branding. Replace it with the app's dark background color and add a branded spinner, so if this screen ever appears, it looks intentional rather than broken.

The new recovery screen will show:
- Dark background (`#0a0a0a`) matching the app theme
- Regimen wordmark logo (the PNG already exists at `/regimen-wordmark-transparent.png`)  
- A spinner and "Taking longer than expected..." message
- The same "Reset & Retry" and "Try Again" buttons

### Change 3 — `main.tsx`: Extend boot timeout slightly on Android

The 4-second `BOOT_TIMEOUT_MS` is aggressive for Android cold starts where:
- JS bundle parsing takes longer on lower-end devices
- `preHydrateAuthFromMirror()` is async and can overlap the timeout

Change from 4000ms to **6000ms** for native platforms (keep 4000ms for web). This gives the normal auth flow time to complete on slower Android devices before the recovery screen appears, reducing false-positive timeout triggers.

## Files to Modify

| File | Change |
|------|--------|
| `index.html` | Add inline `<style>` with dark background for `html`, `body`, `#root` |
| `src/main.tsx` | Replace `background: #000` recovery HTML with branded dark version; increase native timeout to 6000ms |

## What This Does NOT Change

- The actual boot/auth logic remains identical
- The 12-second ProtectedRoute watchdog is unchanged (already renders with `bg-background`)
- The Splash screen behavior is unchanged
- No impact on iOS

## Impact on Real Users

Fresh install from Play Store: **No change** — they go straight to onboarding
Existing user upgrade: **Black flash eliminated**, recovery screen is now branded if timeout fires
Developer replacing install: **Same behavior but visually less alarming**
