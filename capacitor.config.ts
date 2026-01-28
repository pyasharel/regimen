import type { CapacitorConfig } from '@capacitor/cli';

// Version constants exported for use in components
// Update these values, then run: ./sync-version.sh
export const appVersion = '1.0.3';
export const appBuild = '17';

const config: CapacitorConfig = {
  appId: 'com.regimen.app',
  appName: 'Regimen',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      // Set to 0 - we hide programmatically after React is ready
      // This ensures onboarding animations are visible
      launchShowDuration: 0,
      launchAutoHide: false,
      backgroundColor: "#000000",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
      iosSpinnerStyle: "small",
      androidScaleType: "CENTER_INSIDE",
    },
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#8B5CF6",
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    SocialLogin: {
      google: {
        webClientId: '495863490632-pu5gu0svgcviivgr3la0c7esmakn6396.apps.googleusercontent.com',
        iOSClientId: '495863490632-lp0fckcnkiv0ktqeq2v4gout41bl8698.apps.googleusercontent.com',
      },
    },
  },
  ios: {
    // Disable automatic safe area handling - we control it manually
    contentInset: 'never',
    backgroundColor: '#000000',
    preferredContentMode: 'mobile',
    limitsNavigationsToAppBoundDomains: true,
  },
  // Comment out server config for production native apps
  // Uncomment only for hot-reload development from Lovable preview
  // server: {
  //   url: 'https://348ffbba-c097-44d8-bbbe-a7cee13c09a9.lovableproject.com?forceHideBadge=true',
  //   cleartext: true
  // }
};

export default config;
