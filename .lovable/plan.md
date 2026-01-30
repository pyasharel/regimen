
# Auth-Lock Fix Implemented (Build 21)

## Problem Solved
After 1-3 hard closes, the app showed "structure but no data" - empty cards that rendered but never populated. This was caused by Supabase's global auth lock getting wedged when `supabase.auth.getUser()` was called during:
- iOS permission dialogs
- App resume
- TodayScreen mount

When the auth lock hangs, `auth.getSession()` (called internally on every database request) also hangs, causing queries to either stall or run "anonymous" and return empty arrays due to RLS.

## What We Fixed

### A) Hardened Auth Calls in Boot-Critical Paths
Replaced all `supabase.auth.getUser()` calls with `getUserIdWithFallback(3000)`:

1. **`src/hooks/useStreaks.tsx`**
   - Now uses `getUserIdWithFallback()` instead of `getUser()`
   - Returns default stats if no userId (instead of throwing)
   - Uses `dataClient` for the query (bypasses `getSession()`)

2. **`src/hooks/useNotificationPermissionPrompt.ts`**
   - Uses `getUserIdWithFallback()` after permission dialog
   - Uses `dataClient` with timeout for doses fetch
   - Gracefully skips scheduling if userId unavailable

3. **`src/components/TodayScreen.tsx`**
   - `checkPreviewMode` now uses `getUserIdWithFallback()` instead of `getUser()`

### B) Created Auth-Lock-Resistant Data Client
New file: **`src/integrations/supabase/dataClient.ts`**

This client:
- Uses the `accessToken` callback to read tokens directly from localStorage
- Falls back to native token mirror on Capacitor platforms
- Does NOT call `auth.getSession()` internally
- Makes database queries independent of the auth lock state

Usage:
```typescript
import { dataClient } from '@/integrations/supabase/dataClient';

// Use dataClient for data queries in boot-critical paths
const { data } = await dataClient.from('doses').select('*').eq('user_id', userId);
```

## Version
- **Build 21** (v1.0.3)

## Test Plan
1. Fresh install (or delete/reinstall) on iPhone
2. Sign in, use the app normally
3. Hard close + reopen **10 times**
4. Confirm: Today loads doses, My Stack loads compounds every time
5. Trigger notification permission prompt:
   - Reset notifications in Settings → Regimen → Notifications
   - Open app, allow notifications
   - Hard close + reopen **10 times again**

## Build Command
```bash
git pull && npm run build && npx cap sync && npx cap run ios
```

## Success Criteria
- No "empty structure" state after hard closes
- Data appears on first paint
- Permission prompt does not destabilize subsequent sessions
