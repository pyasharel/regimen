

## Complete Password Reset Fix (3 Issues)

### Issue 1: Edge functions crash -- `getUserByEmail` doesn't exist

The logs show:
```
getUserByEmail is not a function
```

The supabase-js version imported in the edge functions (`@2.57.2`) does not have `auth.admin.getUserByEmail()`. The error is swallowed by the catch block which returns `{ success: true }`, so the app shows "Code sent!" but nothing actually happens.

**Fix:** Replace `getUserByEmail()` with a direct REST API call to the GoTrue admin endpoint, which works regardless of library version:

```typescript
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const res = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
  headers: {
    Authorization: `Bearer ${serviceRoleKey}`,
    apikey: serviceRoleKey,
  },
});
const { users } = await res.json();
const user = users?.find((u: any) => u.email?.toLowerCase() === normalizedEmail);
```

Wait -- this still has the pagination problem. Instead, the proper approach is to use the GoTrue admin user-by-id lookup after first finding the user. But we don't have the ID.

The correct fix: use the **Supabase REST API filter** which supports email filtering server-side:

```typescript
const res = await fetch(
  `${supabaseUrl}/auth/v1/admin/users?page=1&per_page=1&filter=${encodeURIComponent(normalizedEmail)}`,
  { headers: { Authorization: `Bearer ${serviceRoleKey}`, apikey: serviceRoleKey } }
);
const { users } = await res.json();
```

This filters on the server so pagination doesn't matter. Applied to both `send-password-reset` and `verify-reset-code`.

### Issue 2: Dead code in Auth.tsx

There's an old `handleForgotPassword` function (lines 389-421) that uses the old link-based `supabase.auth.resetPasswordForEmail()` flow. It's no longer called from the UI (the new flow uses `handleSendResetCode`), but it should be removed to avoid confusion.

### Issue 3: Account Settings still uses the old link-based reset

In `AccountSettings.tsx`, the "Change Password" button (line 133-161) calls `supabase.auth.resetPasswordForEmail()` which sends the user a link -- the same broken flow. This needs to be updated to use the same OTP code flow, or a simpler inline approach since the user is already authenticated.

**For authenticated users (Account Settings):** Since the user is already logged in, we can use `supabase.auth.updateUser({ password })` directly. This is simpler and more secure -- the user enters their new password right in the settings screen without needing an email code at all.

The updated Account Settings password section will show:
- A "New Password" input field
- A "Confirm Password" input field  
- An "Update Password" button
- Uses `supabase.auth.updateUser({ password })` which works because the user has an active session

### Summary of changes

| File | Change |
|------|--------|
| `supabase/functions/send-password-reset/index.ts` | Replace `getUserByEmail()` with REST API call using server-side email filter |
| `supabase/functions/verify-reset-code/index.ts` | Same REST API fix for user lookup |
| `src/pages/Auth.tsx` | Remove dead `handleForgotPassword` function (lines 389-421) |
| `src/components/settings/AccountSettings.tsx` | Replace link-based reset with inline password change using `supabase.auth.updateUser()` |

### What you asked about: Do you need a "change password" in settings?

Yes, and it's actually simpler than the forgot-password flow. Since the user is already signed in, they can change their password directly without any email verification. This is standard practice (Apple, Google, etc. all do this). The implementation uses `supabase.auth.updateUser({ password })` which is a single API call.
