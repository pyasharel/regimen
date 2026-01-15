import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

// Generate a unique session ID
const generateSessionId = () => crypto.randomUUID();

// Store session ID in memory (persists across re-renders but resets on page reload)
let currentSessionId: string | null = null;
let sessionStartTime: number | null = null;

export const useActivityTracking = () => {
  const hasTrackedSessionStart = useRef(false);

  // Get or create session ID
  const getSessionId = useCallback(() => {
    if (!currentSessionId) {
      currentSessionId = generateSessionId();
    }
    return currentSessionId;
  }, []);

  // Track any event
  const trackEvent = useCallback(async (
    eventType: string,
    eventName: string,
    metadata: Record<string, unknown> = {},
    durationSeconds?: number,
    screenName?: string
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('user_activity').insert([{
        user_id: user.id,
        event_type: eventType,
        event_name: eventName,
        session_id: getSessionId(),
        duration_seconds: durationSeconds,
        screen_name: screenName,
        metadata: metadata as Json
      }]);
    } catch (error) {
      console.error('Error tracking event:', error);
    }
  }, [getSessionId]);

  // Track feature usage
  const trackFeature = useCallback((
    featureName: string,
    metadata: Record<string, unknown> = {}
  ) => {
    trackEvent('feature', featureName, metadata);
  }, [trackEvent]);

  // Track screen view
  const trackScreen = useCallback((screenName: string) => {
    trackEvent('screen_view', 'screen_view', {}, undefined, screenName);
  }, [trackEvent]);

  // Track session start
  const trackSessionStart = useCallback(async () => {
    sessionStartTime = Date.now();
    await trackEvent('session', 'session_start', {
      timestamp: new Date().toISOString()
    });

    // Update last_active_at in profiles
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ last_active_at: new Date().toISOString() })
          .eq('user_id', user.id);
      }
    } catch (error) {
      console.error('Error updating last_active_at:', error);
    }
  }, [trackEvent]);

  // Track session end
  const trackSessionEnd = useCallback(async () => {
    if (!sessionStartTime) return;
    
    const durationSeconds = Math.round((Date.now() - sessionStartTime) / 1000);
    await trackEvent('session', 'session_end', {
      timestamp: new Date().toISOString()
    }, durationSeconds);
  }, [trackEvent]);

  // Initialize session tracking
  useEffect(() => {
    const initSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && !hasTrackedSessionStart.current) {
        hasTrackedSessionStart.current = true;
        trackSessionStart();
      }
    };

    initSession();

    // Track visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        trackSessionEnd();
      } else {
        // Reset session on return
        currentSessionId = generateSessionId();
        sessionStartTime = Date.now();
        trackSessionStart();
      }
    };

    // Track before unload
    const handleBeforeUnload = () => {
      trackSessionEnd();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [trackSessionStart, trackSessionEnd]);

  return {
    trackFeature,
    trackScreen,
    trackEvent,
    getSessionId
  };
};

// Create a singleton context for sharing tracking across components
import { createContext, useContext, ReactNode } from 'react';

interface ActivityTrackingContextValue {
  trackFeature: (featureName: string, metadata?: Record<string, unknown>) => void;
  trackScreen: (screenName: string) => void;
}

const ActivityTrackingContext = createContext<ActivityTrackingContextValue | null>(null);

export const ActivityTrackingProvider = ({ children }: { children: ReactNode }) => {
  const tracking = useActivityTracking();
  
  return (
    <ActivityTrackingContext.Provider value={{
      trackFeature: tracking.trackFeature,
      trackScreen: tracking.trackScreen
    }}>
      {children}
    </ActivityTrackingContext.Provider>
  );
};

export const useActivityTracker = () => {
  const context = useContext(ActivityTrackingContext);
  if (!context) {
    // Return no-op functions if not in provider
    return {
      trackFeature: () => {},
      trackScreen: () => {}
    };
  }
  return context;
};
