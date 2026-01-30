# Memory: debugging/boot-trace-diagnostics
Updated: now

## Boot Tracer System (Build 22+)

To diagnose the persistent "empty data" bug on iOS, a comprehensive boot tracing system was added.

### How It Works
1. `src/utils/bootTracer.ts` provides `trace(label, details?)` to log timestamped events
2. Events are persisted to localStorage after each call (survives crashes)
3. Previous boot trace is preserved for comparison

### Key Trace Points
| Label | Location | Meaning |
|-------|----------|---------|
| BOOT_START | main.tsx | Very first line of app |
| PREFLIGHT_START/DONE | main.tsx | localStorage validation |
| THEME_BOOTSTRAP_START/DONE | main.tsx | Native theme sync |
| REACT_RENDER_QUEUED | main.tsx | React root created |
| PROTECTED_ROUTE_FAST_PATH_* | ProtectedRoute | Cache-based session check |
| HYDRATION_* | ProtectedRoute | Supabase auth hydration |
| TODAY_LOAD_DOSES_START | TodayScreen | Data load begins |
| TODAY_ENSURE_AUTH_* | TodayScreen | Auth check before queries |
| TODAY_DOSES_LOADED | TodayScreen | Successful data fetch |
| TODAY_SET_LOADING_FALSE | TodayScreen | Loading state ends |
| BOOT_END | ProtectedRoute | Boot complete |

### Viewing Traces
1. Go to Settings → Help & Support
2. "Boot Diagnostics" section shows last boot summary
3. Tap "View Boot Trace" for full log
4. Use "Copy" button to share via email/chat

### Interpreting Results
- If trace stops at `TODAY_ENSURE_AUTH_START` → auth deadlock
- If trace stops at `HYDRATION_SLOW_PATH_START` → Supabase getSession hanging
- If `TODAY_DOSES_LOADED` shows 0 doses but user has data → RLS issue
- If `BOOT_END: FAILED` → check previous entries for root cause

### Remote Debugging (Parallel)
For live console access:
1. iPhone: Settings → Safari → Advanced → Web Inspector ON
2. Connect iPhone to Mac via USB
3. Safari → Develop → [iPhone] → [App]
4. Reproduce bug while watching console
