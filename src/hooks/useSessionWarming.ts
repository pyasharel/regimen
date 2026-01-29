import { useEffect } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

// Delay before warming session on resume (allows ProtectedRoute hydration to complete first)
const RESUME_WARMING_DELAY_MS = 2000;

/**
 * Proactively warms the Supabase session in the background.
 * 
 * This hook:
 * 1. Does NOT trigger getSession() on mount (Splash/ProtectedRoute handle cold start)
 * 2. Triggers getSession() when the app resumes from background, with a delay
 * 
 * The delay is critical on iOS to prevent this background warm-up from competing
 * with ProtectedRoute's hydration calls, which can cause auth deadlocks.
 * 
 * On iOS specifically, we disable resume warming entirely because iOS webview
 * resume behavior can cause Supabase auth calls to hang indefinitely.
 */
export const useSessionWarming = () => {
  useEffect(() => {
    let isMounted = true;
    let listener: { remove: () => void } | null = null;
    let warmingTimeout: ReturnType<typeof setTimeout> | null = null;
    
    // Skip session warming entirely on iOS due to auth deadlock issues on resume
    const platform = Capacitor.getPlatform();
    const isIOS = platform === 'ios';
    
    if (isIOS) {
      console.log('[SessionWarming] Disabled on iOS to prevent auth deadlocks');
      return;
    }
    
    // Warm session on app resume (Android only)
    CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive && isMounted) {
        // Clear any pending warming timeout
        if (warmingTimeout) {
          clearTimeout(warmingTimeout);
        }
        
        // Delay the warming call to let ProtectedRoute hydration complete first
        warmingTimeout = setTimeout(() => {
          if (isMounted) {
            console.log('[SessionWarming] App resumed (Android), warming session after delay...');
            supabase.auth.getSession().catch(() => {
              // Ignore errors - this is just a background warm-up
            });
          }
        }, RESUME_WARMING_DELAY_MS);
      }
    }).then((handle) => {
      if (isMounted) {
        listener = handle;
      } else {
        // Already unmounted, clean up immediately
        handle.remove();
      }
    }).catch(() => {
      // Not on native platform, ignore
    });
    
    return () => {
      isMounted = false;
      listener?.remove();
      if (warmingTimeout) {
        clearTimeout(warmingTimeout);
      }
    };
  }, []);
};
