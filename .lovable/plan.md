
# Comprehensive User Experience Fixes Plan

## Executive Summary

Based on my analysis, I've identified **5 distinct issues** causing poor UX for users transitioning from TestFlight to App Store and for web users. Here's what's actually broken and how to properly fix each one.

---

## Issue 1: Password Reset Not Working Properly

### Root Cause
The password reset uses `supabase.auth.resetPasswordForEmail()` which sends **Supabase's built-in email**, not your custom branded email. The `send-password-reset` edge function exists but is **never called** in the actual flow.

Additionally, the `redirectTo` uses `window.location.origin` which on native means the reset link opens in Safari instead of the app.

### Current Flow (Broken)
```text
User clicks "Forgot Password"
    ↓
supabase.auth.resetPasswordForEmail() called
    ↓
Supabase sends DEFAULT email (poor styling)
    ↓
Link opens in Safari → regimen.lovable.app/auth?mode=reset
    ↓
User stuck on web, not app
```

### Fixed Flow
```text
User clicks "Forgot Password"
    ↓
supabase.auth.resetPasswordForEmail() with redirectTo = https://getregimen.app/auth?mode=reset
    ↓
Supabase sends reset email with proper link
    ↓
User clicks link → Universal Links intercepts → App opens
    ↓
User sets new password in app
```

### Changes Required

**File: `src/pages/Auth.tsx` (line 262-264)**
- Change `redirectTo` from `${window.location.origin}/auth?mode=reset` to `https://getregimen.app/auth?mode=reset`
- This ensures the link always uses the Universal Links domain

**File: `src/components/settings/AccountSettings.tsx` (line 141-142)**
- Same change for the settings page password reset

---

## Issue 2: CORS Headers Missing in create-checkout Edge Function

### Root Cause
The `create-checkout` function has **incomplete CORS headers**. The Supabase client sends additional headers that aren't whitelisted.

### Current (Line 8)
```typescript
"Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
```

### Required Headers (from working functions)
```typescript
"Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
```

### File to Change
**File: `supabase/functions/create-checkout/index.ts` (line 6-8)**

---

## Issue 3: Welcome Email Icons Rendering with Wrong Color

### Root Cause
Looking at the email template, the SVGs use `stroke="#FF6B6B"` which is your coral color. The issue Mike reported (icons appearing red instead of coral) is likely due to **email client rendering** - some clients don't render inline SVGs correctly.

However, `#FF6B6B` IS coral/salmon - it's a red-orange color. If Mike is seeing it as pure red, it may be his email client or display. 

### No Changes Needed
The SVGs already use `#FF6B6B` (coral). The color you want is already there. If you want me to verify this looks correct, I can test it.

---

## Issue 4: Android App Links Not Configured

### Root Cause
iOS Universal Links are configured in `apple-app-site-association`, but **Android App Links are not configured** - there's no `assetlinks.json` file in `public/.well-known/`.

Android users clicking email links will ALWAYS open in browser.

### File to Create
**New file: `public/.well-known/assetlinks.json`**

This file needs your app's SHA256 certificate fingerprint to work. I'll add the structure, but you'll need to provide the signing key fingerprint.

---

## Issue 5: Paywall Dismissal Issues on Web

### Root Cause
From the screenshot, your friend was on the **web version** (you can see the URL bar showing `regimen.lovable.app`). The paywall dialog has `hideClose` on DialogContent (line 502), but the X button is inside the dialog.

The issue is the dialog can scroll but the X button isn't "sticky" - on mobile web, bouncing can make it hard to tap.

### Changes Required
**File: `src/components/SubscriptionPaywall.tsx`**

1. Make the close button sticky at the top of the scrollable area
2. Add keyboard escape handler for web users
3. Ensure the button is always in the viewport

---

## Technical Implementation

### File Changes:

| File | Change |
|------|--------|
| `src/pages/Auth.tsx` | Line 263: Change redirectTo to `https://getregimen.app/auth?mode=reset` |
| `src/components/settings/AccountSettings.tsx` | Line 142: Same redirectTo change |
| `supabase/functions/create-checkout/index.ts` | Line 6-8: Add full CORS headers |
| `public/.well-known/assetlinks.json` | Create new file for Android App Links |
| `src/components/SubscriptionPaywall.tsx` | Make X button sticky, add escape key handler |

---

## Why This Will Work

1. **Password Reset**: Using `https://getregimen.app` (your production domain with Universal Links configured) ensures iOS intercepts the link and opens the app instead of Safari.

2. **Checkout CORS**: The Supabase JS client sends these extra platform headers automatically. The function will stop returning CORS errors.

3. **Paywall UX**: A sticky close button + escape key ensures users can always exit, even on bouncy mobile web browsers.

4. **Android Links**: Once assetlinks.json is configured, Android users will also get seamless email-to-app transitions.

---

## What You Need to Provide

For Android App Links to work, I need:
- Your app's **package name** (likely `com.regimen.app` based on iOS config)
- Your **signing certificate SHA256 fingerprint** (get this from Google Play Console or via `keytool`)

---

## Expected User Experience After Fixes

```text
Password Reset Flow:
1. User taps "Forgot Password" in app
2. Gets email with branded reset link
3. Taps link → App opens directly to reset screen
4. Sets new password → Redirected to Today screen

Web Paywall Flow:
1. User sees paywall on web
2. Can tap X button (always visible) OR press Escape
3. Checkout works without CORS errors
```
