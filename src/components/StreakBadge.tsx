import { useStreaks } from "@/hooks/useStreaks";
import { Flame } from "lucide-react";

export const StreakBadge = () => {
  const { data: stats } = useStreaks();

  if (!stats || stats.current_streak < 2) return null;

  return (
    <div className="flex items-center gap-1.5 bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-full px-3 py-1.5">
      <Flame className="h-4 w-4 text-orange-500" fill="currentColor" />
      <span className="text-sm font-semibold text-orange-500">
        {stats.current_streak}
      </span>
    </div>
  );
};
