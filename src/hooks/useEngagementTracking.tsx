import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { scheduleEngagementNotification } from "@/utils/engagementNotifications";

const FIRST_DOSE_NOTIFICATION_KEY = 'regimen_first_dose_notification_sent';

/**
 * Hook to track first dose logged and trigger notification
 * Only fires ONCE ever per user (stored in localStorage)
 */
export const useEngagementTracking = () => {
  const hasScheduledRef = useRef(false);
  
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
    staleTime: 60000, // Only refetch every 60 seconds
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    // Guard: only run once per session and if not already sent globally
    if (hasScheduledRef.current) return;
    
    const alreadySent = localStorage.getItem(FIRST_DOSE_NOTIFICATION_KEY);
    if (alreadySent) return;
    
    // Check if this is the first dose logged
    if (stats && stats.total_doses_logged === 1) {
      hasScheduledRef.current = true;
      localStorage.setItem(FIRST_DOSE_NOTIFICATION_KEY, 'true');
      scheduleEngagementNotification('first_dose', new Date(Date.now() + 5000));
    }
  }, [stats]);

  return { stats };
};
