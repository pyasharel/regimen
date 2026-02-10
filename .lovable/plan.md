
# Hide Google Sign-In on Android Native

## What
A quick, surgical fix: hide the Google Sign-In button only on Android native where it's broken. It stays visible on web and iOS.

## Scope
One file, two small changes. Should take about 30 seconds.

## Technical Details

### File: `src/pages/Auth.tsx`

**Change 1:** Add a platform check near the top of the component (around where other state variables are declared):
```typescript
const isAndroidNative = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
```

**Change 2:** Wrap lines 592-616 (the Google button + "Or continue with email" divider) in:
```tsx
{!isAndroidNative && (
  <>
    {/* Google Sign In */}
    ...existing button code...
    {/* Divider */}
    ...existing divider code...
  </>
)}
```

That's it. No other files, no dependencies, no native changes needed. Your beta tester on Android will just see a clean email/password form. Web and iOS users still get the Google option.
