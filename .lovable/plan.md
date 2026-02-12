

## Fix: Password Reset Emails Not Being Sent

### The Problem
The edge function logs show:
```
[PASSWORD-RESET] Generating code for: pyasharel@gmail.com
[PASSWORD-RESET] User not found, returning success silently
```

The function uses `listUsers()` with no pagination, which only returns the first ~50 users. Your account isn't on that page, so it's treated as "not found" and the email is silently skipped.

The same bug exists in `verify-reset-code` — it also uses `listUsers()` to find the user by email.

### The Fix

Both edge functions will replace the broken `listUsers()` scan with the direct `getUserByEmail()` API call.

**File: `supabase/functions/send-password-reset/index.ts`**
- Replace lines 42-45 (the `listUsers` + `some()` scan) with:
  ```typescript
  const { data: userData, error: userError } = 
    await supabaseAdmin.auth.admin.getUserByEmail(normalizedEmail);
  const userExists = !!userData?.user && !userError;
  ```

**File: `supabase/functions/verify-reset-code/index.ts`**
- Replace lines 88-91 (the `listUsers` + `find()` scan) with:
  ```typescript
  const { data: userData, error: userError } = 
    await supabaseAdmin.auth.admin.getUserByEmail(normalizedEmail);
  const user = userData?.user;
  ```

### What This Fixes
- Emails will actually be sent for all users, not just the first ~50
- Password verification will find any user regardless of how many users exist
- No other changes needed -- the rest of the flow (code generation, email template, UI) is already correct

### No Configuration Needed
This is purely a code fix in two edge functions. No new secrets, no database changes, no dashboard config.

