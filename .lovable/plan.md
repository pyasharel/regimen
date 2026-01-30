
# Guaranteed Boot Hotfix - Implementation Plan

## Overview

This hotfix addresses the critical "black screen on cold start" issue affecting all users. The plan implements the consensus recommendations from Claude, ChatGPT, and Gemini to guarantee users can boot the app, even if some features are temporarily degraded.

## Root Cause Summary

**Primary Suspects (High Confidence):**
1. `persistentStorage.migrateFromLocalStorage()` - 40+ sequential `Preferences.get()` calls saturating the Capacitor bridge on every boot
2. Supabase Auth session restore hanging indefinitely due to corrupted cached session

**Why "works once, breaks on second launch":**
- First install: localStorage is empty, migration does nothing, app boots fast
- First successful session: App writes data to localStorage (auth tokens, theme, selectedLevelsCompound, etc.)
- Second launch: Migration tries to read 40+ keys that now have data, potentially saturating the Capacitor bridge

---

## Implementation Changes

### 1. Failed Boot Detection (main.tsx)

Add failed boot detection at the **very top** of `main.tsx`, **before** the preflight import:

```text
Logic:
- Check if REGIMEN_BOOT_STATUS === 'STARTING' (means previous boot never completed)
- If so, clear suspect keys that could cause hangs
- Mark boot as 'STARTING' immediately
- Mark as 'COMPLETE' after successful app render
```

**Keys to clear on failed boot detection:**
- `selectedLevelsCompound` (Medication Levels feature)
- `medicationLevelsCollapsed` (Medication Levels feature)
- `cachedEntitlement` (Subscription cache)
- `pendingDoseActions` (Notification queue)
- Any keys containing `sb-` or `supabase` (auth tokens)

### 2. Disable Eager Migration (App.tsx)

Comment out the migration `useEffect` that calls `persistentStorage.migrateFromLocalStorage()`:

```typescript
// HOTFIX: Migration disabled - suspected cause of black screen
// The 40+ sequential Preferences.get() calls may saturate the Capacitor bridge
// TODO: Re-enable with lazy loading after root cause confirmed
// useEffect(() => {
//   persistentStorage.migrateFromLocalStorage(PERSISTENT_STORAGE_KEYS);
// }, []);
```

### 3. Mark Boot Complete (App.tsx)

In the splash hide `useEffect`, after successful hide attempts, mark boot as complete:

```typescript
// Mark boot complete after splash successfully hides
localStorage.setItem('REGIMEN_BOOT_STATUS', 'COMPLETE');
```

### 4. Simplify Splash Auth Check (Splash.tsx)

Replace the complex session hydration with a simpler, non-blocking approach:

```text
New Approach:
1. Always hide native splash immediately (don't wait for auth)
2. Always show loading UI immediately
3. Check auth in background with 3-second hard timeout
4. On any error/timeout: go to /onboarding (user can sign in again)
```

Key changes:
- Remove the 8-second `TIMEOUT_MS` in favor of 3-second hard timeout
- Remove complex `hydrateSessionOrNull` call
- Use simple `supabase.auth.getSession()` with `Promise.race` timeout
- Always render UI first, never block on auth

### 5. Reduce Boot Timeout (main.tsx)

Change boot timeout from 6 seconds to 4 seconds for faster recovery:

```typescript
const BOOT_TIMEOUT_MS = 4000; // Reduced from 6000
```

### 6. Add Visible Boot Stage Indicator (index.html)

Add a debug indicator visible in development/testing to show boot progress:

```html
<div id="boot-stage" style="position: fixed; bottom: 10px; left: 10px; 
     background: rgba(0,0,0,0.8); color: lime; padding: 8px; 
     font-family: monospace; font-size: 12px; z-index: 99999;">
  Stage: init
</div>
<script>
  window.updateBootStage = function(stage) {
    var el = document.getElementById('boot-stage');
    if (el) el.textContent = 'Stage: ' + stage + ' @ ' + Date.now();
    console.log('[BOOT-STAGE]', stage, Date.now());
  };
  window.updateBootStage('html-loaded');
</script>
```

Then call `window.updateBootStage?.('preflight')`, `window.updateBootStage?.('imports')`, `window.updateBootStage?.('rendering')` at each stage in `main.tsx`.

### 7. Add Boot Stage Type Declaration (main.tsx)

Add type declaration for the boot stage function:

```typescript
declare global {
  interface Window {
    __bootTimeoutId?: ReturnType<typeof setTimeout>;
    updateBootStage?: (stage: string) => void;
  }
}
```

---

## File Changes Summary

| File | Change |
|------|--------|
| `index.html` | Add boot stage indicator div and script |
| `src/main.tsx` | Add failed boot detection at top, reduce timeout to 4s, add boot stage calls, add type declaration |
| `src/App.tsx` | Comment out migration, add BOOT_STATUS = COMPLETE after splash hides |
| `src/pages/Splash.tsx` | Simplify to non-blocking auth with 3s timeout |

---

## Expected Results

| Problem | Solution |
|---------|----------|
| 40+ bridge calls blocking boot | Migration disabled |
| Corrupted data from previous session | Failed boot detection auto-clears suspect keys |
| Supabase auth hanging forever | 3-second hard timeout, always shows UI |
| No visibility into failures | Boot stage indicator |
| Users stuck too long | Faster 4s timeout + recovery UI |

---

## Testing Plan

After implementing:

1. **Fresh Install Test**: Install app fresh, use it, close completely, reopen → Should work
2. **Failed Boot Recovery Test**: If black screen occurs, boot stage indicator shows where it's stuck
3. **Auth Timeout Test**: Simulate slow/no network → App should still boot and show onboarding
4. **Recovery UI Test**: If boot fails, user sees recovery buttons within 4 seconds

---

## Deployment Steps

1. Implement all changes
2. Build for iOS and Android
3. Test locally with the sequence: install → use → close → reopen
4. Ship to TestFlight and Play Store immediately
5. Monitor for user reports

---

## Phase 2 (After Hotfix Stabilizes)

Once users can boot reliably, we can:
1. Re-enable migration with **lazy loading** (only migrate keys when needed)
2. Add **once-per-install flag** so migration runs once, not every boot
3. **Batch Preferences calls** using `Promise.all` instead of sequential awaits
4. Add **remote boot telemetry** to track boot stages server-side

---

## Technical Details

### Files to Modify

**index.html** - Add boot stage indicator before `<div id="root">`

**src/main.tsx** - Changes at lines 1-22:
- Add failed boot detection before preflight import
- Add window.updateBootStage type declaration
- Change BOOT_TIMEOUT_MS from 6000 to 4000
- Call window.updateBootStage at key points

**src/App.tsx** - Changes at lines 180-183 and 136-148:
- Comment out migration useEffect
- Add REGIMEN_BOOT_STATUS = COMPLETE in splash hide logic

**src/pages/Splash.tsx** - Major refactor:
- Simplify to always render UI first
- Add 3-second hard timeout on auth check
- Remove complex hydrateSessionOrNull logic
- Hide native splash immediately on mount
