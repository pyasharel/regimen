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
    const onHydrated = () => {
      const cached = getCachedSessionAsSupabaseSession();
      if (cached && isMountedRef.current) {
        setSession(cached as unknown as Session);
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

  // Don't render anything until we've checked auth, or if not authenticated
  if (!checked || !session) return null;

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
