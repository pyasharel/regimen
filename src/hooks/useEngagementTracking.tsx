import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { scheduleEngagementNotification } from "@/utils/engagementNotifications";

/**
 * Hook to track first dose logged and trigger notification
 */
export const useEngagementTracking = () => {
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
  });

  useEffect(() => {
    // Check if this is the first dose logged
    if (stats && stats.total_doses_logged === 1) {
      // Schedule first dose notification (immediate)
      scheduleEngagementNotification('first_dose', new Date(Date.now() + 5000)); // 5 seconds from now
    }
  }, [stats]);

  return { stats };
};
