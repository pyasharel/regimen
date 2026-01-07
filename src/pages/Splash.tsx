import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function Splash() {
  const navigate = useNavigate();

  useEffect(() => {
    console.log('[Splash] Checking session...');
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        console.log('[Splash] Session found, navigating to /today');
        navigate("/today", { replace: true });
      } else {
        console.log('[Splash] No session, navigating to /onboarding');
        navigate("/onboarding", { replace: true });
      }
    }).catch((error) => {
      console.error('[Splash] Session check error:', error);
      navigate("/onboarding", { replace: true });
    });
  }, [navigate]);

  // Show nothing while checking session - redirects immediately
  return null;
}
