import { useStreaks } from "@/hooks/useStreaks";
import { Flame } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/components/ThemeProvider";

export const StreakBadge = () => {
  const { data: stats, isLoading } = useStreaks();
  const [animate, setAnimate] = useState(false);
  const prevStreak = useRef<number>(0);
  const { designVariant } = useTheme();
  const isRefinedMode = designVariant === 'refined';
  
  // One-time scale-in animation on first appearance
  const hasScaledIn = useRef(false);
  const [showScaleIn, setShowScaleIn] = useState(false);
  
  useEffect(() => {
    if (!isLoading && stats && (stats.current_streak || 0) >= 1 && !hasScaledIn.current) {
      hasScaledIn.current = true;
      setShowScaleIn(true);
      setTimeout(() => setShowScaleIn(false), 400);
    }
  }, [isLoading, stats]);

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
    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border transition-transform duration-300 ${
      showScaleIn ? 'animate-scale-in' : ''
    } ${
      isRefinedMode 
        ? 'bg-[hsl(var(--streak-fire)/0.15)] border-[hsl(var(--streak-fire)/0.3)]' 
        : 'bg-gradient-to-br from-orange-500/20 to-red-500/20 border-orange-500/30'
    }`}>
      <Flame 
        className={`w-4 h-4 ${isRefinedMode ? 'text-[hsl(var(--streak-fire))]' : 'text-orange-500'}`} 
        fill="currentColor" 
      />
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
