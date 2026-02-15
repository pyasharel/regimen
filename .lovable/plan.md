

# Fix: OTP Code Input Invisible Digits in Dark Mode

## The Problem
On the password reset "Enter Code" screen in dark mode, the OTP digit slots are nearly invisible. The digits blend into the dark card background because the component doesn't explicitly set a foreground text color. Empty slots also have no visible border/placeholder contrast.

## The Fix

### File: `src/components/ui/input-otp.tsx`

Update the `InputOTPSlot` styling to explicitly use `text-foreground` for the digit text and improve border contrast in dark mode:

- Add `text-foreground` class to ensure digits are always visible regardless of theme
- Add `bg-background` to give slots a distinct background
- Increase the slot size slightly (`h-12 w-12` and `text-lg`) for better mobile usability since this is primarily used on phones

This is a one-line className change in the `InputOTPSlot` component — very low risk.

## Response Draft for Daan

"Hey Daan! Good catch on the code screen in dark mode — the digits were blending into the background. Fixed that, will be in the next update. Appreciate the feedback man, glad you're liking the site! Let me know how it goes when you start your cycle Thursday."

