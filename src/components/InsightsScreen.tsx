import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Button } from "@/components/ui/button";
import { Scale, ChevronLeft, TrendingDown, TrendingUp, Target } from "lucide-react";
import { PremiumDiamond } from "@/components/ui/icons/PremiumDiamond";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, parseISO, startOfDay, differenceInDays, subMonths, subYears } from "date-fns";
import { 
  ComposedChart, 
  Line,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceArea,
} from 'recharts';

type TimelineDataPoint = {
  date: string;
  dateObj: Date;
  weight?: number;
  [key: string]: any; // For medication bars (med_0, med_1, etc.)
};

type MedicationPeriod = {
  name: string;
  startDate: Date;
  endDate: Date | null;
  color: string;
};

type DoseChange = {
  date: Date;
  dateFormatted: string;
  medicationName: string;
  amount: number;
  unit: string;
  color: string;
};

export const InsightsScreen = () => {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<'1M' | '3M' | '6M' | 'ALL'>('1M');
  const [isPremium] = useState(() => 
    localStorage.getItem('testPremiumMode') === 'true'
  );

  const MEDICATION_COLORS = [
    '#FF6F61', // coral
    '#8B5CF6', // purple  
    '#3B82F6', // blue
    '#10B981', // green
    '#F59E0B', // orange
    '#EC4899', // pink
  ];

  // Fetch weight entries
  const { data: entries = [], isLoading: entriesLoading } = useQuery({
    queryKey: ['progress-entries-insights'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('progress_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('category', 'weight')
        .order('entry_date', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
  });

  const { data: compounds = [], isLoading: compoundsLoading } = useQuery({
    queryKey: ['compounds-insights'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('compounds')
        .select('*')
        .eq('user_id', user.id)
        .order('start_date', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
  });

  const { data: doses = [], isLoading: dosesLoading } = useQuery({
    queryKey: ['doses-insights'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('doses')
        .select('*')
        .eq('user_id', user.id)
        .eq('taken', true)
        .order('taken_at', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
  });

  const isLoading = entriesLoading || compoundsLoading || dosesLoading;

  // Calculate date range
  const cutoffDate = useMemo(() => {
    const today = startOfDay(new Date());
    
    if (timeRange === 'ALL') {
      // Find the earliest date from both entries and doses
      const allDates: Date[] = [];
      
      entries.forEach(entry => {
        allDates.push(parseISO(entry.entry_date));
      });
      
      doses.forEach(dose => {
        if (dose.scheduled_date) {
          allDates.push(parseISO(dose.scheduled_date));
        }
      });
      
      compounds.forEach(compound => {
        allDates.push(parseISO(compound.start_date));
      });
      
      if (allDates.length === 0) {
        return subYears(today, 1); // Default to 1 year if no data
      }
      
      return startOfDay(new Date(Math.min(...allDates.map(d => d.getTime()))));
    }
    
    switch (timeRange) {
      case '1M': return subMonths(today, 1);
      case '3M': return subMonths(today, 3);
      case '6M': return subMonths(today, 6);
      default: return subMonths(today, 1);
    }
  }, [timeRange, entries, doses, compounds]);

  // Process medication periods and dose changes (including cycles) - MUST come before timelineData
  const { medicationPeriods, doseChanges } = useMemo(() => {
    const periods: MedicationPeriod[] = [];
    const changes: DoseChange[] = [];
    
    compounds.forEach((compound, idx) => {
      const color = MEDICATION_COLORS[idx % MEDICATION_COLORS.length];
      const startDate = parseISO(compound.start_date);
      const endDate = compound.end_date ? parseISO(compound.end_date) : null;
      
      // Calculate all periods (including cycle on/off periods)
      const activePeriods: Array<{ start: Date; end: Date | null }> = [];
      
      if (compound.has_cycles && compound.cycle_weeks_on && compound.cycle_weeks_off) {
        // Calculate cycle periods
        const cycleWeeksOn = compound.cycle_weeks_on;
        const cycleWeeksOff = compound.cycle_weeks_off;
        const cycleDuration = (cycleWeeksOn + cycleWeeksOff) * 7; // days
        
        let currentStart = startDate;
        const finalEnd = endDate || new Date();
        
        while (currentStart < finalEnd) {
          const currentEnd = new Date(currentStart);
          currentEnd.setDate(currentEnd.getDate() + (cycleWeeksOn * 7));
          
          activePeriods.push({
            start: currentStart,
            end: currentEnd > finalEnd ? finalEnd : currentEnd
          });
          
          // Move to next cycle start (after off period)
          currentStart = new Date(currentEnd);
          currentStart.setDate(currentStart.getDate() + (cycleWeeksOff * 7));
          
          if (currentStart >= finalEnd) break;
        }
      } else {
        // No cycles, just one continuous period
        activePeriods.push({ start: startDate, end: endDate });
      }
      
      // Add each active period
      activePeriods.forEach((period, periodIdx) => {
        if (!period.end || period.end >= cutoffDate) {
          periods.push({
            name: compound.name,
            startDate: period.start,
            endDate: period.end,
            color,
          });
          
          // Track dose changes for this period
          const compoundDoses = doses
            .filter(d => d.compound_id === compound.id && d.taken_at)
            .filter(d => {
              const doseDate = parseISO(d.taken_at!);
              return doseDate >= period.start && (!period.end || doseDate <= period.end);
            })
            .sort((a, b) => new Date(a.taken_at!).getTime() - new Date(b.taken_at!).getTime());
          
          // Add start dose marker for first period only
          if (periodIdx === 0 && period.start >= cutoffDate) {
            changes.push({
              date: period.start,
              dateFormatted: format(period.start, 'MMM d'),
              medicationName: compound.name,
              amount: compound.intended_dose,
              unit: compound.dose_unit,
              color,
            });
          }
          
          // Detect dose changes within this period
          let lastDose = compound.intended_dose;
          compoundDoses.forEach(dose => {
            const doseDate = parseISO(dose.taken_at!);
            if (dose.dose_amount !== lastDose && doseDate >= cutoffDate) {
              changes.push({
                date: doseDate,
                dateFormatted: format(doseDate, 'MMM d'),
                medicationName: compound.name,
                amount: dose.dose_amount,
                unit: dose.dose_unit,
                color,
              });
              lastDose = dose.dose_amount;
            }
          });
          
          // Add end marker if applicable
          if (period.end && period.end >= cutoffDate) {
            changes.push({
              date: period.end,
              dateFormatted: format(period.end, 'MMM d'),
              medicationName: `${compound.name} (End)`,
              amount: 0,
              unit: '',
              color,
            });
          }
        }
      });
    });
    
    return { medicationPeriods: periods, doseChanges: changes };
  }, [compounds, doses, cutoffDate, MEDICATION_COLORS]);

  // Create continuous timeline for full date range
  const timelineData = useMemo(() => {
    const dataArray: TimelineDataPoint[] = [];
    const endDate = startOfDay(new Date()); // Today at midnight
    let currentDate = new Date(cutoffDate);
    
    // Generate continuous timeline from cutoffDate to today
    while (currentDate <= endDate) {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      const point: TimelineDataPoint = {
        date: format(currentDate, 'MMM d'),
        dateObj: new Date(currentDate),
      };
      
      // Add weight if exists for this date
      const weightEntry = entries.find(e => e.entry_date === dateStr);
      if (weightEntry) {
        const metrics = weightEntry.metrics as any;
        if (metrics?.weight) {
          point.weight = metrics.weight;
        }
      }
      
      dataArray.push(point);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dataArray;
  }, [entries, cutoffDate]);

  // Get Y-axis domain for weight (no medication bar space needed)
  const weightDomain = useMemo(() => {
    const weights = timelineData
      .map(d => d.weight)
      .filter((w): w is number => w !== undefined);
    
    if (weights.length === 0) return [180, 250];
    
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    const padding = (max - min) * 0.1 || 10;
    
    return [Math.floor(min - padding), Math.ceil(max + padding)];
  }, [timelineData]);

  // Calculate dashboard metrics
  const dashboardMetrics = useMemo(() => {
    const weights = timelineData
      .map(d => d.weight)
      .filter((w): w is number => w !== undefined);
    
    if (weights.length === 0) return null;

    const currentWeight = weights[weights.length - 1];
    const oldestWeight = weights[0];
    const totalChange = currentWeight - oldestWeight;
    const percentChange = ((totalChange / oldestWeight) * 100);

    // Weekly average (last 7 days)
    const sevenDaysAgo = subDays(new Date(), 7);
    const recentWeights = timelineData
      .filter(d => d.dateObj >= sevenDaysAgo && d.weight)
      .map(d => d.weight!);
    const weeklyAvg = recentWeights.length > 0 
      ? recentWeights.reduce((a, b) => a + b, 0) / recentWeights.length 
      : currentWeight;

    return {
      currentWeight,
      totalChange,
      percentChange,
      weeklyAvg,
      goalWeight: null,
    };
  }, [timelineData]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as TimelineDataPoint;
      const activeMeds = medicationPeriods.filter(med => {
        const dataDate = startOfDay(data.dateObj);
        const start = startOfDay(med.startDate);
        const end = med.endDate ? startOfDay(med.endDate) : new Date();
        return dataDate >= start && dataDate <= end;
      });

      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg max-w-[200px]">
          <p className="font-semibold text-sm mb-2">{data.date}</p>
          {data.weight && (
            <p className="text-sm flex items-center gap-2 mb-2">
              <Scale className="w-3 h-3" />
              <span>{data.weight} lbs</span>
            </p>
          )}
          {activeMeds.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Active:</p>
              {activeMeds.map((med, idx) => (
                <div key={idx} className="flex items-center gap-1">
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: med.color }}
                  />
                  <span className="text-xs">{med.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background safe-top" style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' }}>
        <header className="sticky top-0 z-10 border-b border-border px-4 py-4 bg-background/95 backdrop-blur-sm safe-top">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <div className="absolute left-1/2 -translate-x-1/2">
              <h1 className="text-xl font-bold bg-gradient-to-r from-[#FF6F61] to-[#8B5CF6] bg-clip-text text-transparent">
                REGIMEN
              </h1>
            </div>
          </div>
        </header>
        <div className="p-4 space-y-4">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-20 bg-muted animate-pulse rounded-xl" />
            <div className="h-20 bg-muted animate-pulse rounded-xl" />
          </div>
          <div className="h-[400px] bg-muted animate-pulse rounded-xl" />
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background safe-top" style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' }}>
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border px-4 py-4 bg-background/95 backdrop-blur-sm safe-top">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
            <h1 className="text-xl font-bold bg-gradient-to-r from-[#FF6F61] to-[#8B5CF6] bg-clip-text text-transparent">
              REGIMEN
            </h1>
            {isPremium && (
              <PremiumDiamond className="h-5 w-5 text-primary" />
            )}
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Time Range Selector - at top since it affects both dashboard and chart */}
        <div className="flex gap-2">
          {[
            { value: '1M', label: '1 month' },
            { value: '3M', label: '3 months' },
            { value: '6M', label: '6 months' },
            { value: 'ALL', label: 'All Time' }
          ].map(option => (
            <button
              key={option.value}
              onClick={() => setTimeRange(option.value as any)}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeRange === option.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground hover:bg-muted/80'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Dashboard Metrics */}
        {dashboardMetrics && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">Progress</h2>
              <p className="text-xs text-muted-foreground">
                {format(timelineData[0]?.dateObj || new Date(), 'MMM d')} - {format(timelineData[timelineData.length - 1]?.dateObj || new Date(), 'MMM d')}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Card className="p-3 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                <div className="flex items-center gap-2 mb-1">
                  {dashboardMetrics.totalChange < 0 ? (
                    <TrendingDown className="w-4 h-4 text-primary" />
                  ) : (
                    <TrendingUp className="w-4 h-4 text-primary" />
                  )}
                  <p className="text-xs text-muted-foreground">Total change</p>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {dashboardMetrics.totalChange > 0 ? '+' : ''}{dashboardMetrics.totalChange.toFixed(1)} lb
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {dashboardMetrics.percentChange > 0 ? '+' : ''}{dashboardMetrics.percentChange.toFixed(1)}%
                </p>
              </Card>

              <Card className="p-3 bg-muted/30">
                <div className="flex items-center gap-2 mb-1">
                  <Scale className="w-4 h-4 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Current</p>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {dashboardMetrics.currentWeight.toFixed(1)} lb
                </p>
              </Card>

              <Card className="p-3 bg-muted/30">
                <div className="flex items-center gap-2 mb-1">
                  <Scale className="w-4 h-4 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Weekly avg</p>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {dashboardMetrics.weeklyAvg.toFixed(1)} lb
                </p>
              </Card>

              {dashboardMetrics.goalWeight && (
                <Card className="p-3 bg-muted/30">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="w-4 h-4 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Goal</p>
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {dashboardMetrics.goalWeight} lb
                  </p>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Unified Chart with shared timeline */}
        <Card className="p-4 bg-muted/30">
          <h3 className="text-sm font-semibold text-foreground mb-3">Progress Timeline</h3>
          {timelineData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[400px] text-center">
              <p className="text-muted-foreground text-sm mb-2">No data for this time range</p>
              <p className="text-xs text-muted-foreground">Log your weight or doses to see them here</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Weight Chart */}
              <div>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={timelineData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    hide
                    interval={0}
                  />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      domain={weightDomain}
                      width={50}
                      label={{ value: 'lbs', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: 'hsl(var(--muted-foreground))' } }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    
                    {/* Weight Line */}
                    <Line 
                      type="monotone" 
                      dataKey="weight" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3}
                      dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                      activeDot={{ r: 6 }}
                      connectNulls
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              
              {/* Medication Dose Dots */}
              {compounds.length > 0 && (
                <div className="space-y-2">
                  {compounds.map((compound, idx) => {
                    const color = MEDICATION_COLORS[idx % MEDICATION_COLORS.length];
                    
                    // Get all logged doses for this medication - use scheduled_date
                    const loggedDoses = doses
                      .filter(d => d.compound_id === compound.id && d.taken && d.scheduled_date)
                      .map(d => {
                        const doseDate = parseISO(d.scheduled_date);
                        return {
                          date: doseDate,
                          dateStr: d.scheduled_date,
                          amount: d.dose_amount,
                          unit: d.dose_unit,
                        };
                      })
                      .filter(d => d.date >= cutoffDate)
                      .sort((a, b) => a.date.getTime() - b.date.getTime());
                    
                    console.log(`${compound.name} logged doses:`, loggedDoses.length, loggedDoses.map(d => d.dateStr));
                    
                    if (loggedDoses.length === 0) return null;
                    
                    return (
                      <div key={compound.id} className="flex items-center gap-3">
                        <div className="w-24 flex-shrink-0">
                          <span className="text-xs font-medium text-foreground">{compound.name}</span>
                        </div>
                        <div className="flex-1 relative h-8 bg-muted/20 rounded-sm">
                          {loggedDoses.map((dose, doseIdx) => {
                            const timelineIndex = timelineData.findIndex(
                              t => format(t.dateObj, 'yyyy-MM-dd') === dose.dateStr
                            );
                            
                            console.log(`Dose ${doseIdx} (${dose.dateStr}): timeline index ${timelineIndex}`);
                            
                            if (timelineIndex === -1) {
                              console.warn(`No timeline point found for dose on ${dose.dateStr}`);
                              return null;
                            }
                            
                            const position = (timelineIndex / (timelineData.length - 1)) * 100;
                            
                            return (
                              <div
                                key={doseIdx}
                                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                                style={{ left: `${position}%` }}
                                title={`${format(dose.date, 'MMM d')}: ${dose.amount}${dose.unit}`}
                              >
                                <div
                                  className="w-2.5 h-2.5 rounded-full border-2 border-background"
                                  style={{ backgroundColor: color }}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }).filter(Boolean)}
                </div>
              )}
              
              {/* Shared X-axis labels at bottom - evenly spaced */}
              <div className="relative h-8 mt-2">
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  {(() => {
                    const numLabels = 8;
                    const interval = Math.floor(timelineData.length / numLabels);
                    return timelineData
                      .filter((_, idx) => idx % interval === 0 || idx === timelineData.length - 1)
                      .slice(0, numLabels)
                      .map((point, idx) => (
                        <span key={idx}>{point.date}</span>
                      ));
                  })()}
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      <BottomNavigation />
    </div>
  );
};
