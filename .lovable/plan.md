

# Fix In-App Rating for Android and iOS

## Problem Summary

The "Rate" button appears to do nothing because both Apple and Google have strict requirements for when the in-app review dialog can appear:

- **Android**: Only works when the app is downloaded from Google Play Store (including internal/closed testing tracks) - not sideloaded APKs
- **iOS**: Does NOT work on TestFlight at all - only works for App Store downloads
- Both platforms silently ignore the request if conditions aren't met (no error, just nothing happens)

## Root Cause Analysis

| Platform | Current Issue | Why It Fails |
|----------|--------------|--------------|
| Android | Closed beta users see nothing | App may still be "in review" or users installed before track was live |
| iOS | TestFlight users see nothing | Apple explicitly blocks review prompts on TestFlight builds |

## Implementation Plan

### Phase 1: Add Fallback Store Links (Immediate Fix)

Since the native review dialogs have strict requirements, we need a fallback that opens the store page directly.

**1.1 Create a unified rating utility**

Create `src/utils/ratingHelper.ts` that:
- Attempts the native In-App Review API first
- Falls back to opening the App Store/Play Store page directly if:
  - The plugin isn't available
  - We're on TestFlight (iOS)
  - The native request fails or isn't supported
- Uses the Browser plugin to open store links

**1.2 Update RatingScreen.tsx (Onboarding)**

Modify the rating screen to:
- Try native review first
- If it fails or is unavailable, fall back to opening the store page
- Track which method was used for analytics

**1.3 Update SettingsScreen.tsx (Settings)**

Same fallback logic for the Rate button in settings.

### Phase 2: Detect TestFlight and Handle Appropriately

**2.1 Use existing TestFlightDetectorPlugin**

You already have a `TestFlightDetectorPlugin` - we'll use it to detect TestFlight and skip straight to store link fallback.

### Phase 3: Improve Android Plugin Reliability

**3.1 Add Play Core Library dependency check**

The Android plugin uses `com.google.android.play:review` - we need to ensure this is in the build.gradle when you sync. This should be added during `npx cap sync`.

**3.2 Add better logging for debugging**

Add more detailed logging to understand why the dialog isn't appearing.

## Technical Implementation Details

### New File: `src/utils/ratingHelper.ts`

```text
Purpose: Centralized rating logic with fallback

Flow:
1. Check if native platform
2. If iOS: Check if TestFlight via TestFlightDetectorPlugin
   - If TestFlight: Skip to store link fallback
3. Try InAppReview.requestReview()
4. If fails or unavailable: Open store link via Browser plugin

Store URLs:
- iOS: https://apps.apple.com/app/id6753005449?action=write-review
- Android: market://details?id=app.lovable.348ffbbac09744d8bbbea7cee13c09a9
```

### Changes to RatingScreen.tsx

- Import and use new `requestRating()` helper
- Show toast feedback when falling back to store link
- Track fallback usage in analytics

### Changes to SettingsScreen.tsx

- Import and use new `requestRating()` helper
- Add toast feedback for store link fallback

### Analytics Additions

Add new tracking outcomes:
- `fallback_store_link` - When we opened the store instead
- `testflight_detected` - When we detected TestFlight
- `store_link_opened` - Confirmation the store was opened

## Testing Checklist

After implementation, you need to verify:

1. **Android (Play Store download)**: Install from closed beta track, tap Rate - should show native dialog OR open Play Store
2. **Android (Sideload)**: Confirm it gracefully falls back to Play Store link
3. **iOS (TestFlight)**: Confirm it detects TestFlight and opens App Store link
4. **iOS (App Store)**: When published, confirm native dialog appears
5. **Web**: Confirm graceful "not available" message

## Your Google Play "In Review" Status

Regarding your publishing confusion:
- "Changes are in review" means your latest update is pending
- The app can be "live" with a previous version while new changes are reviewed
- Closed beta users get access before public users
- The friend who couldn't access without beta access confirms the public release isn't fully live yet

## Dependencies

Uses existing packages:
- `@capacitor/browser` (already installed) - for fallback store links
- TestFlightDetectorPlugin (already exists) - for detecting TestFlight

