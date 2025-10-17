import { useStreaks, getStreakMessage, getMissedStreakMessage } from "@/hooks/useStreaks";
import { Card } from "@/components/ui/card";
import { Flame, Trophy, Target } from "lucide-react";
import { differenceInDays } from "date-fns";

export const StreakCard = () => {
  const { data: stats, isLoading } = useStreaks();

  if (isLoading) {
    return (
      <Card className="p-3 bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/20">
        <div className="h-16 animate-pulse bg-muted rounded" />
      </Card>
    );
  }

  const currentStreak = stats?.current_streak || 0;
  const longestStreak = stats?.longest_streak || 0;
  const totalLogged = stats?.total_doses_logged || 0;
  
  const daysSinceLastCheckIn = stats?.last_check_in_date 
    ? differenceInDays(new Date(), new Date(stats.last_check_in_date))
    : null;
  
  const isStreakActive = daysSinceLastCheckIn !== null && daysSinceLastCheckIn <= 1;

  return (
    <Card className="p-3 bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/20">
      <div className="space-y-3">
        {/* Main Streak Display */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-500">
            <Flame className="w-5 h-5 text-white" fill="white" />
          </div>
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-foreground">{currentStreak}</span>
              <span className="text-xs text-muted-foreground">day streak</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {isStreakActive 
                ? getStreakMessage(currentStreak)
                : daysSinceLastCheckIn !== null 
                  ? getMissedStreakMessage(daysSinceLastCheckIn)
                  : "Start your streak today!"
              }
            </p>
          </div>
        </div>

        {/* Compact Stats Grid */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
          <div className="flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-orange-500" />
            <div>
              <div className="text-base font-semibold text-foreground">{longestStreak}</div>
              <div className="text-[10px] text-muted-foreground">Longest</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-orange-500" />
            <div>
              <div className="text-base font-semibold text-foreground">{totalLogged}</div>
              <div className="text-[10px] text-muted-foreground">Total Logged</div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
