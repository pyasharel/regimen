import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.regimenhealthhub.app',
  appName: 'regimen-health-hub',
  webDir: 'dist',
  server: {
    url: 'https://348ffbba-c097-44d8-bbbe-a7cee13c09a9.lovableproject.com?forceHideBadge=true',
    cleartext: true
  }
};

export default config;
