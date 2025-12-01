import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, TrendingUp, TrendingDown, Layers } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getSignedUrl } from "@/utils/storageUtils";
import { format, parseISO, startOfDay, differenceInDays, subMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { formatDose } from "@/utils/doseUtils";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from 'recharts';
import logoHorizontal from "@/assets/logo-regimen-horizontal-final.png";

type TimelineDataPoint = {
  date: string;
  dateObj: Date;
  weight?: number;
};

type DosageMarker = {
  date: Date;
  dateFormatted: string;
  medicationName: string;
  amount: number;
  unit: string;
  color: string;
  compoundId: string;
};

export const InsightsScreen = () => {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<'3M' | '6M' | 'ALL'>('6M');
  const [selectedCompoundId, setSelectedCompoundId] = useState<string | 'all'>('all');
  const [stackView, setStackView] = useState(false);

  // Medication colors from design system
  const MEDICATION_COLORS = [
    'hsl(6 100% 69%)',      // coral (primary)
    'hsl(258 90% 66%)',     // purple (secondary)
    'hsl(217 91% 60%)',     // blue
    'hsl(142 71% 45%)',     // green (success)
    'hsl(25 95% 53%)',      // orange
    'hsl(330 81% 60%)',     // pink
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
        .order('entry_date', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  const weightEntries = entries.filter(e => (e.metrics as any)?.weight);

  // Fetch compounds
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

  // Fetch doses
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

  // Calculate cutoff date based on time range
  const cutoffDate = useMemo(() => {
    const now = new Date();
    switch (timeRange) {
      case '3M':
        return subMonths(now, 3);
      case '6M':
        return subMonths(now, 6);
      case 'ALL':
        return new Date(0); // Beginning of time
      default:
        return subMonths(now, 6);
    }
  }, [timeRange]);

  // Calculate dosage changes and markers
  const dosageMarkers = useMemo(() => {
    const markers: DosageMarker[] = [];

    compounds.forEach((compound, idx) => {
      const color = MEDICATION_COLORS[idx % MEDICATION_COLORS.length];
      const compoundDoses = doses
        .filter(d => d.compound_id === compound.id)
        .sort((a, b) => new Date(a.taken_at!).getTime() - new Date(b.taken_at!).getTime());

      if (compoundDoses.length === 0) return;

      // Track dose changes
      let lastDoseAmount = compoundDoses[0].dose_amount;
      let lastDoseUnit = compoundDoses[0].dose_unit;

      // Add first dose as a marker
      const firstDose = compoundDoses[0];
      const firstDate = parseISO(firstDose.taken_at!);
      if (firstDate >= cutoffDate) {
        markers.push({
          date: firstDate,
          dateFormatted: format(firstDate, 'MMM d'),
          medicationName: compound.name,
          amount: firstDose.dose_amount,
          unit: firstDose.dose_unit,
          color,
          compoundId: compound.id,
        });
      }

      // Find dose changes
      compoundDoses.forEach(dose => {
        const doseDate = parseISO(dose.taken_at!);
        if (doseDate < cutoffDate) return;

        if (dose.dose_amount !== lastDoseAmount || dose.dose_unit !== lastDoseUnit) {
          markers.push({
            date: doseDate,
            dateFormatted: format(doseDate, 'MMM d'),
            medicationName: compound.name,
            amount: dose.dose_amount,
            unit: dose.dose_unit,
            color,
            compoundId: compound.id,
          });
          lastDoseAmount = dose.dose_amount;
          lastDoseUnit = dose.dose_unit;
        }
      });
    });

    return markers.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [compounds, doses, cutoffDate]);

  // Filter markers based on selected compound
  const filteredMarkers = useMemo(() => {
    if (selectedCompoundId === 'all' || stackView) {
      return dosageMarkers;
    }
    return dosageMarkers.filter(m => m.compoundId === selectedCompoundId);
  }, [dosageMarkers, selectedCompoundId, stackView]);

  // Prepare chart data
  const chartData = useMemo(() => {
    const filteredWeightEntries = weightEntries.filter(e => {
      const entryDate = parseISO(e.entry_date);
      return entryDate >= cutoffDate;
    });

    return filteredWeightEntries.map(entry => ({
      date: format(parseISO(entry.entry_date), 'MMM d'),
      dateObj: parseISO(entry.entry_date),
      weight: (entry.metrics as any)?.weight,
    }));
  }, [weightEntries, cutoffDate]);

  // Calculate weight stats
  const weightStats = useMemo(() => {
    if (chartData.length === 0) return { current: 0, change: 0, trend: 'stable' as const };

    const current = chartData[chartData.length - 1]?.weight || 0;
    const first = chartData[0]?.weight || 0;
    const change = current - first;
    const trend = change < -1 ? 'down' : change > 1 ? 'up' : 'stable';

    return { current, change, trend };
  }, [chartData]);

  // Y-axis domain for better visualization
  const weightDomain = useMemo(() => {
    if (chartData.length === 0) return [0, 100];
    const weights = chartData.map(d => d.weight).filter(Boolean) as number[];
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    const padding = (max - min) * 0.15 || 10;
    return [Math.floor(min - padding), Math.ceil(max + padding)];
  }, [chartData]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload[0]) return null;

    const data = payload[0].payload;
    const markersOnThisDate = filteredMarkers.filter(
      m => format(m.date, 'MMM d') === data.date
    );

    return (
      <Card className="p-3 shadow-elevated">
        <p className="text-xs font-medium text-muted-foreground mb-2">{data.date}</p>
        {data.weight && (
          <p className="text-sm font-semibold text-foreground mb-2">
            {data.weight.toFixed(1)} lbs
          </p>
        )}
        {markersOnThisDate.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-border">
            {markersOnThisDate.map((marker, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: marker.color }}
                />
                <div className="text-xs">
                  <p className="font-medium text-foreground">{marker.medicationName}</p>
                  <p className="text-muted-foreground">{formatDose(marker.amount, marker.unit)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <header className="border-b border-border px-4 mt-6 bg-background sticky top-0 flex-shrink-0 z-10 h-16 flex items-center">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 flex justify-center">
            <Skeleton className="h-8 w-32" />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>

        <BottomNavigation />
      </div>
    );
  }

  const hasData = chartData.length > 0 && compounds.length > 0;

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-4 mt-6 bg-background sticky top-0 flex-shrink-0 z-10 h-16 flex items-center">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 flex justify-center">
          <img src={logoHorizontal} alt="Regimen" className="h-7" />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto pb-24">
        {/* Hero Section */}
        <div className="px-4 pt-6 pb-4">
          <h1 className="text-2xl font-bold text-foreground mb-1">
            Your Journey
          </h1>
          <p className="text-sm text-muted-foreground">
            Track your progress and medication milestones
          </p>
        </div>

        {!hasData ? (
          <div className="px-4 pt-12">
            <Card className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-muted/50 mx-auto mb-4 flex items-center justify-center">
                <TrendingUp className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No Data Yet
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                Start logging your weight and medications to see your journey visualized here.
              </p>
              <Button onClick={() => navigate('/progress')}>
                Go to Progress
              </Button>
            </Card>
          </div>
        ) : (
          <div className="px-4 space-y-6">
            {/* Current Stats Card */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Current Weight</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold text-foreground">
                      {weightStats.current.toFixed(1)}
                    </p>
                    <p className="text-sm text-muted-foreground">lbs</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={cn(
                    "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                    weightStats.trend === 'down' && "bg-success/10 text-success",
                    weightStats.trend === 'up' && "bg-destructive/10 text-destructive",
                    weightStats.trend === 'stable' && "bg-muted text-muted-foreground"
                  )}>
                    {weightStats.trend === 'down' && <TrendingDown className="w-3 h-3" />}
                    {weightStats.trend === 'up' && <TrendingUp className="w-3 h-3" />}
                    {weightStats.change !== 0 ? (
                      <span>{weightStats.change > 0 ? '+' : ''}{weightStats.change.toFixed(1)} lbs</span>
                    ) : (
                      <span>No change</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {timeRange === '3M' ? 'Last 3 months' : timeRange === '6M' ? 'Last 6 months' : 'All time'}
                  </p>
                </div>
              </div>
            </Card>

            {/* Controls */}
            <div className="space-y-3">
              {/* Time Range Selector */}
              <div className="flex items-center gap-2">
                {(['3M', '6M', 'ALL'] as const).map((range) => (
                  <Button
                    key={range}
                    variant={timeRange === range ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTimeRange(range)}
                    className="flex-1"
                  >
                    {range === 'ALL' ? 'All' : range}
                  </Button>
                ))}
              </div>

              {/* Medication Selector & Stack View Toggle */}
              <div className="flex items-center gap-3">
                <Select
                  value={selectedCompoundId}
                  onValueChange={setSelectedCompoundId}
                  disabled={stackView}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select medication" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Medications</SelectItem>
                    {compounds.map(compound => (
                      <SelectItem key={compound.id} value={compound.id}>
                        {compound.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg bg-card">
                  <Layers className="w-4 h-4 text-muted-foreground" />
                  <Switch
                    checked={stackView}
                    onCheckedChange={(checked) => {
                      setStackView(checked);
                      if (checked) setSelectedCompoundId('all');
                    }}
                    id="stack-view"
                  />
                  <Label
                    htmlFor="stack-view"
                    className="text-xs text-muted-foreground cursor-pointer whitespace-nowrap"
                  >
                    Stack
                  </Label>
                </div>
              </div>
            </div>

            {/* Chart */}
            <Card className="p-4">
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 20, right: 10, left: 0, bottom: 20 }}>
                    <defs>
                      <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(6 100% 69%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(258 90% 66%)" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis
                      dataKey="date"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis
                      domain={weightDomain}
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(value) => `${value}`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="weight"
                      stroke="url(#weightGradient)"
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 6, fill: 'hsl(6 100% 69%)' }}
                    />

                    {/* Dosage Markers */}
                    {filteredMarkers.map((marker, idx) => {
                      const dataPoint = chartData.find(
                        d => format(d.dateObj, 'MMM d') === marker.dateFormatted
                      );
                      if (!dataPoint || !dataPoint.weight) return null;

                      return (
                        <ReferenceDot
                          key={`${marker.compoundId}-${idx}`}
                          x={marker.dateFormatted}
                          y={dataPoint.weight}
                          r={8}
                          fill={marker.color}
                          stroke="hsl(var(--background))"
                          strokeWidth={2}
                        />
                      );
                    })}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Legend */}
              {filteredMarkers.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs font-medium text-muted-foreground mb-3">
                    Dosage Changes
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {filteredMarkers.map((marker, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: marker.color }}
                          />
                          <span className="font-medium text-foreground">{marker.medicationName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {formatDose(marker.amount, marker.unit)}
                          </Badge>
                          <span className="text-muted-foreground">{marker.dateFormatted}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            {/* Info Card */}
            <Card className="p-4 bg-muted/30">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <span className="font-medium text-foreground">Pro tip:</span> Toggle Stack View to see all your medications at once, or select a single medication to focus on its journey.
              </p>
            </Card>
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
};
