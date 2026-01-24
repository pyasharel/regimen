import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView, trackSessionStart, trackSessionEnd, trackAppOpened } from '@/utils/analytics';
import { getDaysSinceInstall, setInstallDate } from '@/utils/featureTracking';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';

// Screen name mapping for cleaner GA4 reports
const SCREEN_MAP: Record<string, string> = {
  '/': 'Landing',
  '/auth': 'Auth',
  '/today': 'Today',
  '/stack': 'My Stack',
  '/progress': 'Progress',
  '/settings': 'Settings',
  '/photo-compare': 'Photo Compare',
  '/onboarding': 'Onboarding',
  '/add-compound': 'Add Compound',
  '/partner': 'Partner Landing',
  '/checkout-success': 'Checkout Success',
  '/checkout-cancel': 'Checkout Cancel',
  '/privacy': 'Privacy Policy',
  '/terms': 'Terms',
};

export const useAnalytics = () => {
  const location = useLocation();
  const sessionStartTime = useRef<number>(Date.now());
  const isFirstAppOpen = useRef(true);

  // Set install date on first load
  useEffect(() => {
    setInstallDate();
  }, []);

  // Track page views on route change with explicit screen names
  useEffect(() => {
    const screenName = SCREEN_MAP[location.pathname] || location.pathname;
    trackPageView(location.pathname, screenName);
  }, [location]);

  // Track app opens (native platforms)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handleAppStateChange = ({ isActive }: { isActive: boolean }) => {
      if (isActive) {
        const platform = Capacitor.getPlatform();
        const daysSinceInstall = getDaysSinceInstall();
        trackAppOpened(platform, daysSinceInstall);
        
        // Reset session timer when app becomes active
        sessionStartTime.current = Date.now();
        trackSessionStart();
      } else {
        // Track session end when app goes to background
        const duration = Date.now() - sessionStartTime.current;
        trackSessionEnd(duration);
      }
    };

    // Track initial app open
    if (isFirstAppOpen.current) {
      isFirstAppOpen.current = false;
      const platform = Capacitor.getPlatform();
      const daysSinceInstall = getDaysSinceInstall();
      trackAppOpened(platform, daysSinceInstall);
    }

    const listener = CapacitorApp.addListener('appStateChange', handleAppStateChange);
    
    return () => {
      listener.then(l => l.remove());
    };
  }, []);

  // Track session start/end for web
  useEffect(() => {
    if (Capacitor.isNativePlatform()) return; // Native handled above
    
    trackSessionStart();

    const handleBeforeUnload = () => {
      const duration = Date.now() - sessionStartTime.current;
      trackSessionEnd(duration);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      const duration = Date.now() - sessionStartTime.current;
      trackSessionEnd(duration);
    };
  }, []);

  // Track visibility changes (session pausing) - web only
  useEffect(() => {
    if (Capacitor.isNativePlatform()) return; // Native uses appStateChange
    
    const handleVisibilityChange = () => {
      if (document.hidden) {
        const duration = Date.now() - sessionStartTime.current;
        trackSessionEnd(duration);
      } else {
        sessionStartTime.current = Date.now();
        trackSessionStart();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
};
