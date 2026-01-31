import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getCachedSession } from "@/utils/authSessionCache";
import { hasAnyAuthTokens } from "@/utils/safeAuth";
import logo from "@/assets/regimen-wordmark-transparent.png";

/**
 * BUILD 30: Token-Mirror-Aware Splash Screen
 * 
 * This version checks BOTH localStorage AND native token mirror before
 * deciding to route to onboarding. This fixes the issue where tapping
 * a notification after hours in the background would incorrectly send
 * users to onboarding (appearing as if they were signed out).
 * 
 * Decision flow:
 * 1. Fast-path: If localStorage has valid cached session → /today
 * 2. Mirror-path: If hasAnyAuthTokens() finds tokens anywhere → /today
 *    (let ProtectedRoute handle hydration)
 * 3. Only if NO tokens anywhere → /onboarding
 * 
 * We intentionally avoid calling supabase.auth.getSession() here because
 * it's prone to timeout/deadlock during iOS cold starts from notifications.
 */

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

    // Mirror-path: Check if we have tokens anywhere (localStorage OR native mirror)
    // If tokens exist, route to /today and let ProtectedRoute handle hydration
    const checkTokensAndRoute = async () => {
      if (hasNavigated.current) return;
      
      window.updateBootStage?.('splash-token-check');
      
      try {
        const hasTokens = await hasAnyAuthTokens();
        
        if (hasNavigated.current) return;
        hasNavigated.current = true;
        setStatus('redirecting');
        
        if (hasTokens) {
          console.log('[Splash] Mirror-path: Tokens found, navigating to /today');
          navigate('/today', { replace: true });
        } else {
          console.log('[Splash] No tokens anywhere, navigating to /onboarding');
          navigate('/onboarding', { replace: true });
        }
      } catch (error) {
        if (hasNavigated.current) return;
        
        console.warn('[Splash] Token check failed:', error);
        hasNavigated.current = true;
        setStatus('redirecting');
        // On any error, go to onboarding - user can sign in again
        navigate('/onboarding', { replace: true });
      }
    };

    // Small delay to ensure UI is painted first
    const timer = setTimeout(checkTokensAndRoute, 100);
    
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
