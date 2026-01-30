# Memory: architecture/dataclient-bypass-auth-deadlock
Updated: now

## Problem Solved

When iOS suspends the app and the user taps a notification to resume:
1. The JS context stays alive (not a fresh cold start)
2. The Supabase client's internal auth state machine is corrupted
3. All `supabase.auth.getSession()` and `supabase.auth.setSession()` calls timeout
4. The `appStateChange` event doesn't fire on notification tap resume
5. Even `recreateSupabaseClient()` doesn't help because the auth deadlock is in the SDK's internals

## Solution: dataClient for All Data Queries

The `dataClient` (src/integrations/supabase/dataClient.ts) bypasses the auth system entirely:
- Reads the access token directly from localStorage (`sb-{projectId}-auth-token`)
- Falls back to the native token mirror (Capacitor Preferences)
- Injects the token via custom fetch handler, never calling `auth.getSession()`

### Key Changes (Build 24)

**TodayScreen.tsx:**
- Replaced `supabase` with `dataClient` for all queries: doses, compounds, profiles
- Replaced `ensureAuthReady()` with `hasDataClientToken()` check
- Uses `getUserIdWithFallback()` for userId (reads from localStorage cache)

**useAppStateSync.tsx:**
- Added `dataClient` import
- Replaced `supabase` with `dataClient` for: profile fetch, doses fetch, engagement metrics

### When to Use Which Client

| Use Case | Client |
|----------|--------|
| Database reads (SELECT) | `dataClient` |
| Database writes (INSERT, UPDATE, DELETE) | `dataClient` |
| Auth operations (signIn, signOut) | `supabase` |
| Edge functions with auth | `supabase` |
| onAuthStateChange listeners | `supabase` |

### Why This Works

The dataClient doesn't depend on the Supabase auth state machine at all. As long as:
1. There's a valid token in localStorage (written by the last successful auth)
2. The token hasn't expired

...the dataClient can make authenticated requests. The corrupted auth lock in the regular client is irrelevant.
