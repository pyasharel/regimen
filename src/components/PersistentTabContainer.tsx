import { useLocation } from "react-router-dom";
import { useEffect, useState, useCallback, useRef } from "react";
import { Session } from "@supabase/supabase-js";
import { hydrateSessionOrNull, hasAnyAuthTokens } from "@/utils/safeAuth";
import { getCachedSessionAsSupabaseSession } from "@/utils/authSessionCache";
import { TodayScreen } from "./TodayScreen";
import { MyStackScreen } from "./MyStackScreen";
import { ProgressScreen } from "./ProgressScreen";
import { SettingsScreen } from "./SettingsScreen";

const TAB_PATHS = ["/today", "/stack", "/progress", "/settings"];

/**
 * Renders all 4 tab screens simultaneously and toggles visibility via CSS.
 * This prevents unmount/remount cycles and eliminates loading flashes on tab switch.
 * Only renders when user is authenticated (mirrors ProtectedRoute logic).
 */
export const PersistentTabContainer = () => {
  const location = useLocation();
  const [session, setSession] = useState<Session | null>(null);
  const [checked, setChecked] = useState(false);
  const isMountedRef = useRef(true);

  // Check auth once on mount using the same fast-path as ProtectedRoute
  useEffect(() => {
    isMountedRef.current = true;

    const check = async () => {
      // Fast path: localStorage cache
      const cached = getCachedSessionAsSupabaseSession();
      if (cached) {
        setSession(cached as unknown as Session);
        setChecked(true);
        return;
      }

      // Slow path
      try {
        const s = await hydrateSessionOrNull(8000);
        if (isMountedRef.current) {
          setSession(s);
          setChecked(true);
        }
      } catch {
        if (isMountedRef.current) {
          setChecked(true);
        }
      }
    };

    check();

    // Listen for hydration completion from ProtectedRoute
    // This fires after login when Auth.tsx seeds the cache and navigates to /today.
    // At that point, getCachedSessionAsSupabaseSession() will now return the session.
    const onHydrated = () => {
      const cached = getCachedSessionAsSupabaseSession();
      if (isMountedRef.current) {
        if (cached) {
          setSession(cached as unknown as Session);
        }
        // Always mark as checked when ProtectedRoute signals completion
        setChecked(true);
      }
    };
    window.addEventListener('regimen:hydration-complete', onHydrated);

    return () => {
      isMountedRef.current = false;
      window.removeEventListener('regimen:hydration-complete', onHydrated);
    };
  }, []);

  const isTabPath = TAB_PATHS.includes(location.pathname);

  // Show a loading spinner while checking auth (instead of null/black screen)
  // This is the fix for the post-login black screen on fresh Android installs:
  // The fast-path cache check happens before Auth.tsx seeds the token, so we
  // fall into the 8s slow-path while the route renders null → pure black screen.
  if (!checked) {
    if (!isTabPath) return null; // Not on a tab route, don't show anything
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0a0a0a' }}>
        <div style={{
          width: 32, height: 32,
          border: '2.5px solid rgba(139,92,246,0.25)',
          borderTopColor: '#8B5CF6',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Not authenticated - render nothing (ProtectedRoute handles the redirect)
  if (!session) return null;

  // Only show the container when on a tab path
  // When on non-tab routes (e.g. /add-compound), hide everything
  return (
    <div style={{ display: isTabPath ? 'contents' : 'none' }}>
      <div style={{ display: location.pathname === '/today' ? 'flex' : 'none', flexDirection: 'column', minHeight: '100vh' }}>
        <TodayScreen />
      </div>
      <div style={{ display: location.pathname === '/stack' ? 'flex' : 'none', flexDirection: 'column', minHeight: '100vh' }}>
        <MyStackScreen />
      </div>
      <div style={{ display: location.pathname === '/progress' ? 'flex' : 'none', flexDirection: 'column', minHeight: '100vh' }}>
        <ProgressScreen />
      </div>
      <div style={{ display: location.pathname === '/settings' ? 'flex' : 'none', flexDirection: 'column', minHeight: '100vh' }}>
        <SettingsScreen />
      </div>
    </div>
  );
};
