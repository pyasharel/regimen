import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { scheduleEngagementNotification } from "@/utils/engagementNotifications";

const FIRST_DOSE_NOTIFICATION_KEY = 'regimen_first_dose_notification_sent';
const FIRST_WEEK_NOTIFICATION_KEY = 'regimen_notif_first_week';

/**
 * Hook to track first dose logged and first week anniversary
 * Only fires ONCE ever per user (stored in localStorage)
 */
export const useEngagementTracking = () => {
  const hasScheduledRef = useRef(false);
  const hasCheckedAnniversaryRef = useRef(false);
  
  const { data: stats } = useQuery({
    queryKey: ["user-stats-engagement"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data } = await supabase
        .from("user_stats")
        .select("total_doses_logged")
        .eq("user_id", user.id)
        .maybeSingle();

      return data;
    },
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  // First dose notification
  useEffect(() => {
    if (hasScheduledRef.current) return;
    
    const alreadySent = localStorage.getItem(FIRST_DOSE_NOTIFICATION_KEY);
    if (alreadySent) return;
    
    if (stats && stats.total_doses_logged === 1) {
      hasScheduledRef.current = true;
      localStorage.setItem(FIRST_DOSE_NOTIFICATION_KEY, 'true');
      scheduleEngagementNotification('first_dose', new Date(Date.now() + 5000));
    }
  }, [stats]);

  // First week anniversary check (handled by initializeEngagementNotifications,
  // but we also check here in case the user just signed up and hasn't restarted the app)
  useEffect(() => {
    if (hasCheckedAnniversaryRef.current) return;
    const alreadySent = localStorage.getItem(FIRST_WEEK_NOTIFICATION_KEY);
    if (alreadySent) return;
    
    if (stats && stats.total_doses_logged && stats.total_doses_logged >= 1) {
      hasCheckedAnniversaryRef.current = true;
      // The actual scheduling logic is in initializeEngagementNotifications
      // which runs on TodayScreen mount. This is just a safety net.
    }
  }, [stats]);

  return { stats };
};
