import { useEffect, useState, useRef, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { Session } from "@supabase/supabase-js";
import { hydrateSessionOrNull } from "@/utils/safeAuth";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

// How long to wait for full session hydration
const HYDRATION_TIMEOUT_MS = 8000;

type HydrationState = 'loading' | 'hydrated' | 'failed' | 'unauthenticated';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [hydrationState, setHydrationState] = useState<HydrationState>('loading');
  const [retryCount, setRetryCount] = useState(0);
  const hasAttemptedHydration = useRef(false);

  const attemptHydration = useCallback(async () => {
    const startTime = Date.now();
    console.log('[ProtectedRoute] Starting session hydration attempt', retryCount + 1);
    
    try {
      setHydrationState('loading');
      
      const hydratedSession = await hydrateSessionOrNull(HYDRATION_TIMEOUT_MS);
      
      const elapsed = Date.now() - startTime;
      console.log('[ProtectedRoute] Hydration completed in', elapsed, 'ms, session:', !!hydratedSession);
      
      // Record diagnostics
      try {
        localStorage.setItem('regimen_last_hydration', JSON.stringify({
          timestamp: new Date().toISOString(),
          elapsed,
          success: !!hydratedSession,
          retryCount,
        }));
      } catch { /* ignore */ }
      
      if (hydratedSession) {
        setSession(hydratedSession);
        setHydrationState('hydrated');
      } else {
        // No session means user is not authenticated
        setSession(null);
        setHydrationState('unauthenticated');
      }
    } catch (error) {
      console.error('[ProtectedRoute] Hydration failed with error:', error);
      setHydrationState('failed');
    }
  }, [retryCount]);

  useEffect(() => {
    // Only attempt hydration once per mount (unless retry is triggered)
    if (hasAttemptedHydration.current && retryCount === 0) return;
    hasAttemptedHydration.current = true;
    
    attemptHydration();
  }, [attemptHydration, retryCount]);

  // Loading state - show "Restoring your session..." UI
  if (hydrationState === 'loading') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          <p className="text-muted-foreground text-sm">Restoring your session...</p>
        </div>
      </div>
    );
  }

  // Failed state - show retry UI
  if (hydrationState === 'failed') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4 max-w-xs text-center">
          <p className="text-foreground font-medium">Couldn't load your session</p>
          <p className="text-muted-foreground text-sm">
            This is usually temporary. Please try again.
          </p>
          <div className="flex gap-3 mt-2">
            <Button 
              onClick={() => setRetryCount(c => c + 1)}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setHydrationState('unauthenticated')}
            >
              Sign In
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated - redirect to auth
  if (hydrationState === 'unauthenticated' || !session) {
    return <Navigate to="/auth" replace />;
  }

  // Authenticated and hydrated - render children
  return <>{children}</>;
};
