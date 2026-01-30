
## What the screenshots tell us (the missing piece)

Your logs show two critical facts:

1) The app is successfully recreating the main auth client sometimes (we do see):
- `[AppStateSync] App became active - recreating Supabase client`
- `[SupabaseClient] Recreating client instance for fresh start`

2) But the timeouts happen *before that recreation happens* (in the same log):
- `[AppStateSync] Running initial cold-start sync`
- then multiple timeouts (`Profile fetch timed out`, `Doses fetch timed out`, TodayScreen timeouts)
- only after all that do we see “App became active … recreating …”

That means we’re sometimes running “boot-critical” network work (TodayScreen + AppStateSync) while the WebView is not yet fully “active/ready” after a notification-open path. iOS notification opens can produce weird ordering where:
- JS runs
- timers fire
- but the app isn’t fully active / network stack isn’t fully resumed yet
So our queries hang until our artificial timeouts fire. Because our current timeout helper does **not abort the underlying fetch**, those hanging requests can linger and poison subsequent attempts.

Separately, we currently never recreate the `dataClient` instance. Even if the auth client is recreated, Today/AppStateSync are using `dataClient` for most reads, and it can be in a bad state too.

So we need a solution that is both:
- **Ordering-safe** (do nothing heavy until we confirm the app is actually active/visible)
- **Network-safe** (timeouts must abort fetch so we don’t accumulate stuck requests)
- **Client-safe** (recreate both clients + abort any inflight work before recreating)

---

## Solution overview (robust, not another “maybe” tweak)

### A) Add a real “app is active” gate, used everywhere
Create a single source of truth for app readiness:
- `CapacitorApp.getState()` at startup (gives initial isActive)
- `appStateChange` listener to update
- additionally check `document.visibilityState === 'visible'`

Then:
- TodayScreen data loads only run when active+visible
- AppStateSync heavy work only runs when active+visible
- Remove/replace “blind 3-second cold-start sync timer” on iOS; instead “run initial sync once we are active”, with a small delay.

This directly targets what your screenshot shows: heavy sync happening before the “became active” event.

### B) Recreate BOTH clients (auth + data) as a single “network recovery” operation
Implement in `src/integrations/supabase/dataClient.ts` the same recreation/proxy pattern as the main client:
- `recreateDataClient()`
- export `dataClient` as a Proxy to the current instance (same approach as auth client)
- ensure `clearDataClientCache()` still works and clears mirror cache, etc.

Then, when we detect “app became active” (and before we run any queries), do:
- `abortAllBackendRequests()` (see section C)
- `recreateSupabaseClient()`
- `recreateDataClient()`

Also do the same at native cold start in `main.tsx` (recreate both, not just auth client), to keep behavior consistent.

### C) Make timeouts actually abort the request (critical)
Right now `withQueryTimeout()` only rejects our promise, but the underlying network request continues.
On iOS, that’s dangerous: you can wind up with multiple stuck requests and a client in a permanently degraded state.

Implement an abortable fetch wrapper (shared utility) using `AbortController`:
- For dataClient: wrap its `global.fetch` so every request gets:
  - an AbortController
  - a timeout that calls `controller.abort()`
  - logging that clearly says “ABORTED request after Xms”
- Keep a registry of controllers (Set/Map) so we can “abort everything” on resume/recovery.

This prevents “hanging fetches” from accumulating and makes client recreation actually effective.

We’ll start by adding abortable fetch to `dataClient` first (since it’s the primary path for data now). If needed, we can extend the same concept to the auth client as well, but we’ll keep scope tight.

### D) Add a single, user-friendly recovery path (so the app never silently stays empty)
When TodayScreen experiences a timeout:
- Attempt one automatic recovery:
  1) abort inflight
  2) recreate both clients
  3) retry the query once
- If the retry also times out:
  - show a “Connection stuck” UI with a prominent “Reload app” button (hard reload)
  - do not show a misleading empty state that looks like the user has no data

This is important because even with fixes, iOS WebKit can still occasionally wedge networking; we need a “get out of jail” UX.

### E) Fix the scheduling of AppStateSync initial sync (remove the current footgun)
In `useAppStateSync.tsx`, change the “initial cold-start sync after 3000ms” behavior:
- On iOS: do not run initial sync on a timer alone.
- Instead:
  - check initial `getState()` + visibility
  - if active+visible → schedule initial sync after RESUME_DELAY_MS
  - if not active → wait for the first `appStateChange(isActive=true)` then schedule

This aligns with what your logs show: the timer can fire too early relative to “active”.

### F) Diagnostics so we stop guessing
Add logs (and bootTracer events) that make ordering unmistakable:
- when we consider the app “active+visible”
- when we start TodayScreen loads
- when we start AppStateSync
- when we recreate auth client
- when we recreate data client
- when we abort inflight requests (count how many)
- when a fetch is aborted (include URL path + timeout label)

This gives us a deterministic answer if anything is still firing out of order.

---

## Concrete file-level plan

### 1) New utility: abortable fetch + controller registry
- Add `src/utils/abortableFetch.ts` (or similar):
  - `createAbortableFetch({ defaultTimeoutMs, tag })`
  - returns `{ fetch, abortAll }`
  - internally tracks controllers in a Set
  - logs when abort happens

### 2) Update `src/integrations/supabase/dataClient.ts`
- Refactor to:
  - `createDataClientInstance()` that uses the abortable fetch wrapper
  - `let dataClientInstance = createDataClientInstance()`
  - `export const recreateDataClient = () => { abortAll(); dataClientInstance = createDataClientInstance(); }`
  - `export const abortDataClientRequests = () => abortAll()`
  - `export const dataClient = new Proxy(...)` (so imports don’t break)
- Keep existing token read logic (localStorage + mirror + cache TTL)

### 3) Update `src/main.tsx`
- On native cold start:
  - `recreateSupabaseClient()`
  - `recreateDataClient()`
- Add trace markers for both.

### 4) Add an “app active/visible” hook (single source of truth)
- Add `src/hooks/useAppActive.ts`:
  - uses `CapacitorApp.getState()`
  - listens to `appStateChange`
  - listens to `visibilitychange`
  - exposes `isAppReadyForNetwork` boolean
This avoids duplicating fragile logic in multiple places.

### 5) Update `src/hooks/useAppStateSync.tsx`
- Gate `syncNotifications()` behind `isAppReadyForNetwork`
- Replace the initial 3s timer with “run once when app becomes ready”
- Before starting sync work:
  - abort inflight
  - recreate both clients
- If a critical query times out:
  - do one “recover + retry” pass (optional but recommended)

### 6) Update `src/components/TodayScreen.tsx`
- Gate `loadDoses/checkCompounds/loadUserName` on `isAppReadyForNetwork`
- On timeout:
  - automatic recover+retry once
  - if still failing, show “Reload app” CTA rather than empty state

Also: fix any remaining uses of `supabase.auth.getUser()` in boot-sensitive paths (I noticed at least one in the “As Needed” insert flow). That isn’t the main cause of this symptom, but it’s still a known deadlock risk.

### 7) Bump build number
- Increment `appBuild` so you can confirm you’re on the right binary.
Given you’re currently at build 24, we’ll bump to **25** for the next test build.

---

## Test protocol (to confirm this is really fixed)

1) Install Build 25
2) Open app normally → confirm Today loads
3) Schedule a local notification 2–3 minutes out
4) Fully background the app (don’t keep it foregrounded)
5) Tap notification
6) In logs, verify ordering:
   - “app ready/active” log appears
   - “recreating BOTH clients” log appears
   - “starting sync / starting Today loads” logs appear only after those
   - no “timed out” warnings
7) Repeat 10 times

If it fails again, the new logs will tell us whether it’s:
- readiness gating still not correct
- fetches are getting stuck even when active
- or something else (e.g., a specific endpoint hanging)

---

## Why I’m confident this is the right path

This plan directly addresses the two things the screenshots prove:
- our work is starting before iOS says the app is active
- our timeouts don’t abort real network work, so iOS can accumulate “stuck” requests

Recreating clients alone can’t fix stuck requests if the underlying fetch never gets cancelled. Adding abort + gating + unified recovery gives us a deterministic, testable system rather than another timing tweak.

If you’d like, I can continue in a new request to implement this Build 25 set of changes.  
