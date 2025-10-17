import { useStreaks, getStreakMessage, getMissedStreakMessage } from "@/hooks/useStreaks";
import { Card } from "@/components/ui/card";
import { Flame, Trophy, Target } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";

export const StreakCard = () => {
  const { data: stats, isLoading } = useStreaks();

  if (isLoading) {
    return (
      <Card className="p-6 animate-pulse">
        <div className="h-24 bg-muted rounded" />
      </Card>
    );
  }

  if (!stats) return null;

  const currentStreak = stats.current_streak || 0;
  const longestStreak = stats.longest_streak || 0;
  const totalLogged = stats.total_doses_logged || 0;

  // Calculate if streak is broken
  const daysSinceLastCheckIn = stats.last_check_in_date
    ? differenceInDays(new Date(), parseISO(stats.last_check_in_date))
    : null;

  const isStreakActive = daysSinceLastCheckIn !== null && daysSinceLastCheckIn <= 1;

  return (
    <Card className="p-6 bg-gradient-to-br from-background via-background to-primary/5">
      <div className="space-y-6">
        {/* Main Streak Display */}
        <div className="text-center space-y-2">
          {isStreakActive ? (
            <>
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-orange-500/20 to-red-500/20 border-2 border-orange-500/30">
                <Flame className="h-10 w-10 text-orange-500" fill="currentColor" />
              </div>
              <h3 className="text-4xl font-bold text-foreground">{currentStreak}</h3>
              <p className="text-sm text-muted-foreground">
                {getStreakMessage(currentStreak)}
              </p>
            </>
          ) : (
            <>
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted border-2 border-border">
                <Flame className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-2xl font-semibold text-muted-foreground">
                {currentStreak > 0 ? `${currentStreak} day streak ended` : "No active streak"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {daysSinceLastCheckIn !== null
                  ? getMissedStreakMessage(daysSinceLastCheckIn)
                  : "Start your streak today!"}
              </p>
            </>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-1.5 text-primary">
              <Trophy className="h-4 w-4" />
              <span className="text-2xl font-bold">{longestStreak}</span>
            </div>
            <p className="text-xs text-muted-foreground">Longest Streak</p>
          </div>
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-1.5 text-primary">
              <Target className="h-4 w-4" />
              <span className="text-2xl font-bold">{totalLogged}</span>
            </div>
            <p className="text-xs text-muted-foreground">Total Logged</p>
          </div>
        </div>

        {/* Milestone Progress */}
        {isStreakActive && currentStreak > 0 && (
          <div className="space-y-2 pt-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Next milestone</span>
              <span className="font-medium">
                {currentStreak < 7
                  ? `${7 - currentStreak} days to 1 week`
                  : currentStreak < 14
                  ? `${14 - currentStreak} days to 2 weeks`
                  : currentStreak < 30
                  ? `${30 - currentStreak} days to 1 month`
                  : currentStreak < 60
                  ? `${60 - currentStreak} days to 2 months`
                  : currentStreak < 90
                  ? `${90 - currentStreak} days to 3 months`
                  : "Champion status! 🏆"}
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-500"
                style={{
                  width: `${
                    currentStreak < 7
                      ? (currentStreak / 7) * 100
                      : currentStreak < 14
                      ? ((currentStreak - 7) / 7) * 100
                      : currentStreak < 30
                      ? ((currentStreak - 14) / 16) * 100
                      : currentStreak < 60
                      ? ((currentStreak - 30) / 30) * 100
                      : currentStreak < 90
                      ? ((currentStreak - 60) / 30) * 100
                      : 100
                  }%`,
                }}
              />
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
