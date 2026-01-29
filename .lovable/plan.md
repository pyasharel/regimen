

## Assessment: Comparing My Implementation vs. Other AI Platforms

### What I Already Implemented (✅ Done)
| Feature | Status | Details |
|---------|--------|---------|
| Startup Preflight | ✅ Done | `runStartupPreflight()` in main.tsx validates localStorage before React mounts |
| Global error handlers | ✅ Done | `error` and `unhandledrejection` listeners in main.tsx |
| Splash retry strategy | ✅ Done | 4-retry pattern (0ms, 400ms, 1200ms, 2500ms) in App.tsx |
| App resume hide attempts | ✅ Done | `appStateChange` listener calls `attemptHide()` |
| Visible Splash UI + Watchdog | ✅ Done | Splash.tsx shows loading UI, 5-second timeout, recovery buttons |
| Safe notification actions | ✅ Done | Pending action queue, no auth/db calls in handlers |
| MedicationLevels date parsing | ✅ Done | `parseTakenAt()` helper with robust ISO normalization |
| halfLifeCalculator guards | ✅ Done | `Number.isFinite` checks prevent NaN propagation |

### What the Other Platforms Identified That I MISSED (❌ Gaps)

| Issue | Impact | Recommendation |
|-------|--------|----------------|
| **`launchShowDuration: 0` is a documented Capacitor bug** | **HIGH** - This is likely the ROOT CAUSE | Change to `400` |
| No boot timeout fallback in main.tsx | MEDIUM | Add 6-second timeout that shows recovery UI if React doesn't render |
| No resume "stuck detection" with forced reload | MEDIUM | After resume, check if root is empty after 3s and force reload |
| MedicationLevelsCard not wrapped in error boundary | MEDIUM | Wrap in error boundary so crash doesn't take down whole app |
| ErrorBoundary doesn't support custom fallback prop | LOW | It renders full-screen error, which is fine for app-level but not component-level |

---

## Critical Finding: `launchShowDuration: 0`

The other platforms all converged on this as the primary culprit, and they're right. ChatGPT even linked a GitHub issue documenting this behavior.

**Current config:**
```typescript
SplashScreen: {
  launchShowDuration: 0,  // ← PROBLEM
  launchAutoHide: false,
  // ...
}
```

When `launchShowDuration` is `0` AND `launchAutoHide` is `false`, iOS exhibits unpredictable behavior where the native splash can get "stuck" in a state where JS `SplashScreen.hide()` calls don't register properly—especially on app resume after being backgrounded.

This explains:
- Why it's intermittent (timing/race condition)
- Why reinstall fixes it temporarily (clears the stuck native state)
- Why it started recently (new code shifted timing windows)
- Why both platforms are affected

---

## Updated Plan: Final Hardening Layer

We need to add these 4 remaining fixes to complete the defense-in-depth approach:

### 1. Fix `launchShowDuration` in capacitor.config.ts
**Change from:**
```typescript
launchShowDuration: 0,
```
**To:**
```typescript
launchShowDuration: 400,  // Fixes iOS edge case with launchAutoHide: false
```

This is the most impactful single change—it directly addresses the documented Capacitor bug.

### 2. Add Boot Timeout Fallback in main.tsx
Before React renders, start a 6-second timer. If React doesn't mount and clear the timer, inject recovery UI directly into the DOM:

```typescript
// Boot timeout - if React doesn't render in 6 seconds, show recovery UI
const BOOT_TIMEOUT_MS = 6000;
const bootTimeoutId = setTimeout(() => {
  // Try to hide splash
  import('@capacitor/splash-screen').then(({ SplashScreen }) => {
    SplashScreen.hide().catch(() => {});
  }).catch(() => {});
  
  const root = document.getElementById('root');
  if (root && root.children.length === 0) {
    root.innerHTML = `<recovery UI here>`;
  }
}, BOOT_TIMEOUT_MS);

// Store on window so App.tsx can clear it
(window as any).__bootTimeoutId = bootTimeoutId;
```

Then in App.tsx, clear it on mount:
```typescript
useEffect(() => {
  if ((window as any).__bootTimeoutId) {
    clearTimeout((window as any).__bootTimeoutId);
    delete (window as any).__bootTimeoutId;
  }
}, []);
```

### 3. Add Resume "Stuck Detection" in App.tsx
After the app resumes, check if the root element is empty after 3 seconds. If so, something went wrong—force a reload:

```typescript
if (isActive) {
  attemptHide();
  
  // Safety check: if root is empty after 3 seconds, reload
  setTimeout(() => {
    const root = document.getElementById('root');
    const hasContent = root && root.children.length > 0 && root.innerHTML.length > 100;
    if (!hasContent) {
      console.error('[RECOVERY] App appears stuck after resume, reloading');
      window.location.reload();
    }
  }, 3000);
}
```

### 4. Create Component-Level Error Boundary for MedicationLevelsCard
Create a lightweight error boundary specifically for wrapping components that might crash:

**New file:** `src/components/ui/ComponentErrorBoundary.tsx`
```typescript
class ComponentErrorBoundary extends React.Component<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
  name?: string;
}> { ... }
```

Then wrap MedicationLevelsCard in TodayScreen.tsx:
```typescript
<ComponentErrorBoundary 
  name="MedicationLevels"
  fallback={<div className="text-muted-foreground text-sm p-4">Unable to load medication levels</div>}
>
  <MedicationLevelsCard ... />
</ComponentErrorBoundary>
```

---

## Files to Change

| File | Change |
|------|--------|
| `capacitor.config.ts` | Change `launchShowDuration` from `0` to `400` |
| `src/main.tsx` | Add boot timeout with recovery UI injection |
| `src/App.tsx` | Add boot timeout clear + resume stuck detection with forced reload |
| `src/components/ui/ComponentErrorBoundary.tsx` | **NEW** - Lightweight error boundary for components |
| `src/components/TodayScreen.tsx` | Wrap MedicationLevelsCard in ComponentErrorBoundary |

---

## Expected Outcome After These Final Changes

1. **`launchShowDuration: 400`** directly fixes the documented Capacitor race condition
2. **Boot timeout** ensures users never see permanent black if React fails to mount
3. **Resume stuck detection** catches edge cases where the app resumes into a broken state
4. **Component error boundary** isolates MedicationLevelsCard crashes from taking down the whole screen

Combined with the already-implemented:
- Startup preflight (localStorage sanitation)
- Splash watchdog with recovery UI
- SplashScreen.hide() retry strategy
- Safe notification action handling
- Robust date parsing

This creates a **complete defense-in-depth** approach that should eliminate the black screen issue entirely.

---

## Post-Implementation Testing

1. `npm run build && npx cap sync`
2. On device: fresh install → open → verify app loads
3. Force kill → reopen 10 times
4. Background → resume 10 times
5. Trigger notification action → verify no gray-out
6. Artificially corrupt localStorage → verify recovery UI appears

