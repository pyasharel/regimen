import { useEffect, useState, useRef } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { getCachedSession } from "@/utils/authSessionCache";

const SESSION_TIMEOUT_MS = 3000;

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const hasRestoredFromCache = useRef(false);

  useEffect(() => {
    let isMounted = true;
    
    const checkSession = async () => {
      try {
        // Race getSession against timeout to prevent hanging after iOS permission dialogs
        const result = await Promise.race([
          supabase.auth.getSession(),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('session_timeout')), SESSION_TIMEOUT_MS)
          )
        ]);
        
        if (isMounted) {
          console.log('[ProtectedRoute] Session check succeeded:', !!result.data.session);
          setSession(result.data.session);
          setLoading(false);
        }
      } catch (error) {
        // Timeout or error - fall back to cached session
        console.warn('[ProtectedRoute] Session check timed out or failed, checking cache');
        
        if (isMounted) {
          const cached = getCachedSession();
          if (cached) {
            console.log('[ProtectedRoute] Using cached session as fallback');
            hasRestoredFromCache.current = true;
            // Create a minimal session-like object from cache
            // The actual Session type expects more fields, but for auth checks we only need user
            setSession({ user: cached.user } as Session);
          } else {
            console.log('[ProtectedRoute] No cached session available');
            setSession(null);
          }
          setLoading(false);
        }
      }
    };
    
    checkSession();

    // Set up auth state listener - this will correct any stale cache data
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (isMounted) {
          console.log('[ProtectedRoute] Auth state changed:', event, !!session);
          // Only update if we're not in the middle of a cache restoration
          // or if this is a definitive auth event
          if (!hasRestoredFromCache.current || event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
            setSession(session);
            setLoading(false);
            hasRestoredFromCache.current = false;
          }
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};
