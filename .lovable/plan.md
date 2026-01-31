

# Fix Plan: Android Sign-Out Issue (Failed Boot Detection)

## Problem Summary

The app's "failed boot detection" logic in `main.tsx` is too aggressive. When it detects an incomplete boot (which can happen normally after app updates or hard closes), it wipes all Supabase auth keys from localStorage, signing the user out.

**Result:** Users get logged out unexpectedly, shown "Restoring your session..." loading screen, and miss their notifications.

---

## Solution: Preserve Auth Tokens During Failed Boot Recovery

Instead of wiping all `sb-` and `supabase` keys, we will **preserve the auth token key** while still clearing other potentially corrupted data.

---

## Implementation Steps

### Step 1: Modify Failed Boot Detection in `main.tsx`

**Current problematic code (lines 47-53):**
```typescript
const keysToCheck = Object.keys(localStorage);
keysToCheck.forEach(key => {
  if (key.includes('sb-') || key.includes('supabase')) {
    try { localStorage.removeItem(key); } catch {}
  }
});
```

**New safe code:**
```typescript
// Define the specific auth token key we must NEVER delete
const AUTH_TOKEN_KEY = 'sb-ywxhjnwaogsxtjwulyci-auth-token';

const keysToCheck = Object.keys(localStorage);
keysToCheck.forEach(key => {
  // Skip the main auth token - this is the user's session
  if (key === AUTH_TOKEN_KEY) {
    console.log('[BOOT] Preserving auth token during recovery');
    return;
  }
  
  // Only clear other Supabase keys (code verifier, provider token, etc.)
  if (key.includes('sb-') || key.includes('supabase')) {
    try { localStorage.removeItem(key); } catch {}
  }
});
```

This preserves the user's login session while still clearing other potentially problematic Supabase state.

---

### Step 2: Add Better Boot Status Tracking

The current logic treats `STARTING` status as "previous boot failed." But this status can persist across normal app updates. We should add a timestamp check:

**Enhancement:** Only consider it a "failed boot" if:
1. Status is `STARTING`, AND
2. The status was set more than 30 seconds ago

```typescript
const lastBootStatus = localStorage.getItem('REGIMEN_BOOT_STATUS');
const lastBootTime = localStorage.getItem('REGIMEN_BOOT_TIME');
const bootAge = lastBootTime ? Date.now() - parseInt(lastBootTime, 10) : 0;

// Only treat as failed if status is STARTING and it's been stuck for >30 seconds
// This prevents false positives from app updates or quick restarts
const isReallyFailed = lastBootStatus === 'STARTING' && bootAge > 30000;

if (isReallyFailed) {
  // ... clear suspect keys (but preserve auth token)
}
```

Also add timestamp tracking when setting boot status:
```typescript
localStorage.setItem('REGIMEN_BOOT_STATUS', 'STARTING');
localStorage.setItem('REGIMEN_BOOT_TIME', Date.now().toString());
```

---

### Step 3: Clear Boot Status on Successful Load

Ensure `REGIMEN_BOOT_STATUS` is set to `COMPLETE` when the app successfully loads. This is already happening in `ProtectedRoute.tsx`:

```typescript
localStorage.setItem('REGIMEN_BOOT_STATUS', 'COMPLETE');
```

---

## Technical Details

### Files to Modify

| File | Changes |
|------|---------|
| `src/main.tsx` | Update failed boot detection to preserve auth token key and add timestamp check |

### What Gets Preserved vs Cleared

| Key | Action | Reason |
|-----|--------|--------|
| `sb-{projectId}-auth-token` | **PRESERVE** | User's login session |
| `sb-{projectId}-auth-token-code-verifier` | Clear | OAuth temporary state |
| `sb-{projectId}-provider-token` | Clear | Third-party tokens |
| Other `supabase` keys | Clear | Various temp state |

---

## Testing Plan

After implementing the fix:

1. **Fresh install test**: Install app, sign in, force close, reopen → should stay logged in
2. **Update simulation test**: Install old build, sign in, install new build → should stay logged in
3. **Hard close test**: Use app, swipe away from recent apps, reopen 10+ times → should never log out
4. **Notification test**: Set reminder, close app, wait for notification → should fire correctly

---

## User Communication

Once this fix is deployed (v1.0.5 or next build), you can tell Jam and Kinsuu:

> "We found and fixed the sign-out bug. The app was being too aggressive in clearing data after updates. The new version should keep you logged in. If you get signed out one more time after updating, that's expected - but after that, it won't happen again."

---

## Why This Fix Is Safe

1. **Preserves the exact key** that contains user auth tokens
2. **Still clears** OAuth code verifiers and other temporary Supabase state that could cause issues
3. **Adds time-based check** to avoid false positives from quick app restarts
4. **No risk of data corruption** - auth tokens are read-only and managed by Supabase SDK

