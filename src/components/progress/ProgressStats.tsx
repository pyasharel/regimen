import { Card } from "@/components/ui/card";
import { differenceInDays } from "date-fns";
import { safeParseDate, safeFormatDate } from "@/utils/dateUtils";

interface ProgressStatsProps {
  weightEntries: any[];
  streakData: { current_streak?: number; longest_streak?: number } | null;
  goalWeight?: number;
  weightUnit?: string;
}

export const ProgressStats = ({ 
  weightEntries, 
  streakData,
  goalWeight,
  weightUnit = 'lbs'
}: ProgressStatsProps) => {
  // Get all weight entries sorted by date (most recent first)
  const sortedEntries = [...weightEntries].sort((a, b) => {
    const dateA = safeParseDate(b.entry_date);
    const dateB = safeParseDate(a.entry_date);
    if (!dateA || !dateB) return 0;
    return dateA.getTime() - dateB.getTime();
  });

  const currentWeight = sortedEntries[0]?.metrics?.weight;
  const startingWeight = sortedEntries[sortedEntries.length - 1]?.metrics?.weight;
  const startDate = sortedEntries[sortedEntries.length - 1]?.entry_date;

  // Calculate absolute change (in lbs/kg)
  const absoluteChange = startingWeight && currentWeight
    ? currentWeight - startingWeight
    : null;

  // Calculate weekly trend
  const weeklyTrend = (() => {
    if (sortedEntries.length < 2) return null;
    const recentEntries = sortedEntries.slice(0, Math.min(4, sortedEntries.length));
    const firstDate = safeParseDate(recentEntries[0].entry_date);
    const lastDate = safeParseDate(recentEntries[recentEntries.length - 1].entry_date);
    const daysBetween = firstDate && lastDate 
      ? Math.max(1, differenceInDays(firstDate, lastDate))
      : 1;
    const weightChange = recentEntries[0].metrics.weight - recentEntries[recentEntries.length - 1].metrics.weight;
    return (weightChange / daysBetween) * 7;
  })();

  // Calculate "To Goal" - how much left to reach goal
  const toGoal = goalWeight && currentWeight
    ? currentWeight - goalWeight
    : null;

  if (!currentWeight) return null;

  // 2x2 layout like reference image
  const stats = [
    {
      label: "Current Weight",
      value: Math.round(currentWeight),
      unit: weightUnit,
      subtext: sortedEntries[0] && safeFormatDate(sortedEntries[0].entry_date, 'MMM d')
    },
    {
      label: "Total Change",
      value: absoluteChange !== null ? `${absoluteChange > 0 ? '+' : ''}${Math.round(absoluteChange)}` : '--',
      unit: weightUnit,
      subtext: startDate ? `Since ${safeFormatDate(startDate, 'MMM d')}` : undefined
    },
    {
      label: "Weekly Trend",
      value: weeklyTrend !== null ? `${weeklyTrend >= 0 ? '+' : ''}${weeklyTrend.toFixed(1)}` : '--',
      unit: `${weightUnit}/wk`,
      subtext: sortedEntries.length >= 2 ? `Last ${Math.min(4, sortedEntries.length)} entries` : undefined
    },
    // Show "To Goal" if goal is set, otherwise show streak
    goalWeight ? {
      label: "To Goal",
      value: toGoal !== null ? `${toGoal > 0 ? '' : '+'}${Math.abs(Math.round(toGoal))}` : '--',
      unit: weightUnit,
      subtext: `Goal: ${goalWeight} ${weightUnit}`
    } : {
      label: "Current Streak",
      value: streakData?.current_streak || 0,
      unit: "days",
      subtext: `Best: ${streakData?.longest_streak || 0} days`
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map((stat, idx) => (
        <Card 
          key={idx} 
          className="p-3 bg-card border border-border"
        >
          <div className="space-y-1">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{stat.label}</div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-foreground">{stat.value}</span>
              {stat.unit && <span className="text-xs text-muted-foreground">{stat.unit}</span>}
            </div>
            {stat.subtext && (
              <div className="text-[10px] text-muted-foreground">
                {stat.subtext}
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
};