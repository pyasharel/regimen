import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Button } from "@/components/ui/button";
import { Scale, ChevronLeft, TrendingDown, TrendingUp, Target } from "lucide-react";
import { PremiumDiamond } from "@/components/ui/icons/PremiumDiamond";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, parseISO, startOfDay, differenceInDays } from "date-fns";
import { 
  ComposedChart, 
  Line, 
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
  const daysToShow = useMemo(() => {
    switch (timeRange) {
      case '1M': return 30;
      case '3M': return 90;
      case '6M': return 180;
      case 'ALL': return 3650; // 10 years
    }
  }, [timeRange]);

  const cutoffDate = subDays(new Date(), daysToShow);

  // Process weight data
  const timelineData = useMemo(() => {
    const dataMap = new Map<string, TimelineDataPoint>();

    entries.forEach(entry => {
      const metrics = entry.metrics as any;
      if (metrics?.weight) {
        const dateKey = entry.entry_date;
        dataMap.set(dateKey, {
          date: format(new Date(entry.entry_date), 'MMM d'),
          dateObj: new Date(entry.entry_date),
          weight: metrics.weight,
        });
      }
    });

    return Array.from(dataMap.values())
      .filter(d => d.dateObj >= cutoffDate)
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
  }, [entries, cutoffDate]);

  // Process medication periods and dose changes (including cycles)
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

  // Calculate dashboard metrics
  const dashboardMetrics = useMemo(() => {
    if (timelineData.length === 0) return null;

    const weights = timelineData.map(d => d.weight).filter((w): w is number => w !== undefined);
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
      goalWeight: null, // Future feature
    };
  }, [timelineData]);

  // Get Y-axis domain
  const weightDomain = useMemo(() => {
    const weights = timelineData.map(d => d.weight).filter((w): w is number => w !== undefined);
    if (weights.length === 0) return [0, 100];
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    const padding = (max - min) * 0.1 || 10;
    return [Math.floor(min - padding), Math.ceil(max + padding)];
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

        {/* Unified Timeline */}
        <Card className="p-4 bg-muted/30">
          <h3 className="text-sm font-semibold text-foreground mb-3">Progress Timeline</h3>
          {timelineData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[400px] text-center">
              <p className="text-muted-foreground text-sm mb-2">No weight data for this time range</p>
              <p className="text-xs text-muted-foreground">Log your weight on the Progress tab to see it here</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={timelineData} margin={{ top: 40, right: 10, bottom: 80, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    domain={weightDomain}
                    width={50}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  
                  {/* Medication bars as shaded areas at bottom */}
                  {(() => {
                    // Group periods by medication name
                    const medGroups = new Map<string, MedicationPeriod[]>();
                    medicationPeriods.forEach(period => {
                      if (!medGroups.has(period.name)) {
                        medGroups.set(period.name, []);
                      }
                      medGroups.get(period.name)!.push(period);
                    });
                    
                    const groupArray = Array.from(medGroups.entries());
                    const baseY = weightDomain[0];
                    const barHeight = (weightDomain[1] - weightDomain[0]) * 0.08; // 8% of chart height per medication
                    
                    return groupArray.map(([medName, periods], groupIdx) => (
                      periods.map((med, periodIdx) => {
                        const startFormatted = format(med.startDate, 'MMM d');
                        const endFormatted = med.endDate 
                          ? format(med.endDate, 'MMM d') 
                          : format(timelineData[timelineData.length - 1]?.dateObj || new Date(), 'MMM d');
                        
                        const yPos = baseY + (groupIdx * barHeight * 1.3);
                        
                        return (
                          <ReferenceArea
                            key={`${medName}-${periodIdx}`}
                            x1={startFormatted}
                            x2={endFormatted}
                            y1={yPos}
                            y2={yPos + barHeight}
                            fill={med.color}
                            fillOpacity={0.6}
                            stroke={med.color}
                            strokeOpacity={0.8}
                            strokeWidth={2}
                            ifOverflow="visible"
                          />
                        );
                      })
                    ));
                  })()}
                  
                  {/* Weight Line - rendered last so it's on top */}
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
              
              {/* Medication Legend with dose info */}
              {medicationPeriods.length > 0 && (
                <div className="mt-4 space-y-2">
                  {(() => {
                    const medGroups = new Map<string, { color: string; periods: MedicationPeriod[] }>();
                    medicationPeriods.forEach(period => {
                      if (!medGroups.has(period.name)) {
                        medGroups.set(period.name, { color: period.color, periods: [] });
                      }
                      medGroups.get(period.name)!.periods.push(period);
                    });
                    
                    return Array.from(medGroups.entries()).map(([medName, { color, periods }]) => {
                      const medDoseChanges = doseChanges.filter(dc => dc.medicationName.startsWith(medName));
                      
                      return (
                        <div key={medName} className="flex items-start gap-2 text-xs">
                          <div 
                            className="w-3 h-3 rounded-full mt-0.5 flex-shrink-0" 
                            style={{ backgroundColor: color }}
                          />
                          <div>
                            <span className="font-medium text-foreground">{medName}</span>
                            {medDoseChanges.length > 0 && (
                              <span className="text-muted-foreground ml-1">
                                ({medDoseChanges.filter(dc => dc.amount > 0).map(dc => `${dc.amount}${dc.unit}`).join(' → ')})
                              </span>
                            )}
                            {periods.length > 1 && (
                              <span className="text-muted-foreground ml-1">
                                • {periods.length} cycles
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </>
          )}
        </Card>
      </div>

      <BottomNavigation />
    </div>
  );
};
