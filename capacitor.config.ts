import type { CapacitorConfig } from '@capacitor/cli';

export const appVersion = '0.1.1';
export const appBuild = '3';

const config: CapacitorConfig = {
  appId: 'com.regimen.app',
  appName: 'Regimen',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#000000",
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
  // Comment out server config for production native apps
  // Uncomment only for hot-reload development from Lovable preview
  // server: {
  //   url: 'https://348ffbba-c097-44d8-bbbe-a7cee13c09a9.lovableproject.com?forceHideBadge=true',
  //   cleartext: true
  // }
};

export default config;
