import { useEffect } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { supabase } from '@/integrations/supabase/client';

/**
 * Proactively warms the Supabase session in the background.
 * 
 * This hook:
 * 1. Triggers a non-blocking getSession() call on mount
 * 2. Triggers getSession() when the app resumes from background
 * 
 * The goal is to keep the session fresh and reduce latency
 * for subsequent auth-dependent operations.
 */
export const useSessionWarming = () => {
  useEffect(() => {
    let isMounted = true;
    let listener: { remove: () => void } | null = null;
    
    // Warm session on mount (non-blocking)
    console.log('[SessionWarming] Warming session on mount...');
    supabase.auth.getSession()
      .then(({ data }) => {
        if (!isMounted) return; // Skip if unmounted
        if (data.session) {
          console.log('[SessionWarming] Session warmed successfully');
        } else {
          console.log('[SessionWarming] No active session');
        }
      })
      .catch((error) => {
        console.warn('[SessionWarming] Failed to warm session:', error);
      });
    
    // Warm session on app resume
    CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive && isMounted) {
        console.log('[SessionWarming] App resumed, warming session...');
        supabase.auth.getSession().catch(() => {
          // Ignore errors - this is just a background warm-up
        });
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
    };
  }, []);
};
