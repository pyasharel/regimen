import { Card } from "@/components/ui/card";
import { differenceInDays } from "date-fns";
import { safeParseDate, safeFormatDate } from "@/utils/dateUtils";

interface ProgressStatsProps {
  weightEntries: any[];
  streakData: { current_streak?: number; longest_streak?: number } | null;
  userHeight?: number | null; // in inches
  goalWeight?: number | null;
  onSetGoal?: () => void;
  onSetHeight?: () => void;
}

export const ProgressStats = ({ 
  weightEntries, 
  streakData, 
  userHeight, 
  goalWeight,
  onSetGoal,
  onSetHeight
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

  // Calculate BMI
  const bmi = userHeight && currentWeight
    ? (currentWeight / (userHeight * userHeight)) * 703
    : null;

  // Calculate goal progress
  const goalProgress = goalWeight && startingWeight && currentWeight
    ? Math.min(100, Math.max(0, ((startingWeight - currentWeight) / (startingWeight - goalWeight)) * 100))
    : null;

  if (!currentWeight) return null;

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
    ...(goalWeight && goalProgress !== null ? [{
      label: "Goal",
      value: Math.round(goalProgress),
      unit: "%",
      subtext: `→ ${goalWeight} lbs`
    }] : [{
      label: "Goal",
      value: "--",
      unit: "",
      subtext: "Set goal",
      isLink: true,
      onClick: onSetGoal
    }]),
    ...(bmi !== null ? [{
      label: "BMI",
      value: bmi.toFixed(1),
      unit: "",
      subtext: bmi < 18.5 ? 'Under' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Over' : 'Obese'
    }] : [{
      label: "BMI",
      value: "--",
      unit: "",
      subtext: "Add height",
      isLink: true,
      onClick: onSetHeight
    }]),
    {
      label: "Streak",
      value: streakData?.current_streak || 0,
      unit: "days",
      subtext: `Best: ${streakData?.longest_streak || 0}`
    }
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {stats.map((stat, idx) => (
        <Card 
          key={idx} 
          className="p-2.5 bg-card border border-border"
          onClick={stat.onClick}
          style={{ cursor: stat.isLink ? 'pointer' : 'default' }}
        >
          <div className="space-y-0.5">
            <div className="text-[9px] text-muted-foreground uppercase tracking-wide truncate">{stat.label}</div>
            <div className="flex items-baseline gap-0.5">
              <span className="text-lg font-bold text-foreground">{stat.value}</span>
              {stat.unit && <span className="text-[9px] text-muted-foreground">{stat.unit}</span>}
            </div>
            {stat.subtext && (
              <div className={`text-[8px] truncate ${stat.isLink ? 'text-primary' : 'text-muted-foreground'}`}>
                {stat.subtext}
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
};