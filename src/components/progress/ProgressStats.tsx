import { Card } from "@/components/ui/card";
import { differenceInDays } from "date-fns";
import { safeParseDate, safeFormatDate } from "@/utils/dateUtils";

interface ProgressStatsProps {
  weightEntries: any[];
  streakData: { current_streak?: number; longest_streak?: number } | null;
  goalWeight?: number;
  weightUnit?: string;
  onSetGoal?: () => void;
}

export const ProgressStats = ({ 
  weightEntries, 
  streakData,
  goalWeight,
  weightUnit = 'lbs',
  onSetGoal
}: ProgressStatsProps) => {
  // Get all weight entries sorted by date (most recent first)
  const sortedEntries = [...weightEntries].sort((a, b) => {
    const dateA = safeParseDate(b.entry_date);
    const dateB = safeParseDate(a.entry_date);
    if (!dateA || !dateB) return 0;
    return dateA.getTime() - dateB.getTime();
  });

  // Convert weight based on unit preference (stored in lbs)
  const convertWeight = (weightLbs: number) => {
    if (weightUnit === 'kg') {
      return Math.round((weightLbs / 2.20462) * 10) / 10;
    }
    return Math.round(weightLbs * 10) / 10;
  };

  const currentWeightLbs = sortedEntries[0]?.metrics?.weight;
  const startingWeightLbs = sortedEntries[sortedEntries.length - 1]?.metrics?.weight;
  const startDate = sortedEntries[sortedEntries.length - 1]?.entry_date;

  const currentWeight = currentWeightLbs ? convertWeight(currentWeightLbs) : null;
  const startingWeight = startingWeightLbs ? convertWeight(startingWeightLbs) : null;

  // Calculate absolute change
  const absoluteChange = startingWeight && currentWeight
    ? Math.round((currentWeight - startingWeight) * 10) / 10
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
    const weightChange = convertWeight(recentEntries[0].metrics.weight) - convertWeight(recentEntries[recentEntries.length - 1].metrics.weight);
    return Math.round((weightChange / daysBetween) * 7 * 10) / 10;
  })();

  // Calculate "To Goal" - how much left to reach goal
  const toGoal = goalWeight && currentWeightLbs
    ? Math.round((convertWeight(currentWeightLbs) - convertWeight(goalWeight)) * 10) / 10
    : null;

  if (!currentWeight) return null;

  // 4 stats in one row
  const stats = [
    {
      label: "Current",
      value: Math.round(currentWeight),
      unit: weightUnit,
    },
    {
      label: "Change",
      value: absoluteChange !== null ? `${absoluteChange > 0 ? '+' : ''}${absoluteChange}` : '--',
      unit: weightUnit,
    },
    {
      label: "Weekly",
      value: weeklyTrend !== null ? `${weeklyTrend >= 0 ? '+' : ''}${weeklyTrend}` : '--',
      unit: `${weightUnit}/wk`,
    },
    {
      label: "To Goal",
      value: toGoal !== null ? `${toGoal > 0 ? '' : '+'}${Math.abs(toGoal)}` : '--',
      unit: goalWeight ? weightUnit : '',
      isClickable: !goalWeight,
      onClick: onSetGoal,
      subtext: !goalWeight ? "Set goal" : undefined
    }
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {stats.map((stat, idx) => (
        <Card 
          key={idx} 
          className={`p-2 bg-card shadow-[var(--shadow-card)] ${stat.isClickable ? 'cursor-pointer hover:bg-muted/50' : ''}`}
          onClick={stat.isClickable ? stat.onClick : undefined}
        >
          <div className="space-y-0.5 text-center">
            <div className="text-[9px] text-muted-foreground uppercase tracking-wide">{stat.label}</div>
            <div className="flex items-baseline justify-center gap-0.5">
              {stat.subtext ? (
                <span className="text-xs text-primary font-medium">{stat.subtext}</span>
              ) : (
                <>
                  <span className="text-lg font-bold text-foreground">{stat.value}</span>
                  {stat.unit && <span className="text-[9px] text-muted-foreground">{stat.unit}</span>}
                </>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};