# Memory: architecture/multi-trigger-resume-recovery
Updated: 2026-02-02

## Problem
On iOS, resuming via notification tap often fails to fire the Capacitor `appStateChange` event. When this happens, existing recovery logic (client recreation, splash-hide, "root empty" safety reload) never runs, leaving users stuck with a hung app.

## Solution: Multi-Trigger Resume System

The app now treats THREE signals as valid resume triggers:

| Trigger | Source | Reliability |
|---------|--------|-------------|
| `appStateChange` | Capacitor App plugin | Primary, but unreliable on iOS notification taps |
| `visibilitychange` | Standard DOM event | Fallback, fires when page becomes visible |
| `regimen:resume` | Custom event from notification handler | Deterministic, tied to user interaction |

## Implementation

### App.tsx
- Listens to all three triggers
- Each trigger calls `handleResumeSignal(source)` which:
  - Retries `SplashScreen.hide()`
  - Schedules 3s safety check: reload if root content is empty

### useAppStateSync.tsx  
- Listens to all three triggers with 2s debounce
- Each trigger calls `handleAppBecameActive(source)` which:
  - Aborts stuck inflight requests
  - Recreates both supabase + data clients
  - Waits 1.5s for network stability
  - Runs full notification sync

### notificationScheduler.ts
- On `localNotificationActionPerformed`:
  - Immediately dispatches `window.dispatchEvent(new Event('regimen:resume'))`
  - This guarantees resume logic runs even if other events don't fire

## Tracing
Boot diagnostics now show which trigger fired:
- `RESUME_TRIGGER: appStateChange`
- `RESUME_TRIGGER: visibilitychange` 
- `RESUME_TRIGGER: notification_action`

## Expected Outcome
- Users should no longer need hard-close after notification taps
- If resume still fails, app auto-recovers within 3-10 seconds via reload
- Boot Trace provides visibility into which triggers fired (or didn't)
