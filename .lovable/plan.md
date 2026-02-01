

# Plan: Beta Tester Feedback Fixes

## Overview

Implement three confirmed fixes from beta tester feedback, plus investigate and fix the week start day inconsistency.

---

## Changes

### 1. Add Sign-Out Confirmation Dialog

**File**: `src/components/SettingsScreen.tsx`

Replace the simple sign-out button with an AlertDialog that requires confirmation:

- Import `AlertDialog` components from `@/components/ui/alert-dialog`
- Add state for `showSignOutDialog`
- Wrap sign-out button to trigger the dialog
- Add confirmation dialog with "Cancel" and "Sign Out" options
- Only call `handleSignOut()` when user confirms

This prevents accidental sign-outs from scroll gestures.

---

### 2. Enable Password Manager Support on Auth Form

**File**: `src/pages/Auth.tsx`

Add proper `autoComplete` and `name` attributes to enable OS password managers:

| Field | Sign-In Mode | Sign-Up Mode |
|-------|--------------|--------------|
| Email | `autoComplete="email"` `name="email"` | Same |
| Password | `autoComplete="current-password"` `name="password"` | `autoComplete="new-password"` |
| Full Name | N/A | `autoComplete="name"` `name="fullName"` |

The browser/OS will automatically:
- Offer to save credentials after successful login/signup
- Offer to autofill on return visits
- Show the password manager prompt on iOS/Android

---

### 3. Fix Week Start Day in Weekly Digest Modal

**File**: `src/components/WeeklyDigestModalCalendar.tsx`

Change the hardcoded days array from Sunday-start to Monday-start:

Before:
```typescript
const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
```

After:
```typescript
const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
```

This aligns with the TodayScreen week calculation which already uses Monday as the start.

---

### 4. Version Text Visibility (Deferred)

**Recommendation**: Request a screenshot from the beta tester before making changes. The current `pb-20` padding should be sufficient for most devices. Making changes without understanding the specific issue could break the layout for other users.

---

## Summary of File Changes

| File | Change |
|------|--------|
| `src/components/SettingsScreen.tsx` | Add AlertDialog for sign-out confirmation |
| `src/pages/Auth.tsx` | Add autocomplete/name attributes for password manager support |
| `src/components/WeeklyDigestModalCalendar.tsx` | Fix week start day to Monday |

---

## Technical Notes

### Password Manager Compatibility

The `autoComplete` attribute tells the browser what type of data the field expects. When properly set:
- iOS Safari will show the keychain prompt
- Chrome will offer to save passwords
- Android will show the password manager
- 1Password, LastPass, etc. will recognize the fields

### Sign-Out Confirmation

Using the existing `AlertDialog` component from the UI library. The dialog will:
- Have a clear title: "Sign Out?"
- Explain the action
- Show "Cancel" (secondary) and "Sign Out" (destructive) buttons
- Only proceed when user explicitly confirms

