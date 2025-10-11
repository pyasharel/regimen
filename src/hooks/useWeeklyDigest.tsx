import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface WeeklyDigestData {
  startDate: Date;
  endDate: Date;
  compounds: Array<{
    name: string;
    dailyDoses: Array<{ day: string; count: number; taken: boolean }>;
  }>;
  photos: Array<{ date: string; url: string }>;
  weightData: Array<{ date: string; weight: number }>;
}

export const useWeeklyDigest = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [weekData, setWeekData] = useState<WeeklyDigestData | null>(null);

  useEffect(() => {
    // Listen for notification tap
    const checkForDigestTrigger = () => {
      const trigger = localStorage.getItem("openWeeklyDigest");
      if (trigger === "true") {
        localStorage.removeItem("openWeeklyDigest");
        openDigest();
      }
    };

    checkForDigestTrigger();
    window.addEventListener("focus", checkForDigestTrigger);

    return () => {
      window.removeEventListener("focus", checkForDigestTrigger);
    };
  }, []);

  const openDigest = async () => {
    const data = await generateWeekData();
    setWeekData(data);
    setIsOpen(true);
  };

  const generateWeekData = async (): Promise<WeeklyDigestData> => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        startDate: startOfWeek,
        endDate: now,
        compounds: [],
        photos: [],
        weightData: [],
      };
    }

    // Fetch compounds
    const { data: compounds } = await supabase
      .from('compounds')
      .select('*')
      .eq('user_id', user.id);

    // Fetch doses from the last 7 days
    const { data: doses } = await supabase
      .from('doses')
      .select('*')
      .eq('user_id', user.id)
      .gte('scheduled_date', startOfWeek.toISOString().split('T')[0])
      .lte('scheduled_date', now.toISOString().split('T')[0]);

    // Fetch progress entries (photos and weight)
    const { data: entries } = await supabase
      .from('progress_entries')
      .select('*')
      .eq('user_id', user.id)
      .gte('entry_date', startOfWeek.toISOString().split('T')[0]);

    // Map compounds with their daily doses
    const compoundsWithDoses = (compounds || []).map((compound: any) => {
      const dailyDoses = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
        const dateStr = date.toISOString().split("T")[0];

        // Count doses for this compound on this day
        const dayDoses = (doses || []).filter(
          (dose: any) =>
            dose.compound_id === compound.id &&
            dose.scheduled_date === dateStr
        );

        const takenCount = dayDoses.filter((d: any) => d.taken).length;
        const totalCount = dayDoses.length;

        dailyDoses.push({
          day: dayName,
          count: totalCount || 1,
          taken: takenCount > 0,
        });
      }

      return {
        name: compound.name,
        dailyDoses,
      };
    });

    // Get photos from the last 7 days
    const recentPhotos = (entries || [])
      .filter((entry: any) => entry.category === 'photo' && entry.photo_url)
      .map((entry: any) => ({
        date: entry.entry_date,
        url: supabase.storage.from('progress-photos').getPublicUrl(entry.photo_url).data.publicUrl,
      }));

    // Get weight data from the last 7 days
    const weightEntries = (entries || [])
      .filter((entry: any) => entry.category === 'weight' && entry.metrics?.weight)
      .map((entry: any) => ({
        date: entry.entry_date,
        weight: entry.metrics.weight,
      }))
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
      startDate: startOfWeek,
      endDate: now,
      compounds: compoundsWithDoses,
      photos: recentPhotos,
      weightData: weightEntries,
    };
  };

  return {
    isOpen,
    weekData,
    openDigest,
    closeDigest: () => setIsOpen(false),
  };
};
