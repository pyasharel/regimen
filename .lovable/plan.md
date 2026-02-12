

## In-App Password Reset with Email Code (No Redirects)

### Why the current flow breaks
The recovery link goes through the backend's `/auth/v1/verify` endpoint, which consumes the one-time token and redirects. That redirect resolves to `regimen.lovable.app` (the Lovable preview domain) instead of `getregimen.app`, losing the auth context and dumping the user into `/onboarding`.

### New approach: 6-digit code entered in-app
Instead of a clickable link that opens a browser, the user receives a 6-digit code via email, enters it in the app, and sets their new password -- all without leaving the app.

```text
User taps "Forgot Password"
        |
        v
Enters email --> Edge function generates 6-digit code
        |          + stores it in a new table with expiry
        v
Email arrives with the code (no link to click)
        |
        v
User enters code in-app --> Edge function verifies code
        |                     + resets password via admin API
        v
"Password updated!" --> Back to sign-in
```

### Changes

**1. Database: New `password_reset_codes` table**

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Default gen_random_uuid() |
| email | text | Lowercase, indexed |
| code | text | 6-digit numeric string |
| expires_at | timestamptz | created_at + 15 minutes |
| used | boolean | Default false |
| created_at | timestamptz | Default now() |

- RLS: No public access (only edge functions use service role key)
- A cleanup function or expiry check prevents stale codes from accumulating

**2. Edge function: `send-password-reset/index.ts` (rewrite)**

Current behavior: generates a recovery link and emails it as a clickable button.

New behavior:
- Generate a random 6-digit code
- Store it in `password_reset_codes` with 15-minute expiry
- Invalidate any previous unused codes for the same email
- Email the code (not a link) using the same branded Resend template
- Email says: "Your password reset code is: 482917. Enter this code in the Regimen app."

**3. New edge function: `verify-reset-code/index.ts`**

- Accepts `{ email, code, new_password }`
- Looks up the code in `password_reset_codes` where `used = false` and `expires_at > now()`
- If valid: uses `auth.admin.updateUserById()` to set the new password, marks code as used
- If invalid/expired: returns error
- Rate-limited: max 5 attempts per email per hour (checked via count of recent rows)
- `verify_jwt = false` in config.toml (unauthenticated endpoint)

**4. `src/pages/Auth.tsx` -- Update forgot password UI**

Replace the current single-step "enter email, we'll send a link" flow with a 3-step flow:

- **Step 1 (Enter Email)**: User types email, taps "Send Code"
- **Step 2 (Enter Code)**: 6-digit input field appears, user enters code from email, taps "Verify"
- **Step 3 (New Password)**: Password + confirm password fields, taps "Update Password"

All three steps happen on the same screen with no navigation away from the app. A "Resend Code" button with a 60-second cooldown is available on Step 2.

**5. Email template update (inside edge function)**

Replace the "Reset Password" button with a large, styled code display:

```text
Your password reset code is:

  4 8 2 9 1 7

Enter this code in the Regimen app to set a new password.
This code expires in 15 minutes.
```

### Android notification-tap sign-out fix (included)

**6. `src/hooks/useAppStateSync.tsx`**

In `handleAppBecameActive`: when the resume source is `notification_action`, skip the cold-start client recreation even if the elapsed time exceeds 30 seconds. The notification tap means the app was alive and the session is valid -- recreating clients is what causes the sign-out.

**7. `src/main.tsx`**

Add notification-related localStorage keys to the "never delete" list during failed boot recovery, so users don't have to re-enable notifications after a recovery:
- `notificationPermissionPromptLastShownAt`
- `doseReminders`
- `cycleReminders`

### What stays the same
- The native `regimen://` deep link handling remains for other flows (e.g., universal links)
- The `PASSWORD_RECOVERY` event handler in Auth.tsx stays as a fallback but won't be the primary path
- Rating prompt flow is untouched

### Technical notes
- The `password_reset_codes` table uses RLS with no public policies -- only the edge functions access it via service role
- Code generation uses `crypto.getRandomValues()` for secure randomness
- Codes are single-use and expire after 15 minutes
- Previous unused codes for the same email are invalidated when a new one is requested

