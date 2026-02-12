

## Fix: Android Sign-Out on Phone Unlock and Notification Re-Prompting

### Problem 1: Signed out when unlocking phone
When the user unlocks their Android phone (without tapping a notification), the `visibilitychange` event fires and triggers `handleAppBecameActive()` which calls `recreateSupabaseClient()`. This destroys the authenticated session. On Android, the subsequent session hydration from localStorage can fail due to timing, causing the app to redirect to the sign-in screen.

### Problem 2: Notification permission asked again after re-login
After being forced to sign back in, the notification permission auto-prompt triggers again because either the throttle timestamp was lost or the OS reports permission as `prompt` again.

---

### Fix 1: Only recreate clients on genuine cold starts, not resume

**File: `src/hooks/useAppStateSync.tsx`**

The `handleAppBecameActive` function currently recreates both Supabase clients on every single resume (including simple screen unlock). This is overkill for Android — the client recreation was designed for iOS hard-close corruption, not normal backgrounding.

Changes:
- Add a flag to track whether this is a cold start vs. a normal resume
- On normal resume: skip client recreation, just run the sync
- On cold start: keep the existing recreation logic
- Use a "last active timestamp" to distinguish cold start (backgrounded for more than 30 seconds) from quick screen unlock

### Fix 2: Guard notification permission prompt with throttle check

**File: `src/hooks/useNotificationPermissionPrompt.ts`**

The throttle key is stored in Capacitor `persistentStorage` which should survive, but we should also check localStorage as a fast fallback and ensure the 24-hour throttle is respected even after a forced re-login.

Changes:
- Add a localStorage mirror of the throttle timestamp for faster/more reliable checks
- Skip the prompt entirely if permission is already `granted` (this check exists but may be racing)

### Fix 3: Preserve session across simple resume in ProtectedRoute

**File: `src/components/ProtectedRoute.tsx`**

Currently, `ProtectedRoute` only runs hydration on mount. But if the Supabase client is recreated during resume, the cached session in localStorage is still valid — the fast-path should still work. The issue is that `recreateSupabaseClient()` creates a client that hasn't loaded the localStorage session yet, and if any code checks auth state before the client auto-hydrates, it sees "no session."

Changes:
- After client recreation in `handleAppBecameActive`, call `supabase.auth.getSession()` to force the new client to load the localStorage session before any other code runs
- This ensures the recreated client is immediately hydrated

---

### Technical Details

**useAppStateSync.tsx changes:**
```text
handleAppBecameActive() will be updated to:
1. Track lastActiveTimestamp in a ref
2. On resume, check if backgrounded > 30 seconds
3. If quick resume (< 30s): skip client recreation, just run sync
4. If long background (> 30s): recreate clients + force session hydration via getSession()
5. After recreation, await supabase.auth.getSession() to ensure the new client picks up localStorage tokens
```

**useNotificationPermissionPrompt.ts changes:**
```text
1. Mirror throttle timestamp to localStorage for fast synchronous check
2. Add early-exit if localStorage shows prompt was shown recently
3. Ensures throttle survives even if Capacitor Preferences is slow
```

### Expected Outcome
- Unlocking the phone for a quick check will no longer sign the user out
- Extended backgrounding (> 30s) still gets the safety net of client recreation
- Notification permission is never re-prompted within 24 hours of the last prompt
- Beta testers will no longer report being signed out after brief phone locks

