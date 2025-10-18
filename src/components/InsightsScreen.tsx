import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Button } from "@/components/ui/button";
import { Scale, ChevronLeft, TrendingDown, TrendingUp, Target, Camera } from "lucide-react";
import { PremiumDiamond } from "@/components/ui/icons/PremiumDiamond";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, parseISO, startOfDay, differenceInDays, subMonths, subYears } from "date-fns";
import { useStreaks } from "@/hooks/useStreaks";
import { Flame, Trophy, Target as TargetIcon } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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

// Streak stat card component
const StreakStatCard = () => {
  const { data: stats } = useStreaks();
  
  const currentStreak = stats?.current_streak || 0;
  const longestStreak = stats?.longest_streak || 0;
  const totalLogged = stats?.total_doses_logged || 0;

  return (
    <>
      <Card className="p-3 bg-muted/30">
        <div className="flex items-center gap-1.5 mb-1">
          <Flame className="w-3.5 h-3.5 text-orange-500" fill="currentColor" />
          <p className="text-[10px] text-muted-foreground">Streak</p>
        </div>
        <p className="text-xl font-bold text-foreground">{currentStreak}</p>
        <p className="text-[9px] text-muted-foreground">days</p>
      </Card>
      
      <Card className="p-3 bg-muted/30">
        <div className="flex items-center gap-1.5 mb-1">
          <Trophy className="w-3.5 h-3.5 text-muted-foreground" />
          <p className="text-[10px] text-muted-foreground">Longest</p>
        </div>
        <p className="text-xl font-bold text-foreground">{longestStreak}</p>
        <p className="text-[9px] text-muted-foreground">days</p>
      </Card>
      
      <Card className="p-3 bg-muted/30">
        <div className="flex items-center gap-1.5 mb-1">
          <TargetIcon className="w-3.5 h-3.5 text-muted-foreground" />
          <p className="text-[10px] text-muted-foreground">Logged</p>
        </div>
        <p className="text-xl font-bold text-foreground">{totalLogged}</p>
        <p className="text-[9px] text-muted-foreground">total</p>
      </Card>
    </>
  );
};

export const InsightsScreen = () => {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<'1M' | '3M' | '6M' | 'ALL'>('1M');
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string; date: string } | null>(null);
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

  // Fetch ALL progress entries (weight + photos)
  const { data: entries = [], isLoading: entriesLoading } = useQuery({
    queryKey: ['progress-entries-insights'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('progress_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('entry_date', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Separate weight and photo entries
  const weightEntries = entries.filter(e => e.category === 'weight');
  const photoEntries = entries.filter(e => e.category === 'photo');

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
    
    console.log('Timeline calculation:', {
      timeRange,
      cutoffDate: format(cutoffDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
      totalEntries: weightEntries.length,
      entryDates: weightEntries.map(e => e.entry_date)
    });
    
    // Find the most recent weight entry BEFORE the cutoff date
    const entriesBeforeCutoff = weightEntries
      .filter(e => parseISO(e.entry_date) < cutoffDate)
      .sort((a, b) => parseISO(b.entry_date).getTime() - parseISO(a.entry_date).getTime());
    
    const lastWeightBeforeCutoff = entriesBeforeCutoff.length > 0 
      ? (entriesBeforeCutoff[0].metrics as any)?.weight 
      : undefined;
    
    // Generate continuous timeline from cutoffDate to today
    while (currentDate <= endDate) {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      const point: TimelineDataPoint = {
        date: format(currentDate, 'MMM d'),
        dateObj: new Date(currentDate),
      };
      
      // Add weight if exists for this date
      const weightEntry = weightEntries.find(e => e.entry_date === dateStr);
      if (weightEntry) {
        const metrics = weightEntry.metrics as any;
        if (metrics?.weight) {
          point.weight = metrics.weight;
        }
      }
      // Only add the carried weight to the FIRST point if no weight exists
      else if (dataArray.length === 0 && lastWeightBeforeCutoff !== undefined) {
        point.weight = lastWeightBeforeCutoff;
      }

      // Add photo marker if exists for this date
      const photoEntry = photoEntries.find(e => e.entry_date === dateStr);
      if (photoEntry) {
        point.hasPhoto = true;
        point.photoUrl = photoEntry.photo_url;
        point.photoId = photoEntry.id;
      }
      
      dataArray.push(point);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    console.log('Timeline data generated:', {
      totalPoints: dataArray.length,
      firstDate: dataArray[0]?.date,
      lastDate: dataArray[dataArray.length - 1]?.date,
      pointsWithWeight: dataArray.filter(p => p.weight !== undefined).length,
      firstWeight: dataArray[0]?.weight
    });
    
    return dataArray;
  }, [weightEntries, photoEntries, cutoffDate, timeRange]);

  // Helper to get public photo URL
  const getPhotoUrl = (photoUrl: string | null) => {
    if (!photoUrl) return null;
    const { data } = supabase.storage.from('progress-photos').getPublicUrl(photoUrl);
    return data.publicUrl;
  };

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

  // Calculate dashboard metrics - now filtered by timeline
  const dashboardMetrics = useMemo(() => {
    const weights = timelineData
      .map(d => d.weight)
      .filter((w): w is number => w !== undefined);
    
    if (weights.length === 0) return null;

    const currentWeight = weights[weights.length - 1];
    const oldestWeight = weights[0];
    const totalChange = currentWeight - oldestWeight;
    const percentChange = ((totalChange / oldestWeight) * 100);

    // Weekly average based on selected timeline range
    const timelineDays = differenceInDays(new Date(), cutoffDate);
    const avgWeight = weights.reduce((a, b) => a + b, 0) / weights.length;

    return {
      currentWeight,
      totalChange,
      percentChange,
      timelineAvg: avgWeight,
      timelineDays,
      goalWeight: null,
    };
  }, [timelineData, cutoffDate]);

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

      <div className="px-4 pt-4 space-y-4">
        {/* Adherence Stats */}
        <div>
          <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Adherence</h3>
          <div className="grid grid-cols-3 gap-2">
            <StreakStatCard />
          </div>
        </div>

        {/* Weight Stats - Timeline Dependent */}
        {dashboardMetrics && (
          <div>
            <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
              Weight Progress ({timeRange === 'ALL' ? 'All Time' : timeRange})
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <Card className="p-3 bg-muted/30">
                <div className="flex items-center gap-1.5 mb-1">
                  {dashboardMetrics.totalChange < 0 ? (
                    <TrendingDown className="w-3.5 h-3.5 text-muted-foreground" />
                  ) : (
                    <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                  <p className="text-[10px] text-muted-foreground">Change</p>
                </div>
                <p className="text-xl font-bold text-foreground">
                  {dashboardMetrics.totalChange > 0 ? '+' : ''}{Math.round(dashboardMetrics.totalChange)}
                </p>
                <p className="text-[9px] text-muted-foreground">lbs</p>
              </Card>
              
              <Card className="p-3 bg-muted/30">
                <div className="flex items-center gap-1.5 mb-1">
                  <Scale className="w-3.5 h-3.5 text-muted-foreground" />
                  <p className="text-[10px] text-muted-foreground">Current</p>
                </div>
                <p className="text-xl font-bold text-foreground">{Math.round(dashboardMetrics.currentWeight)}</p>
                <p className="text-[9px] text-muted-foreground">lbs</p>
              </Card>
              
              <Card className="p-3 bg-muted/30">
                <div className="flex items-center gap-1.5 mb-1">
                  <Target className="w-3.5 h-3.5 text-muted-foreground" />
                  <p className="text-[10px] text-muted-foreground">Average</p>
                </div>
                <p className="text-xl font-bold text-foreground">{Math.round(dashboardMetrics.timelineAvg)}</p>
                <p className="text-[9px] text-muted-foreground">lbs</p>
              </Card>
            </div>
          </div>
        )}

        {/* Timeline Selector */}
        <div>
          <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Timeline</h3>
          <div className="flex items-center gap-2">
            {(['1M', '3M', '6M', 'ALL'] as const).map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeRange(range)}
                className="flex-1 text-xs"
              >
                {range}
              </Button>
            ))}
          </div>
        </div>

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
                <h4 className="text-xs font-medium text-muted-foreground mb-2 ml-1">Weight</h4>
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
              
              {/* Photo Timeline - shown on all timelines */}
              {photoEntries.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-2 ml-1">Photos</h4>
                  <div className="flex-1 relative h-16 bg-muted/20 rounded-sm">
                    {photoEntries
                      .filter(entry => parseISO(entry.entry_date) >= cutoffDate)
                      .map((entry, idx) => {
                        const timelineIndex = timelineData.findIndex(
                          t => format(t.dateObj, 'yyyy-MM-dd') === entry.entry_date
                        );
                        
                        if (timelineIndex === -1) return null;
                        
                        const position = (timelineIndex / (timelineData.length - 1)) * 100;
                        const photoUrl = getPhotoUrl(entry.photo_url);
                        
                        return (
                          <div
                            key={entry.id}
                            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 cursor-pointer hover:scale-110 transition-transform"
                            style={{ left: `${position}%` }}
                            onClick={() => photoUrl && setSelectedPhoto({ 
                              url: photoUrl, 
                              date: format(parseISO(entry.entry_date), 'MMM d, yyyy') 
                            })}
                          >
                            {photoUrl ? (
                              <div className="w-8 h-8 rounded-sm border-2 border-primary bg-background overflow-hidden shadow-lg">
                                <img 
                                  src={photoUrl} 
                                  alt={`Progress photo ${format(parseISO(entry.entry_date), 'MMM d')}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-7 h-7 rounded-sm border-2 border-primary bg-primary/20 flex items-center justify-center">
                                <Camera className="w-3 h-3 text-primary" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Medication Dose Dots */}
              {compounds.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-2 ml-1">Medications</h4>
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
                </div>
              )}
              
              {/* Shared X-axis labels at bottom - evenly spaced */}
              <div className="relative h-8 mt-2">
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  {(() => {
                    const numLabels = 8;
                    const interval = Math.floor((timelineData.length - 1) / (numLabels - 1));
                    const labels = [];
                    
                    for (let i = 0; i < numLabels; i++) {
                      const idx = i === numLabels - 1 ? timelineData.length - 1 : i * interval;
                      if (idx < timelineData.length) {
                        labels.push(timelineData[idx].date);
                      }
                    }
                    
                    return labels.map((label, idx) => (
                      <span key={idx}>{label}</span>
                    ));
                  })()}
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      <BottomNavigation />
      
      {/* Simple Photo Preview Dialog */}
      {selectedPhoto && (
        <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
          <DialogContent className="max-w-[90vw] p-0">
            <div className="relative">
              <img 
                src={selectedPhoto.url} 
                alt={`Progress photo from ${selectedPhoto.date}`}
                className="w-full h-auto rounded-lg"
              />
              <p className="text-sm text-center text-muted-foreground mt-2 pb-2">{selectedPhoto.date}</p>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
