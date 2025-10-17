import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface UserStats {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_check_in_date: string | null;
  total_doses_logged: number;
  created_at: string;
  updated_at: string;
}

export const useStreaks = () => {
  return useQuery({
    queryKey: ["user-stats"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { data, error } = await supabase
        .from("user_stats")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      // If no stats exist yet, return default values
      if (!data) {
        return {
          id: "",
          user_id: user.id,
          current_streak: 0,
          longest_streak: 0,
          last_check_in_date: null,
          total_doses_logged: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as UserStats;
      }

      return data as UserStats;
    },
  });
};

export const getStreakMessage = (streak: number): string => {
  if (streak === 0) return "Start your streak today!";
  if (streak === 1) return "Great start! Keep it going";
  if (streak < 7) return `${streak} day streak! 🔥`;
  if (streak === 7) return "One week strong! 🎯";
  if (streak < 14) return `${streak} days! You're unstoppable`;
  if (streak === 14) return "Two weeks of excellence! 💪";
  if (streak < 30) return `${streak} day streak! Legend status`;
  if (streak === 30) return "30 DAYS! You're a champion! 🏆";
  if (streak < 60) return `${streak} days of dedication! 🌟`;
  if (streak === 60) return "60 DAYS! Transformation mode! ⚡";
  if (streak < 90) return `${streak} days! Unstoppable force! 💎`;
  if (streak === 90) return "90 DAYS! Ultimate discipline! 👑";
  return `${streak} day streak! Legendary! 🔥`;
};

export const getMissedStreakMessage = (daysSinceLast: number): string => {
  if (daysSinceLast === 1) return "1 day break - restart your streak today! 💪";
  if (daysSinceLast === 2) return "2 day break - you've got this! 🔥";
  if (daysSinceLast < 7) return `${daysSinceLast} days - time to get back on track! ⚡`;
  return "Ready for a fresh start? 🌟";
};
