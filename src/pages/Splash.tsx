import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { clearAllAppData, generateSupportCode } from "@/utils/startupPreflight";
import { getCachedSession } from "@/utils/authSessionCache";
import logo from "@/assets/regimen-wordmark-transparent.png";

type SplashState = 'loading' | 'timeout' | 'error';

const TIMEOUT_MS = 8000; // 8 second watchdog (increased from 5s as fallback buffer)

export default function Splash() {
  const navigate = useNavigate();
  const [state, setState] = useState<SplashState>('loading');
  const [supportCode, setSupportCode] = useState<string>('');
  const hasNavigated = useRef(false);

  // Fast-path: Check localStorage cache synchronously first
  const tryFastPath = useCallback((): boolean => {
    console.log('[Splash] Attempting fast-path session check...');
    localStorage.setItem('regimen_last_boot_stage', 'splash_fast_path');
    
    const cachedSession = getCachedSession();
    
    if (cachedSession) {
      console.log('[Splash] Fast-path: Valid cached session found, navigating immediately');
      localStorage.setItem('regimen_last_boot_stage', 'splash_fast_path_success');
      hasNavigated.current = true;
      navigate("/today", { replace: true });
      return true;
    }
    
    console.log('[Splash] Fast-path: No valid cached session, falling back to async check');
    return false;
  }, [navigate]);

  // Slow-path: Async session check with timeout
  const checkSessionAsync = useCallback(async () => {
    if (hasNavigated.current) return;
    
    setState('loading');
    
    try {
      localStorage.setItem('regimen_last_boot_stage', 'splash_async_session_check');
      
      // Race between session check and timeout
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise<null>((_, reject) => 
        setTimeout(() => reject(new Error('Session check timeout')), TIMEOUT_MS)
      );
      
      const result = await Promise.race([sessionPromise, timeoutPromise]);
      
      if (hasNavigated.current) return; // Check again after await
      
      if (result && 'data' in result) {
        const { session } = result.data;
        
        localStorage.setItem('regimen_last_boot_stage', 'splash_navigating');
        hasNavigated.current = true;
        
        if (session) {
          console.log('[Splash] Async: Session found, navigating to /today');
          navigate("/today", { replace: true });
        } else {
          console.log('[Splash] Async: No session, navigating to /onboarding');
          navigate("/onboarding", { replace: true });
        }
      }
    } catch (error) {
      if (hasNavigated.current) return;
      
      console.error('[Splash] Async session check failed:', error);
      localStorage.setItem('regimen_last_boot_stage', 'splash_error');
      
      // Check if it's a timeout
      if (error instanceof Error && error.message.includes('timeout')) {
        setState('timeout');
      } else {
        setState('error');
      }
      
      setSupportCode(generateSupportCode());
    }
  }, [navigate]);

  // Absolute watchdog - forces recovery UI if stuck for 10 seconds
  // This fires regardless of Promise.race state to handle auth lock deadlocks
  useEffect(() => {
    const watchdog = setTimeout(() => {
      if (!hasNavigated.current) {
        console.error('[Splash] Watchdog triggered after 10s - forcing recovery UI');
        setState('timeout');
        setSupportCode(generateSupportCode());
      }
    }, 10000); // 10 second absolute max
    
    return () => clearTimeout(watchdog);
  }, []);

  useEffect(() => {
    console.log('[Splash] Starting session check...');
    
    // Step 1: Try fast-path first (synchronous localStorage check)
    const fastPathSucceeded = tryFastPath();
    
    // Step 2: If fast-path failed, fall back to async check
    if (!fastPathSucceeded) {
      checkSessionAsync();
    }
  }, [tryFastPath, checkSessionAsync]);

  const handleRetry = () => {
    console.log('[Splash] Retrying session check...');
    hasNavigated.current = false;
    
    // Try fast-path first, then async
    const fastPathSucceeded = tryFastPath();
    if (!fastPathSucceeded) {
      checkSessionAsync();
    }
  };

  const handleReset = () => {
    console.log('[Splash] User requested data reset');
    clearAllAppData();
    window.location.reload();
  };

  const handleContinueToAuth = () => {
    console.log('[Splash] User chose to continue to auth');
    navigate("/onboarding", { replace: true });
  };

  // Loading state - show branded splash
  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <img 
          src={logo} 
          alt="Regimen" 
          className="h-10 w-auto mb-6 animate-pulse"
        />
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Starting...</span>
        </div>
      </div>
    );
  }

  // Timeout or error state - show recovery UI
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <img 
        src={logo} 
        alt="Regimen" 
        className="h-10 w-auto mb-6"
      />
      
      <div className="text-center max-w-xs space-y-4">
        <h1 className="text-lg font-semibold text-foreground">
          {state === 'timeout' ? 'Taking longer than expected' : 'Something went wrong'}
        </h1>
        
        <p className="text-sm text-muted-foreground">
          {state === 'timeout' 
            ? 'The app is having trouble connecting. This can happen with poor network conditions.'
            : 'The app encountered an issue starting up.'}
        </p>

        {/* Primary action buttons */}
        <div className="space-y-3 pt-2">
          <button
            onClick={handleRetry}
            className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors"
          >
            Try Again
          </button>
          
          <button
            onClick={handleContinueToAuth}
            className="w-full py-3 px-4 bg-secondary text-secondary-foreground rounded-xl font-medium text-sm hover:bg-secondary/80 transition-colors"
          >
            Continue to Sign In
          </button>
        </div>

        {/* Clear cache option - more subtle and less alarming */}
        <div className="pt-4 border-t border-border">
          <button
            onClick={handleReset}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear cache & retry
          </button>
          <p className="text-[10px] text-muted-foreground/60 mt-1">
            Signs you out temporarily to fix connection issues
          </p>
        </div>

        {/* Support code for diagnostics */}
        {supportCode && (
          <div className="pt-4">
            <p className="text-[10px] text-muted-foreground/40">
              Support code: {supportCode}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
