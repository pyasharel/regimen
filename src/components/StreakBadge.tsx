import { useStreaks } from "@/hooks/useStreaks";
import { Flame } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export const StreakBadge = () => {
  const { data: stats, isLoading } = useStreaks();
  const [animate, setAnimate] = useState(false);
  const prevStreak = useRef<number>(0);

  useEffect(() => {
    const currentStreak = stats?.current_streak || 0;
    
    // Trigger animation when streak increases
    if (currentStreak > prevStreak.current && prevStreak.current > 0) {
      setAnimate(true);
      setTimeout(() => setAnimate(false), 600);
    }
    
    prevStreak.current = currentStreak;
  }, [stats?.current_streak]);

  if (isLoading || !stats) return null;

  const currentStreak = stats.current_streak || 0;

  // Only show for streaks of 1 or more
  if (currentStreak < 1) return null;

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-full">
      <Flame className="w-4 h-4 text-orange-500" fill="currentColor" />
      <span 
        className={`text-sm font-bold text-foreground transition-all duration-300 ${
          animate ? 'scale-125' : 'scale-100'
        }`}
      >
        {currentStreak}
      </span>
    </div>
  );
};
