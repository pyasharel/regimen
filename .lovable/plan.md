
# Fix: Loading State Stuck After Auth Hydration Fails

## Root Cause Identified

The "empty cards stuck on loading screen" issue is **not caused by the Medication Levels feature**. The actual bug is in `loadDoses()` function in TodayScreen.tsx:

```text
Problem Flow:
1. User does hard close + reopen
2. ProtectedRoute uses fast-path cache → shows TodayScreen
3. TodayScreen calls loadDoses()
4. ensureAuthReady() takes time or fails (session not fully hydrated yet)
5. loadDoses() returns early without calling setLoading(false)
6. UI stuck showing skeleton cards forever
```

The early returns at lines 427-433 exit before the `try` block, so the `finally { setLoading(false) }` never executes.

## The Fix

Move `setLoading(false)` to also trigger on early returns, or restructure the function so early returns are inside the try block.

---

## Changes

### File: src/components/TodayScreen.tsx

**Current code (lines 415-434):**
```typescript
const loadDoses = async () => {
  const startTime = Date.now();
  console.log('[TodayScreen] Starting loadDoses...');
  
  const userId = await ensureAuthReady();
  if (!userId) {
    const cachedUserId = await getUserIdWithFallback(3000);
    if (!cachedUserId) {
      console.log('[TodayScreen] loadDoses: No userId available, keeping loading state');
      return;  // BUG: Never calls setLoading(false)!
    }
    return;  // BUG: Never calls setLoading(false)!
  }
  
  try {
    // ... queries ...
  } finally {
    setLoading(false);
  }
};
```

**Fixed code:**
```typescript
const loadDoses = async () => {
  const startTime = Date.now();
  console.log('[TodayScreen] Starting loadDoses...');
  
  try {
    const userId = await ensureAuthReady();
    if (!userId) {
      const cachedUserId = await getUserIdWithFallback(3000);
      if (!cachedUserId) {
        console.log('[TodayScreen] loadDoses: No userId available');
        return; // Now inside try, so finally runs
      }
      console.log('[TodayScreen] loadDoses: Have cached userId but auth not ready, will retry on next render');
      return; // Now inside try, so finally runs
    }
    
    // ... rest of queries ...
  } catch (error) {
    // ... error handling ...
  } finally {
    setLoading(false); // Always runs now
  }
};
```

---

## Why This Explains Everything

| Symptom | How This Bug Causes It |
|---------|------------------------|
| Empty cards after hard close | `ensureAuthReady()` times out on cold start, early return skips `setLoading(false)` |
| Works on first sign-in | Fresh sign-in has valid session, no early return |
| Fixed after waiting/retrying | Eventually auth hydrates, useEffect re-runs, queries succeed |
| Not related to Medication Levels | That feature was disabled but bug persisted |

---

## Additional Safety: Re-enable Medication Levels

Since the Medication Levels feature is not the cause, we should also:
1. Keep it disabled for this diagnostic build
2. Re-enable it in a follow-up once we confirm this fix works

---

## Testing Protocol

After this fix:
1. Build and run: `git pull && npm run build && npx cap sync && npx cap run ios`
2. Sign in, use the app normally
3. Hard close and reopen (5x)
4. Verify cards load immediately, no stuck skeleton state

---

## Version

Keep at v1.0.3 Build 20 since we haven't released the previous build yet.
