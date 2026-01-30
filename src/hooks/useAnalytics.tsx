import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import ReactGA from 'react-ga4';
import { trackPageView, trackSessionStart, trackSessionEnd, trackAppOpened, setPlatformUserProperty } from '@/utils/analytics';
import { getDaysSinceInstall, setInstallDate, checkAndTrackVersionUpgrade } from '@/utils/featureTracking';
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
  const screenEntryTime = useRef<number>(Date.now());
  const lastScreen = useRef<string>('');

  // Set install date and check for version upgrades on first load
  useEffect(() => {
    setInstallDate();
    checkAndTrackVersionUpgrade();
    // Ensure platform property is set on init
    setPlatformUserProperty();
    
    // Debug log for native platforms
    if (Capacitor.isNativePlatform()) {
      console.log('[Analytics] GA4 initialized on native:', {
        platform: Capacitor.getPlatform(),
        isNative: true,
      });
    }
  }, []);

  // Track page views and screen time on route change
  useEffect(() => {
    const screenName = SCREEN_MAP[location.pathname] || location.pathname;
    
    // Track time spent on previous screen (if there was one)
    if (lastScreen.current) {
      const timeSpent = Date.now() - screenEntryTime.current;
      // Only track if user spent at least 1 second on the screen
      if (timeSpent >= 1000) {
        ReactGA.event('screen_time', {
          screen_name: lastScreen.current,
          time_ms: timeSpent,
          time_seconds: Math.round(timeSpent / 1000),
        });
      }
    }
    
    // Update refs for next screen
    lastScreen.current = screenName;
    screenEntryTime.current = Date.now();
    
    // Track the page view
    trackPageView(location.pathname, screenName);
  }, [location]);

  // Track app opens (native platforms)
  // Delay analytics resume handling to let critical systems (auth, theme, subscription) settle first
  const ANALYTICS_RESUME_DELAY_MS = 2000;
  
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let isMounted = true;
    let listener: { remove: () => void } | null = null;

    const handleAppStateChange = ({ isActive }: { isActive: boolean }) => {
      if (!isMounted) return;
      
      if (isActive) {
        // Stagger analytics to avoid competing with auth/subscription/theme on resume
        setTimeout(() => {
          if (!isMounted) return;
          
          const platform = Capacitor.getPlatform();
          const daysSinceInstall = getDaysSinceInstall();
          trackAppOpened(platform, daysSinceInstall);
          
          // Refresh platform property on each resume
          setPlatformUserProperty();
          
          // Reset session timer when app becomes active
          sessionStartTime.current = Date.now();
          screenEntryTime.current = Date.now();
          trackSessionStart();
        }, ANALYTICS_RESUME_DELAY_MS);
      } else {
        // Track screen time for current screen before going to background
        if (lastScreen.current) {
          const timeSpent = Date.now() - screenEntryTime.current;
          if (timeSpent >= 1000) {
            ReactGA.event('screen_time', {
              screen_name: lastScreen.current,
              time_ms: timeSpent,
              time_seconds: Math.round(timeSpent / 1000),
            });
          }
        }
        
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

    CapacitorApp.addListener('appStateChange', handleAppStateChange)
      .then((handle) => {
        if (isMounted) {
          listener = handle;
        } else {
          // Already unmounted, clean up immediately
          handle.remove();
        }
      })
      .catch(() => {
        // Not on native platform, ignore
      });
    
    return () => {
      isMounted = false;
      listener?.remove();
    };
  }, []);

  // Track session start/end for web
  useEffect(() => {
    if (Capacitor.isNativePlatform()) return; // Native handled above
    
    trackSessionStart();

    const handleBeforeUnload = () => {
      // Track final screen time
      if (lastScreen.current) {
        const timeSpent = Date.now() - screenEntryTime.current;
        if (timeSpent >= 1000) {
          ReactGA.event('screen_time', {
            screen_name: lastScreen.current,
            time_ms: timeSpent,
            time_seconds: Math.round(timeSpent / 1000),
          });
        }
      }
      
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
        // Track screen time before hiding
        if (lastScreen.current) {
          const timeSpent = Date.now() - screenEntryTime.current;
          if (timeSpent >= 1000) {
            ReactGA.event('screen_time', {
              screen_name: lastScreen.current,
              time_ms: timeSpent,
              time_seconds: Math.round(timeSpent / 1000),
            });
          }
        }
        
        const duration = Date.now() - sessionStartTime.current;
        trackSessionEnd(duration);
      } else {
        sessionStartTime.current = Date.now();
        screenEntryTime.current = Date.now();
        trackSessionStart();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
};
