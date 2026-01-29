
# Final Fix: Auth Stability + Auto Notification Prompt + Duplicate Prevention

## Overview
Three issues to fix in one cohesive update:
1. **Auth sign-out bug** - Users getting kicked to sign-in on cold start
2. **Notification prompt** - Should auto-trigger iOS prompt after reinstall, not show a card
3. **Duplicate notifications** - Still seeing 2 notifications when tapping to open app

---

## Part 1: Auto Notification Prompt (The Simple Fix)

### Current (broken) behavior
After reinstall, user has to go to Settings or tap a banner to enable notifications.

### Correct behavior (what you want restored)
After reinstall + sign-in:
- App detects: OS permission = `prompt` + user has active compounds
- App immediately calls `LocalNotifications.requestPermissions()`
- iOS system dialog appears automatically
- No banner, no card, no extra taps

### Changes

**File: `src/hooks/useNotificationPermissionPrompt.ts`**
- Remove `shouldShowPrompt` state entirely
- When conditions are met (OS = prompt, has compounds, throttle OK), immediately call `requestPermissions()` and schedule notifications if granted
- This happens automatically on mount, no user action required

**File: `src/components/TodayScreen.tsx`**
- Remove the `NotificationPromptBanner` component entirely
- Just use the hook for its auto-trigger side effect

**File: `src/components/NotificationPromptBanner.tsx`**
- Delete this file - we don't need the banner at all

---

## Part 2: Auth Stability (Stop Forced Sign-Outs)

### Problem
During cold start or when running Xcode builds, webview localStorage can be unavailable momentarily. The app concludes "no session" and routes to `/auth` even though user was signed in.

### Solution: Token Mirror + Safer Routing

**New file: `src/utils/authTokenMirror.ts`**
- Listens to `supabase.auth.onAuthStateChange`
- On SIGNED_IN/TOKEN_REFRESHED: saves session tokens to Capacitor Preferences (native storage that survives webview issues)
- On SIGNED_OUT: clears the mirror
- Provides `restoreSessionFromMirror()` that attempts `setSession()` using saved tokens

**File: `src/utils/safeAuth.ts`**
- Update `hydrateSessionOrNull()` to try mirror restoration if localStorage tokens missing

**File: `src/components/ProtectedRoute.tsx`**
- If tokens exist (localStorage OR mirror) but hydration failed/timed out: show "Connection issue" retry UI
- Only redirect to `/auth` when we're confident there are truly no tokens anywhere

**File: `src/pages/Splash.tsx`**
- Use the same safe hydration logic instead of raw `getSession()`

**File: `src/App.tsx`**
- Initialize the auth token mirror listener on mount

---

## Part 3: Eliminate Duplicate Notifications

### Problem
You see 2 notifications: one fires, you tap it, immediately get another one.

### Root causes
1. Legacy notifications (from older versions) still pending with different IDs
2. Resume/open can trigger reschedule that fires immediately if time is "now"

### Solution

**File: `src/utils/notificationScheduler.ts`**

1. **Legacy notification detection + cleanup**
   - Identify legacy dose notifications by signature: title = "Regimen", body starts with "Time for"
   - Cancel them during reconciliation (with near-fire guard)

2. **Strict future-only scheduling**
   - Change: only schedule if `notificationDate > Date.now() + 5000` (5 seconds in future)
   - Prevents "immediate fire" if anything tries to schedule at current/past time

3. **Keep existing safeguards**
   - 5-second debounce between full reschedules
   - 90-second near-fire guard (don't touch notifications about to fire)

---

## Technical Implementation Details

### Auth Token Mirror Structure
```text
Key: 'authTokenMirror'
Value: JSON {
  access_token: string,
  refresh_token: string,
  expires_at: number,
  user_id: string,
  saved_at: number
}
```

### Auto-Prompt Logic (simplified)
```text
On TodayScreen mount:
  1. Check OS permission via checkPermissions()
  2. If permission !== 'prompt' → done (already granted or denied)
  3. Check if user has active compounds
  4. Check throttle (don't prompt if asked in last 24h)
  5. If all conditions met → requestPermissions() immediately
  6. If granted → schedule notifications
  7. Record that we prompted (for throttle)
```

### Legacy Notification Signature Matching
```text
A notification is "legacy dose" if:
  - title === 'Regimen' (or starts with it)
  - body matches /^Time for .+/
  - extra.type !== 'dose' (not already tagged by new system)
```

---

## Files to Modify

**Auth stability:**
- Create `src/utils/authTokenMirror.ts`
- Update `src/utils/safeAuth.ts`
- Update `src/components/ProtectedRoute.tsx`
- Update `src/pages/Splash.tsx`
- Update `src/App.tsx`

**Notification prompt:**
- Rewrite `src/hooks/useNotificationPermissionPrompt.ts` (auto-trigger, no banner state)
- Update `src/components/TodayScreen.tsx` (remove banner, just use hook)
- Delete `src/components/NotificationPromptBanner.tsx`

**Duplicate prevention:**
- Update `src/utils/notificationScheduler.ts`

---

## Testing Checklist

1. **Auth stability**
   - Open app after 30+ minutes background → should NOT go to sign-in
   - Run `npx cap run ios` while app open → should NOT sign out

2. **Auto notification prompt**
   - Delete app → reinstall → sign in
   - iOS notification permission dialog should appear automatically (no banner, no tap required)
   - Grant permission → notifications should schedule immediately

3. **No duplicate notifications**
   - Set dose 2 minutes ahead
   - Let it fire, tap notification to open app
   - Should NOT get a second notification immediately

4. **Throttle works**
   - After dismissing iOS prompt, should not prompt again for 24 hours

