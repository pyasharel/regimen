
# Fix Black Screen Bug - Critical Production Issue

## Problem Summary
Multiple users (both iOS and Android) are experiencing a black screen that makes the app completely unusable. The app works on first load after install, but breaks after closing and reopening. Force-closing does not help - only deleting and reinstalling fixes the issue.

## Root Cause Identified
An **unsafe `JSON.parse()` call** in `TodayBanner.tsx` (line 29) that crashes when localStorage data becomes corrupted:

```javascript
const dismissedBanners = JSON.parse(localStorage.getItem('dismissedBanners') || '[]');
```

If the stored JSON is malformed (which can happen due to interrupted writes during app backgrounding), this throws an exception that crashes the entire React render tree. Since there's no error boundary, the app shows nothing but a black screen.

## Why This Happens
1. User uses the app normally, dismissing banners or triggering state saves
2. App is closed mid-write or storage gets corrupted on mobile
3. Next app open: `JSON.parse` throws on malformed data
4. Entire React tree crashes with unhandled exception
5. App renders black because nothing renders at all

## Implementation Plan

### 1. Fix Unsafe JSON.parse in TodayBanner.tsx
Wrap the JSON.parse in a try-catch to prevent crashes:

```typescript
// Before (crashes on corrupt data):
const dismissedBanners = JSON.parse(localStorage.getItem('dismissedBanners') || '[]');

// After (safe fallback):
let dismissedBanners: string[] = [];
try {
  const stored = localStorage.getItem('dismissedBanners');
  if (stored) {
    dismissedBanners = JSON.parse(stored);
  }
} catch (e) {
  console.error('[TodayBanner] Failed to parse dismissedBanners, resetting:', e);
  localStorage.removeItem('dismissedBanners');
}
```

### 2. Audit and Fix Other JSON.parse Locations

**WeeklyDigestSettings.tsx** (line 17) - needs try-catch:
```typescript
// Wrap the settings parsing safely
let parsed = { enabled: false, day: 'sunday', time: '09:00' };
try {
  const settings = localStorage.getItem("weeklyDigestSettings");
  if (settings) {
    parsed = JSON.parse(settings);
  }
} catch (e) {
  console.error('[WeeklyDigestSettings] Failed to parse settings:', e);
}
```

### 3. Add Global Error Boundary (Safety Net)
Create an `ErrorBoundary` component to catch any future unhandled errors and display a recovery screen instead of a black screen:

```typescript
// src/components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component {
  state = { hasError: false };
  
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  
  handleReset = () => {
    // Clear potentially corrupt storage
    localStorage.clear();
    window.location.reload();
  };
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="text-center space-y-4">
            <h2>Something went wrong</h2>
            <p>We're sorry for the inconvenience.</p>
            <button onClick={this.handleReset}>
              Reset App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
```

### 4. Wrap App with Error Boundary
Update `App.tsx` to include the error boundary at the top level.

## Files to Modify
1. `src/components/TodayBanner.tsx` - Fix unsafe JSON.parse
2. `src/components/WeeklyDigestSettings.tsx` - Fix unsafe JSON.parse  
3. `src/components/ErrorBoundary.tsx` - Create new file
4. `src/App.tsx` - Wrap with ErrorBoundary

## Testing Plan
After implementing the fix:
1. Build and deploy to a test device
2. Use the app normally, dismiss some banners
3. Force-close the app
4. Reopen - verify it doesn't crash
5. Manually corrupt localStorage (if possible) to verify error boundary works

---

## Reminder: Google Play Promotional Offers (For Later)
As discussed, the proper Android partner promo code implementation using Google Play Promotional Offers will create real auto-renewing subscriptions (matching the iOS experience). This requires:
1. Creating subscription offers in Google Play Console per partner
2. Adding `google_play_offer_id` column to `partner_promo_codes` table
3. Using RevenueCat's promotional offer API for Android

This will be addressed after the black screen bug is fixed.
