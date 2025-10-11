import { useState, useEffect } from "react";

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

  const openDigest = () => {
    const data = generateWeekData();
    setWeekData(data);
    setIsOpen(true);
  };

  const generateWeekData = (): WeeklyDigestData => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);

    const compounds = JSON.parse(localStorage.getItem("compounds") || "[]");
    const entries = JSON.parse(localStorage.getItem("progressEntries") || "[]");
    const photos = JSON.parse(localStorage.getItem("progressPhotos") || "[]");

    // Get doses from the last 7 days
    const compoundsWithDoses = compounds.map((compound: any) => {
      const dailyDoses = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
        const dateStr = date.toISOString().split("T")[0];

        // Check if dose was taken
        const taken = entries.some(
          (entry: any) =>
            entry.compoundId === compound.id &&
            entry.date === dateStr &&
            entry.taken
        );

        dailyDoses.push({
          day: dayName,
          count: compound.dosesPerDay || 1,
          taken,
        });
      }

      return {
        name: compound.name,
        dailyDoses,
      };
    });

    // Get photos from the last 7 days
    const recentPhotos = photos
      .filter((photo: any) => {
        const photoDate = new Date(photo.date);
        return photoDate >= startOfWeek;
      })
      .map((photo: any) => ({
        date: photo.date,
        url: photo.url,
      }));

    // Get weight data from the last 7 days
    const weightEntries = entries
      .filter((entry: any) => {
        const entryDate = new Date(entry.date);
        return entry.weight && entryDate >= startOfWeek;
      })
      .map((entry: any) => ({
        date: entry.date,
        weight: entry.weight,
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
