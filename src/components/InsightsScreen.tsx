import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Button } from "@/components/ui/button";
import { Scale, ChevronLeft, TrendingDown, TrendingUp, Target } from "lucide-react";
import { PremiumDiamond } from "@/components/ui/icons/PremiumDiamond";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, parseISO, startOfDay } from "date-fns";
import { 
  ComposedChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  Label as RechartsLabel
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

  // Process medication periods and dose changes
  const { medicationPeriods, doseChanges } = useMemo(() => {
    const periods: MedicationPeriod[] = [];
    const changes: DoseChange[] = [];
    
    compounds.forEach((compound, idx) => {
      const color = MEDICATION_COLORS[idx % MEDICATION_COLORS.length];
      const startDate = parseISO(compound.start_date);
      const endDate = compound.end_date ? parseISO(compound.end_date) : null;
      
      // Only show if it overlaps with our time range
      if (!endDate || endDate >= cutoffDate) {
        periods.push({
          name: compound.name,
          startDate,
          endDate,
          color,
        });

        // Track dose changes for this compound from the doses table
        const compoundDoses = doses
          .filter(d => d.compound_id === compound.id && d.taken_at)
          .sort((a, b) => new Date(a.taken_at!).getTime() - new Date(b.taken_at!).getTime());

        // Add start dose marker
        if (startDate >= cutoffDate) {
          changes.push({
            date: startDate,
            dateFormatted: format(startDate, 'MMM d'),
            medicationName: compound.name,
            amount: compound.intended_dose,
            unit: compound.dose_unit,
            color,
          });
        }

        // Detect dose changes
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
        if (endDate && endDate >= cutoffDate) {
          changes.push({
            date: endDate,
            dateFormatted: format(endDate, 'MMM d'),
            medicationName: `${compound.name} (End)`,
            amount: 0,
            unit: '',
            color,
          });
        }
      }
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

        {/* Chart */}
        <Card className="p-4 bg-muted/30">
          {timelineData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[400px] text-center">
              <p className="text-muted-foreground text-sm mb-2">No weight data for this time range</p>
              <p className="text-xs text-muted-foreground">Log your weight on the Progress tab to see it here</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={timelineData} margin={{ top: 40, right: 10, bottom: 20, left: -20 }}>
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
                
                {/* Medication period shaded areas */}
                {medicationPeriods.map((med, idx) => {
                  const startFormatted = format(med.startDate, 'MMM d');
                  const endFormatted = med.endDate ? format(med.endDate, 'MMM d') : format(timelineData[timelineData.length - 1]?.dateObj || new Date(), 'MMM d');
                  
                  return (
                    <ReferenceArea
                      key={`med-area-${idx}`}
                      x1={startFormatted}
                      x2={endFormatted}
                      fill={med.color}
                      fillOpacity={0.1}
                      stroke={med.color}
                      strokeOpacity={0.3}
                      strokeWidth={1}
                      strokeDasharray="3 3"
                    />
                  );
                })}
                
                {/* Medication start markers */}
                {medicationPeriods.map((med, idx) => {
                  const start = format(med.startDate, 'MMM d');
                  
                  return (
                    <ReferenceLine
                      key={`med-start-${idx}`}
                      x={start}
                      stroke={med.color}
                      strokeWidth={2}
                      strokeDasharray="3 3"
                      label={
                        <RechartsLabel
                          value={med.name}
                          position="top"
                          fill={med.color}
                          fontSize={10}
                          fontWeight={600}
                        />
                      }
                    />
                  );
                })}

                {/* Dose change markers */}
                {doseChanges.map((change, idx) => (
                  <ReferenceLine
                    key={`dose-change-${idx}`}
                    x={change.dateFormatted}
                    stroke={change.color}
                    strokeWidth={1}
                    strokeDasharray="2 2"
                    label={
                      change.amount > 0 ? (
                        <RechartsLabel
                          value={`${change.amount}${change.unit}`}
                          position="top"
                          fill={change.color}
                          fontSize={9}
                          fontWeight={500}
                          offset={10}
                        />
                      ) : undefined
                    }
                  />
                ))}
                
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
          )}
        </Card>

        {/* Medication Legend */}
        {medicationPeriods.length > 0 && (
          <Card className="p-3 bg-muted/30">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Medications
            </p>
            <div className="flex flex-wrap gap-3">
              {medicationPeriods.map((med, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full border-2" 
                    style={{ 
                      backgroundColor: med.color,
                      borderColor: med.color 
                    }}
                  />
                  <span className="text-xs text-foreground">{med.name}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
};
