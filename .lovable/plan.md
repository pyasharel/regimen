

# Refined Onboarding Fix + Android SHA-256 Guide

## Summary

This plan makes two simple changes:
1. Makes the "Sign in instead" button **subtle** (not prominent) since it's an edge case
2. Provides you with the **exact navigation path** to find your SHA-256 fingerprint in Google Play Console

---

## Code Change: Subtle Sign-In Button

**File**: `src/components/onboarding/screens/AccountCreationScreen.tsx`

**Current implementation** (from last diff) has a prominent primary-colored button:
```tsx
<button className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-base">
  Sign in instead
</button>
```

**Updated to be subtle** - just a text link style:
```tsx
{error.includes('already has an account') && (
  <button
    type="button"
    onClick={() => {
      window.location.href = `/auth?email=${encodeURIComponent(email)}&mode=signin`;
    }}
    className="text-primary text-sm font-medium underline underline-offset-2 hover:text-primary/80 transition-colors"
  >
    Sign in to your account →
  </button>
)}
```

This changes it from a big button to a simple underlined text link that doesn't compete visually with the main "Create Account" button.

---

## Finding Your SHA-256 Fingerprint

### The Exact Path (from Google's official docs)

**Navigation**: Left sidebar → **Test and release** → **Setup** → **App signing**

Note: "Test and release" is different from "Testing" - it's a separate section in the sidebar.

### Step-by-Step

1. Go to [Google Play Console](https://play.google.com/console) and select your app
2. In the **left sidebar**, look for **"Test and release"** (NOT "Testing")
3. Click to expand it
4. Click **"Setup"** under "Test and release"
5. Click **"App signing"**
6. You'll see **"App signing key certificate"** section
7. Copy the **SHA-256 certificate fingerprint** (looks like `FA:C6:17:45:DC:09:...`)

### If You Don't See "App signing"

This can happen if:
- You haven't uploaded any app bundle yet
- Play App Signing wasn't enabled when you uploaded

**Alternative method** - if you have Android Studio:
1. Open your project in Android Studio
2. Go to **Build > Generate Signed Bundle/APK**
3. Select your keystore file
4. In terminal, run:
```bash
keytool -list -v -keystore your-keystore.jks -alias your-alias
```
5. Copy the SHA-256 fingerprint from the output

---

## Android Configuration Already Complete

The Android manifest already has the correct intent-filter (added in the last change):

```xml
<!-- App Links for getregimen.app domain -->
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="https" android:host="getregimen.app" />
</intent-filter>
```

The only missing piece is the SHA-256 fingerprint in `assetlinks.json`.

---

## What I'll Do After Approval

1. Update `AccountCreationScreen.tsx` to use a subtle text link instead of a prominent button
2. Wait for your SHA-256 fingerprint to update `assetlinks.json`

---

## After You Provide the SHA-256

Once you share the fingerprint (e.g., `FA:C6:17:45:DC:09:A2:B3:...`), I'll update:

**File**: `public/.well-known/assetlinks.json`
```json
{
  "sha256_cert_fingerprints": [
    "FA:C6:17:45:DC:09:A2:B3:..." // Your actual fingerprint
  ]
}
```

Then Android App Links will be fully functional.

