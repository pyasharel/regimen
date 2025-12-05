import { Card } from "@/components/ui/card";
import { differenceInDays } from "date-fns";
import { safeParseDate, safeFormatDate } from "@/utils/dateUtils";

interface ProgressStatsProps {
  weightEntries: any[];
  streakData: { current_streak?: number; longest_streak?: number } | null;
}

export const ProgressStats = ({ 
  weightEntries, 
  streakData
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

  // Calculate % change
  const percentChange = startingWeight && currentWeight
    ? ((currentWeight - startingWeight) / startingWeight) * 100
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

  if (!currentWeight) return null;

  // Pared down to 4 core stats
  const stats = [
    {
      label: "Current",
      value: Math.round(currentWeight),
      unit: "lbs",
      subtext: sortedEntries[0] && safeFormatDate(sortedEntries[0].entry_date, 'MMM d')
    },
    {
      label: "Change",
      value: percentChange !== null ? `${percentChange > 0 ? '+' : ''}${percentChange.toFixed(1)}` : '--',
      unit: "%",
      subtext: startingWeight ? `from ${Math.round(startingWeight)}` : undefined
    },
    {
      label: "Weekly",
      value: weeklyTrend !== null ? `${weeklyTrend >= 0 ? '+' : ''}${weeklyTrend.toFixed(1)}` : '--',
      unit: "lbs/wk",
      subtext: sortedEntries.length >= 2 ? `${Math.min(4, sortedEntries.length)} entries` : undefined
    },
    {
      label: "Streak",
      value: streakData?.current_streak || 0,
      unit: "days",
      subtext: `Best: ${streakData?.longest_streak || 0}`
    }
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {stats.map((stat, idx) => (
        <Card 
          key={idx} 
          className="p-2 bg-card border border-border"
        >
          <div className="space-y-0.5">
            <div className="text-[9px] text-muted-foreground uppercase tracking-wide truncate">{stat.label}</div>
            <div className="flex items-baseline gap-0.5">
              <span className="text-base font-bold text-foreground">{stat.value}</span>
              {stat.unit && <span className="text-[8px] text-muted-foreground">{stat.unit}</span>}
            </div>
            {stat.subtext && (
              <div className="text-[8px] text-muted-foreground truncate">
                {stat.subtext}
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
};