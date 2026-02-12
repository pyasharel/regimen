

## Fix: PreviewModeBanner, Password Reset Flow, and Email Formatting

Three distinct areas to fix across 4 files.

---

### 1. PreviewModeBanner Redesign

**Problems:** Text truncates on mobile, rotation is too fast and distracting, Subscribe is buried at the end.

**Solution:** Revert to a simpler, static approach. No rotation at all.

**File: `src/components/PreviewModeBanner.tsx`**

- Remove the rotation timer and `BENEFIT_MESSAGES` array entirely
- Make the subtitle a single static line for both segments:
  - Segment A (1 compound): **"Subscribe** to unlock all features"
  - Segment B (2+ compounds): **"Subscribe** for reminders on all {count} compounds"
- "Subscribe" is a tappable link at the START of the message, always visible, never truncated
- Remove the `useState` for `benefitIndex` and the `useEffect` timer — simplifies the component significantly

---

### 2. Password Reset Email: Lowercase "Regimen" Sender Name

**Root Cause:** The password reset email the user receives is NOT from the custom `send-password-reset` edge function. It's sent by **Supabase Auth's built-in `resetPasswordForEmail()`** API, which uses Supabase's own SMTP templates. The sender name is configured in Supabase Auth settings, not in edge function code.

**The custom edge function** (`send-password-reset`) exists but is never called during the reset flow. The actual flow calls `supabase.auth.resetPasswordForEmail()` directly.

**Fix options:**
- The Supabase Auth email template sender name is configured in the auth settings (SMTP section). This needs to be set to "Regimen" with capital R via the Lovable Cloud settings.
- Alternatively, switch to using the custom edge function for sending password reset emails, giving full control over formatting and sender. However, this requires generating the reset token manually with the service role, which adds complexity.

**Recommended:** Configure the Supabase Auth SMTP settings to use Resend as a custom SMTP provider with the correct "Regimen" sender name. This fixes both the sender name AND gives full control over the email template (fixing the hidden button on mobile).

---

### 3. Password Reset Redirect Goes to Wrong Domain

**Problem:** Clicking the reset link takes users to `regimen.lovable.app/onboarding` instead of `getregimen.app/auth?mode=reset`.

**Root Cause:** Even though the code sets `redirectTo: 'https://getregimen.app/auth?mode=reset'`, Supabase Auth validates redirect URLs against its configured "Redirect URLs" allowlist. If `getregimen.app` isn't in that list, Supabase falls back to the Site URL (which is likely `regimen.lovable.app`).

**Fix:**
- Add `https://getregimen.app/**` to the Supabase Auth Redirect URLs allowlist
- Set the Site URL to `https://getregimen.app` in Supabase Auth settings
- These are configuration changes, not code changes

---

### 4. Password Reset Flow UX is Broken

**Problem:** After clicking the reset link, users land on a splash/onboarding screen with no way to reset their password. The flow doesn't guide them to a password form.

**Current flow (broken):**
1. User clicks reset link in email
2. Link goes to `regimen.lovable.app/onboarding` (wrong domain AND wrong page)
3. User sees splash screen, no password form

**Correct flow (after fixes):**
1. User clicks reset link in email
2. Link goes to `getregimen.app/auth?mode=reset`
3. Auth.tsx detects `mode=reset` and the `PASSWORD_RECOVERY` event
4. Auth.tsx shows the "Set New Password" form (this logic already exists in the code at lines 58-67 and the `handleResetPassword` function)

The code for showing the reset form is already implemented in `Auth.tsx`. The issue is entirely that the redirect URL is wrong, so users never land on `/auth?mode=reset`.

---

### 5. Reset Button Hidden on Mobile Email

**Problem:** The "Reset Password" button in the email is invisible on mobile email clients.

**Root Cause:** The email HTML in the `send-password-reset` edge function is well-structured, BUT this isn't the email being sent. Supabase Auth uses its own built-in email template which may have rendering issues.

**Fix:** Once custom SMTP is configured (step 2 above), we can use our own email template which is already mobile-friendly. Alternatively, the Supabase Auth email template can be customized in the Auth settings.

---

### Summary of Changes

| Item | Type | File/Location |
|------|------|---------------|
| PreviewModeBanner: static text, Subscribe first | Code change | `src/components/PreviewModeBanner.tsx` |
| Email sender "Regimen" capitalization | Config change | Supabase Auth SMTP settings |
| Redirect URL to getregimen.app | Config change | Supabase Auth Redirect URLs |
| Site URL to getregimen.app | Config change | Supabase Auth Site URL |
| Reset form (already works) | No change needed | `src/pages/Auth.tsx` |
| Mobile email button visibility | Fixed by custom SMTP | Supabase Auth email template |

### Technical Notes

- The PreviewModeBanner change is a simplification — removes ~15 lines of rotation logic and replaces with 2 static lines
- The Supabase Auth configuration changes require updating settings in the Lovable Cloud backend. I can guide you through this or attempt to configure it programmatically
- The password reset form in Auth.tsx is already fully implemented and functional — it just needs users to actually land on the correct URL for it to activate

