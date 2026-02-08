

# Adjust Rating UX: No Store Redirect During Onboarding

## Summary

During onboarding, if the native in-app review dialog isn't available (TestFlight, beta builds, rate limits), the app will gracefully proceed to the next screen without kicking users out to the App Store. The store fallback will only be used in Settings where the user explicitly taps "Rate".

## Why This Matters

| Context | Current Behavior | New Behavior |
|---------|------------------|--------------|
| **Onboarding** | Opens App Store, user leaves app | Skips gracefully, continues onboarding |
| **Settings** | Opens App Store | No change - user explicitly wanted to rate |

This prevents:
- TestFlight users getting a confusing redirect (they can't rate anyway)
- Beta users dropping off during onboarding
- Users losing their place in the onboarding flow

## Changes

### 1. Update `src/utils/ratingHelper.ts`

Add a new option to skip the store fallback:

```text
requestRating(source, { skipStoreFallback?: boolean })

- If skipStoreFallback is true:
  - Skip TestFlight store redirect → return not_available
  - Skip plugin-not-available store redirect → return not_available  
  - Skip native-failure store redirect → return not_available
```

### 2. Update `src/components/onboarding/screens/RatingScreen.tsx`

- Call `requestRating('onboarding', { skipStoreFallback: true })`
- Remove the "Opening store page..." toast (no longer needed)
- Keep the native attempt - it may work for production App Store/Play Store users

### 3. `src/components/SettingsScreen.tsx`

- No changes needed - keep existing behavior with store fallback enabled

## Technical Details

The `requestRating` function signature changes from:
```typescript
requestRating(source: 'settings' | 'onboarding')
```

To:
```typescript
requestRating(source: 'settings' | 'onboarding', options?: { skipStoreFallback?: boolean })
```

When `skipStoreFallback: true`:
- Instead of calling `openStoreFallback()`, return `{ success: false, method: 'not_available', reason: 'fallback_skipped' }`
- Add analytics tracking: `fallback_skipped`

## User Experience After Fix

**Onboarding (TestFlight/Beta user):**
1. User taps "Rate Regimen"
2. Native dialog doesn't appear (platform restriction)
3. Screen immediately proceeds to next step
4. No disruption, no confusion

**Settings (Same user):**
1. User taps "Rate" button
2. Native dialog doesn't appear (platform restriction)
3. App Store opens in browser
4. Toast shows "Opening store page..."
5. User can rate and return to app

