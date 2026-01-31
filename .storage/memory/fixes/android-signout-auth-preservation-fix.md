# Memory: fixes/android-signout-auth-preservation-fix
Updated: now

## Issue
Android beta testers (Jam, Kinsuu) reported being signed out after app updates. The app would show "Restoring your session..." then redirect to sign-in. This also caused notifications to fail since the user was unexpectedly logged out.

## Root Cause
The "failed boot detection" logic in `main.tsx` was too aggressive. When `REGIMEN_BOOT_STATUS` was stuck at `STARTING` (common after app updates or force-closes), the code wiped ALL localStorage keys containing `sb-` or `supabase` - including the user's valid auth token.

## Fix Applied (Build 29+)
1. **Preserve auth token**: Added explicit check to never delete `sb-ywxhjnwaogsxtjwulyci-auth-token`
2. **Timestamp-based validation**: Added `REGIMEN_BOOT_TIME` to track when boot started. Failed boot recovery only triggers if status has been `STARTING` for >30 seconds
3. **Recent boot skip**: If boot status is `STARTING` but less than 30 seconds old, skip cleanup entirely (likely quick restart or update)

## Code Pattern
```typescript
const AUTH_TOKEN_KEY = 'sb-ywxhjnwaogsxtjwulyci-auth-token';
const bootAge = lastBootTime ? Date.now() - parseInt(lastBootTime, 10) : Infinity;
const isReallyFailed = lastBootStatus === 'STARTING' && bootAge > 30000;

// Only clear if truly stuck, and always preserve auth token
if (isReallyFailed) {
  keysToCheck.forEach(key => {
    if (key === AUTH_TOKEN_KEY) return; // NEVER delete
    if (key.includes('sb-') || key.includes('supabase')) {
      localStorage.removeItem(key);
    }
  });
}
```

## Testing
After updating, users may need to sign in once (if their token was already cleared by old code), but subsequent app updates/restarts should preserve their session.
