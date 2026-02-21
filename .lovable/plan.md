

## Revert Settings Rate Button to Native-First with Store Fallback

Since we confirmed the native rating dialog works fine for users who haven't rated yet, the Settings button should try native first and only fall back to the App Store if it fails.

### Change

**`src/components/SettingsScreen.tsx`** - Remove `forceStoreFallback: true` so it calls `requestRating('settings')` without forcing the store. The existing fallback logic in `ratingHelper.ts` already handles the case where native fails -- it will automatically open the App Store page.

This gives users the best of both worlds:
- First-time raters get the smooth native dialog
- If the native dialog is silently suppressed (already rated, iOS cap hit), the existing fallback in `ratingHelper.ts` catches the failure and opens the App Store page instead

### No changes needed to `ratingHelper.ts`

The `forceStoreFallback` option stays available for future use, but Settings won't use it by default.

