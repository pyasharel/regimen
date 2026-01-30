# Memory: architecture/boot-stability-architecture-v3
Updated: now

## Build 25: App Active Gating + Abortable Fetch

App boot and resume stability is maintained through a multi-layered defense:

### 1. App Active Gating (NEW)
- `useAppActive` hook provides single source of truth for app readiness
- Combines `CapacitorApp.getState()` + `document.visibilityState`
- TodayScreen and AppStateSync gate all network work on `isAppReadyForNetwork`
- Prevents race condition where JS timers fire before iOS networking is ready

### 2. Abortable Fetch (NEW)
- All `dataClient` requests use `AbortController`
- Requests auto-abort after 8 seconds (no stuck requests)
- `abortDataClientRequests()` cancels all inflight on resume
- `recreateDataClient()` aborts + creates fresh instance

### 3. Dual Client Recreation
- Both `recreateSupabaseClient()` AND `recreateDataClient()` called:
  - On native cold start (main.tsx)
  - On every app resume (useAppStateSync)
- Clears corrupted internal state from iOS suspension

### 4. Boot Timeout Fallback
- 4-second global boot timeout with recovery UI
- Synchronous React mounting (no blocking on native bridge)

### 5. Connection Stuck Recovery UI
- If retries still timeout, shows "Connection Stuck" UI
- Prominent "Reload App" button for hard refresh
- Never leaves user staring at empty skeleton

### Removed Footguns
- No more blind 3-second initial sync timer
- AppStateSync waits for `waitForAppReady()` before syncing

### Key Files
- `src/hooks/useAppActive.ts` - App readiness hook
- `src/utils/abortableFetch.ts` - AbortController wrapper
- `src/integrations/supabase/dataClient.ts` - Proxy + abort support
- `src/hooks/useAppStateSync.tsx` - Gated sync logic
- `src/components/TodayScreen.tsx` - Gated data loading + recovery UI
