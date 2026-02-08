// Centralized store URLs - single source of truth
// iOS App ID: 6753905449 (confirmed by user)
// Android Package: com.regimen.app (from Play Store URL)

export const STORE_URLS = {
  ios: {
    // Full URL with app name for sharing (name can change, ID is permanent)
    appStore: 'https://apps.apple.com/us/app/regimen-peptide-trt-tracker/id6753905449',
    // Shorter format for review deep link (internal use only)
    review: 'https://apps.apple.com/app/id6753905449?action=write-review',
  },
  android: {
    playStore: 'https://play.google.com/store/apps/details?id=com.regimen.app',
    // market:// URI opens Play Store app directly
    review: 'market://details?id=com.regimen.app',
    // Web fallback if market:// doesn't work
    reviewWeb: 'https://play.google.com/store/apps/details?id=com.regimen.app',
  },
  // Landing page for web users
  web: 'https://getregimen.app',
};
