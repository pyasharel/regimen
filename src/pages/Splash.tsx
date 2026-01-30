import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getCachedSession } from "@/utils/authSessionCache";
import logo from "@/assets/regimen-wordmark-transparent.png";

/**
 * HOTFIX: Simplified Splash Screen
 * 
 * This is a simplified version that prioritizes getting users into the app
 * over complex session restoration logic. Key changes:
 * 
 * 1. Always render UI immediately (never block on auth)
 * 2. Hide native splash immediately on mount
 * 3. Use 3-second hard timeout on auth check
 * 4. On any failure/timeout: go to onboarding (user can sign in again)
 * 
 * This breaks the "poison data" cycle where corrupted auth cache would
 * cause infinite boot loops.
 */

const AUTH_TIMEOUT_MS = 3000; // 3 second hard timeout on auth

export default function Splash() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'checking' | 'redirecting'>('checking');
  const hasNavigated = useRef(false);

  useEffect(() => {
    // Update boot stage
    window.updateBootStage?.('splash-mounted');
    
    // IMMEDIATELY hide native splash - don't wait for anything
    import('@capacitor/splash-screen').then(({ SplashScreen }) => {
      SplashScreen.hide().catch(() => {});
    }).catch(() => {});

    // Fast-path: Check localStorage cache synchronously first
    const cachedSession = getCachedSession();
    if (cachedSession && !hasNavigated.current) {
      console.log('[Splash] Fast-path: Valid cached session, navigating to /today');
      hasNavigated.current = true;
      setStatus('redirecting');
      navigate("/today", { replace: true });
      return;
    }

    // Slow-path: Async session check with hard timeout
    const checkAuth = async () => {
      if (hasNavigated.current) return;
      
      window.updateBootStage?.('splash-auth-check');
      
      try {
        // Race between auth check and timeout
        const timeoutPromise = new Promise<null>((resolve) => 
          setTimeout(() => resolve(null), AUTH_TIMEOUT_MS)
        );
        
        const sessionPromise = supabase.auth.getSession().then(res => res.data.session);
        
        const session = await Promise.race([sessionPromise, timeoutPromise]);
        
        if (hasNavigated.current) return;
        hasNavigated.current = true;
        setStatus('redirecting');
        
        if (session) {
          console.log('[Splash] Auth check: Session found, navigating to /today');
          navigate('/today', { replace: true });
        } else {
          console.log('[Splash] Auth check: No session or timeout, navigating to /onboarding');
          navigate('/onboarding', { replace: true });
        }
      } catch (error) {
        if (hasNavigated.current) return;
        
        console.warn('[Splash] Auth check failed:', error);
        hasNavigated.current = true;
        setStatus('redirecting');
        // On any error, go to onboarding - user can sign in again
        navigate('/onboarding', { replace: true });
      }
    };

    // Small delay to ensure UI is painted first
    const timer = setTimeout(checkAuth, 100);
    
    return () => clearTimeout(timer);
  }, [navigate]);

  // Always render loading UI immediately - never return null or block
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <img 
        src={logo} 
        alt="Regimen" 
        className="h-10 w-auto mb-6 animate-pulse"
      />
      <div className="flex items-center gap-2 text-muted-foreground">
        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-sm">
          {status === 'checking' ? 'Loading...' : 'Redirecting...'}
        </span>
      </div>
    </div>
  );
}
