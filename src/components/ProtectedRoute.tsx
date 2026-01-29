import { useEffect, useState, useRef, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { Session } from "@supabase/supabase-js";
import { hydrateSessionOrNull, hasAnyAuthTokens } from "@/utils/safeAuth";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

// How long to wait for full session hydration
const HYDRATION_TIMEOUT_MS = 8000;
// How long to wait before retrying on transient failure
const TRANSIENT_RETRY_DELAY_MS = 600;
// Maximum number of hydration attempts
const MAX_HYDRATION_ATTEMPTS = 2;

type HydrationState = 'loading' | 'hydrated' | 'failed' | 'unauthenticated';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [hydrationState, setHydrationState] = useState<HydrationState>('loading');
  const [retryCount, setRetryCount] = useState(0);
  const hydrationAttemptRef = useRef(0);
  const isMountedRef = useRef(true);

  const attemptHydration = useCallback(async (attemptNumber: number): Promise<void> => {
    if (!isMountedRef.current) return;
    
    const startTime = Date.now();
    console.log('[ProtectedRoute] Starting session hydration attempt', attemptNumber);
    
    try {
      setHydrationState('loading');
      
      const hydratedSession = await hydrateSessionOrNull(HYDRATION_TIMEOUT_MS);
      
      if (!isMountedRef.current) return;
      
      const elapsed = Date.now() - startTime;
      console.log('[ProtectedRoute] Hydration completed in', elapsed, 'ms, session:', !!hydratedSession);
      
      // Record diagnostics
      try {
        localStorage.setItem('regimen_last_hydration', JSON.stringify({
          timestamp: new Date().toISOString(),
          elapsed,
          success: !!hydratedSession,
          attemptNumber,
        }));
      } catch { /* ignore */ }
      
      if (hydratedSession) {
        setSession(hydratedSession);
        setHydrationState('hydrated');
        return;
      }
      
      // No session on first attempt - try once more after a short delay
      // This handles transient cases during rapid hard-close/reopen
      if (attemptNumber < MAX_HYDRATION_ATTEMPTS) {
        console.log('[ProtectedRoute] No session found, retrying after delay...');
        await new Promise(resolve => setTimeout(resolve, TRANSIENT_RETRY_DELAY_MS));
        
        if (!isMountedRef.current) return;
        
        // Try again
        await attemptHydration(attemptNumber + 1);
      } else {
        // All attempts exhausted - check if we have tokens anywhere
        // If yes, show "failed" (connection issue), if no, redirect to auth
        console.log('[ProtectedRoute] All hydration attempts exhausted, checking for tokens...');
        
        const hasTokens = await hasAnyAuthTokens();
        
        if (hasTokens) {
          // Tokens exist but hydration failed - likely a network/connection issue
          console.log('[ProtectedRoute] Tokens exist but hydration failed, showing retry UI');
          setSession(null);
          setHydrationState('failed');
        } else {
          // No tokens anywhere - user is genuinely not authenticated
          console.log('[ProtectedRoute] No tokens found anywhere, redirecting to auth');
          setSession(null);
          setHydrationState('unauthenticated');
        }
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      
      console.error('[ProtectedRoute] Hydration failed with error:', error);
      
      // On error, retry if we have attempts left
      if (attemptNumber < MAX_HYDRATION_ATTEMPTS) {
        console.log('[ProtectedRoute] Error on attempt', attemptNumber, '- retrying...');
        await new Promise(resolve => setTimeout(resolve, TRANSIENT_RETRY_DELAY_MS));
        
        if (!isMountedRef.current) return;
        await attemptHydration(attemptNumber + 1);
      } else {
        // Check if we have tokens before deciding what to show
        const hasTokens = await hasAnyAuthTokens();
        setHydrationState(hasTokens ? 'failed' : 'unauthenticated');
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    
    // Only attempt hydration on initial mount or when retry is triggered
    if (hydrationAttemptRef.current > 0 && retryCount === 0) return;
    hydrationAttemptRef.current++;
    
    attemptHydration(1);
    
    return () => {
      isMountedRef.current = false;
    };
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

  // Failed state - show retry UI (tokens exist but hydration failed)
  if (hydrationState === 'failed') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4 max-w-xs text-center">
          <p className="text-foreground font-medium">Connection issue</p>
          <p className="text-muted-foreground text-sm">
            We're having trouble connecting. This is usually temporary.
          </p>
          <div className="flex gap-3 mt-2">
            <Button 
              onClick={() => {
                hydrationAttemptRef.current = 0;
                setRetryCount(c => c + 1);
              }}
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
