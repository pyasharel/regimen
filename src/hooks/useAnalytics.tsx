import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView, trackSessionStart, trackSessionEnd, trackScreenView } from '@/utils/analytics';

export const useAnalytics = () => {
  const location = useLocation();
  const sessionStartTime = useRef<number>(Date.now());

  // Track page views on route change
  useEffect(() => {
    trackPageView(location.pathname);
    
    // Track screen views with friendly names
    const screenMap: Record<string, string> = {
      '/': 'Landing',
      '/auth': 'Authentication',
      '/today': 'Today',
      '/stack': 'My Stack',
      '/progress': 'Progress',
      '/insights': 'Insights',
      '/settings': 'Settings',
      '/photo-compare': 'Photo Compare',
    };
    
    const screenName = screenMap[location.pathname] || location.pathname;
    trackScreenView(screenName);
  }, [location]);

  // Track session start/end
  useEffect(() => {
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

  // Track visibility changes (session pausing)
  useEffect(() => {
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
