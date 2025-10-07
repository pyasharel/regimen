import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.regimenhealthhub.app',
  appName: 'Regimen',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#8B5CF6",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#8B5CF6",
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
  // Uncomment below to enable hot-reload from Lovable preview
  // server: {
  //   url: 'https://348ffbba-c097-44d8-bbbe-a7cee13c09a9.lovableproject.com?forceHideBadge=true',
  //   cleartext: true
  // }
};

export default config;
