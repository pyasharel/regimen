

# Comprehensive Onboarding & Authentication Fixes

## Overview

This plan fixes the critical issue where existing users get stuck during onboarding, plus cleans up URLs pointing to the wrong domain. The Android App Links fingerprint will be added once you find it in Google Play Console.

---

## Problem 1: Users Get Stuck in Onboarding

**Current Issue**: When someone enters an email that already has an account during onboarding, they see the error "This email already has an account. Try signing in instead." but there's NO button to actually sign in. They're completely stuck.

**Solution**: Add a prominent "Sign in instead" button that:
- Appears automatically when this error is shown
- Takes the user to the login screen with their email pre-filled
- Provides a smooth path to sign in without losing their place

---

## Problem 2: Calculator Embeds Link to Wrong Domain

**Current Issue**: The calculator embed components (used on partner sites) link to `regimen.lovable.app` instead of your production domain `getregimen.app`.

**Files affected**:
- `src/components/embeds/OilMlCalculatorEmbed.tsx`
- `src/components/embeds/PeptideReconstitutionCalculatorEmbed.tsx`

**Solution**: Update both to use `https://getregimen.app`

---

## Problem 3: Android Manifest Missing HTTPS Intent Filter

**Current Issue**: The Android manifest only has the `regimen://` custom URL scheme. It doesn't have an intent-filter for HTTPS URLs, which means Android can't intercept `getregimen.app` links to open the app.

**Solution**: Add an intent-filter in `AndroidManifest.xml` for:
- Scheme: `https`
- Host: `getregimen.app`
- With `android:autoVerify="true"` for automatic verification

---

## Technical Changes

### File 1: `src/components/onboarding/screens/AccountCreationScreen.tsx`

Add a "Sign in instead" button that appears when the duplicate email error is shown:

```tsx
{/* Error message */}
{error && (
  <div className="space-y-3">
    <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
      {error}
    </div>
    
    {/* Show sign-in option when account already exists */}
    {error.includes('already has an account') && (
      <button
        type="button"
        onClick={() => {
          // Navigate to auth with email pre-filled
          window.location.href = `/auth?email=${encodeURIComponent(email)}&mode=signin`;
        }}
        className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-base"
      >
        Sign in instead
      </button>
    )}
  </div>
)}
```

### File 2: `src/components/embeds/OilMlCalculatorEmbed.tsx`

Change line ~381 from:
```tsx
href="https://regimen.lovable.app"
```
To:
```tsx
href="https://getregimen.app"
```

### File 3: `src/components/embeds/PeptideReconstitutionCalculatorEmbed.tsx`

Change line ~124 from:
```tsx
href="https://regimen.lovable.app"
```
To:
```tsx
href="https://getregimen.app"
```

### File 4: `android/app/src/main/AndroidManifest.xml`

Add new intent-filter for HTTPS App Links:

```xml
<!-- App Links for getregimen.app domain -->
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="https" android:host="getregimen.app" />
</intent-filter>
```

---

## File 5: Android assetlinks.json (Separate Step)

The `public/.well-known/assetlinks.json` file already exists with a placeholder. Once you find your SHA-256 fingerprint, I'll update it with the real value.

**Where to find it**: Google Play Console → Your app → Setup → App signing → "App signing key certificate" → SHA-256 certificate fingerprint

---

## Expected User Experience After Fix

**Existing User in Onboarding**:
```text
1. User goes through onboarding flow
2. Enters email that already has an account
3. Error shows with message AND a "Sign in instead" button
4. User taps button → Goes to /auth with email pre-filled
5. Enters password → Signs in successfully
6. Redirected to /today screen
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `AccountCreationScreen.tsx` | Add "Sign in instead" button for existing accounts |
| `OilMlCalculatorEmbed.tsx` | Fix URL to getregimen.app |
| `PeptideReconstitutionCalculatorEmbed.tsx` | Fix URL to getregimen.app |
| `AndroidManifest.xml` | Add HTTPS App Links intent-filter |

