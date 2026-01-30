

# Post-Mortem Documentation: iOS/Android Supabase Deadlock Crisis

## Summary

Create a comprehensive post-mortem document that captures the full incident timeline, root cause analysis, and resolution for the app-hanging issue that affected v1.0.3 users. This will serve as both a troubleshooting reference and architectural guidance.

## Document Location

**New file:** `.storage/memory/postmortems/v103-supabase-deadlock-incident.md`

This creates a new `postmortems/` directory for future incident documentation.

## Document Structure

### 1. Incident Summary
- **Affected versions:** v1.0.3 (Build 27 and earlier)
- **Platforms:** iOS and Android (Capacitor WebView)
- **Symptoms:** Black screen, empty data, "Slow connection" toasts, app hangs on resume
- **Resolution:** v1.0.4 (Build 28) with `noOpLock` fix

### 2. Timeline of Events
- Initial user reports of app hanging after closing/reopening
- Diagnostic investigation phases
- Root cause identification
- Fix implementation and deployment

### 3. Root Cause Analysis
- **Primary cause:** `navigator.locks` API deadlock in `@supabase/auth-js`
- **Why it happened:** iOS WebViews fail to release locks when app is suspended mid-operation
- **Why Android was also affected:** Same WebView behavior on Android Capacitor
- **Reference:** GitHub issue supabase/auth-js#866

### 4. The Fix: noOpLock
- Explanation of why mobile apps don't need cross-tab locking
- Code implementation in both `client.ts` and `dataClient.ts`
- Why this is safe and won't cause race conditions

### 5. Supporting Fixes
- Dual client recreation on resume
- AbortController for stuck requests
- Failed boot detection and recovery
- Boot tracer diagnostics

### 6. Prevention Checklist
- Patterns to avoid in future development
- Testing scenarios to verify (hard close, notification tap, background resume)
- Warning signs to watch for

### 7. Deployment Lessons
- App Store versioning constraints (can't add builds to closed versions)
- Google Play `versionCode` requirements across tracks
- CDN propagation delays for beta testing

---

## Also Update

### TROUBLESHOOTING_IOS.md
Add a new section for "App Hangs on Resume / Black Screen" that references the post-mortem and provides quick resolution steps.

---

## Technical Details

The post-mortem will include:

```text
Root Cause Chain:
1. User opens app → Supabase auth acquires navigator.lock
2. iOS suspends app (home button, notification, etc.)
3. Lock is never released (iOS WebView bug)
4. User reopens app → all auth.getSession() calls wait forever
5. dataClient tries to get token → also blocked
6. All network requests hang → empty UI
```

The fix bypasses this entirely:

```typescript
const noOpLock = async <T>(
  name: string,
  acquireTimeout: number,
  fn: () => Promise<T>
): Promise<T> => {
  return await fn(); // Execute immediately, no locking
};
```

This is safe because mobile apps are single-instance (no tabs competing for session state).

