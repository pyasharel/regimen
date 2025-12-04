import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, subMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { formatDose } from "@/utils/doseUtils";
import { MainHeader } from "@/components/MainHeader";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
  Label,
} from 'recharts';

type TimeFrame = "1M" | "3M" | "6M" | "1Y" | "All";

type ChartDataPoint = {
  date: string;
  dateObj: Date;
  weight?: number;
  fullDate: string;
  dosageLabel?: string;
};

type DosageChange = {
  date: Date;
  dateFormatted: string;
  amount: number;
  unit: string;
  compoundId: string;
  compoundName: string;
};

export const InsightsScreen = () => {
  const navigate = useNavigate();
  const [timeFrame, setTimeFrame] = useState<TimeFrame>("6M");
  const [selectedCompoundId, setSelectedCompoundId] = useState<string>("");

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

  // Set initial compound selection
  useEffect(() => {
    if (compounds.length > 0 && !selectedCompoundId) {
      setSelectedCompoundId(compounds[0].id);
    }
  }, [compounds, selectedCompoundId]);

  const isLoading = entriesLoading || compoundsLoading || dosesLoading;

  // Calculate cutoff date based on time frame
  const cutoffDate = useMemo(() => {
    const now = new Date();
    switch (timeFrame) {
      case '1M':
        return subMonths(now, 1);
      case '3M':
        return subMonths(now, 3);
      case '6M':
        return subMonths(now, 6);
      case '1Y':
        return subMonths(now, 12);
      case 'All':
        return new Date(0);
      default:
        return subMonths(now, 6);
    }
  }, [timeFrame]);

  // Calculate dosage changes for the selected compound
  const dosageChanges = useMemo(() => {
    if (!selectedCompoundId) return [];
    
    const compound = compounds.find(c => c.id === selectedCompoundId);
    if (!compound) return [];

    // Use scheduled_date instead of taken_at to capture retroactive updates
    const compoundDoses = doses
      .filter(d => d.compound_id === selectedCompoundId)
      .sort((a, b) => {
        const dateA = a.scheduled_date;
        const dateB = b.scheduled_date;
        return dateA.localeCompare(dateB);
      });

    if (compoundDoses.length === 0) return [];

    // First pass: identify ALL dosage changes (including before cutoff)
    const allChanges: DosageChange[] = [];
    let lastDoseAmount = -1;
    let lastDoseUnit = "";

    compoundDoses.forEach(dose => {
      if (dose.dose_amount !== lastDoseAmount || dose.dose_unit !== lastDoseUnit) {
        const doseDate = parseISO(dose.scheduled_date);
        allChanges.push({
          date: doseDate,
          dateFormatted: format(doseDate, 'MMM d'),
          amount: dose.dose_amount,
          unit: dose.dose_unit,
          compoundId: compound.id,
          compoundName: compound.name,
        });
        lastDoseAmount = dose.dose_amount;
        lastDoseUnit = dose.dose_unit;
      }
    });

    // Filter to only show changes within the time frame
    return allChanges.filter(change => change.date >= cutoffDate);
  }, [selectedCompoundId, compounds, doses, cutoffDate]);

  // Prepare chart data
  const chartData = useMemo(() => {
    const filteredWeightEntries = weightEntries.filter(e => {
      const entryDate = parseISO(e.entry_date);
      return entryDate >= cutoffDate;
    });

    const sortedEntries = filteredWeightEntries.sort((a, b) => 
      a.entry_date.localeCompare(b.entry_date)
    );

    // Track which dosage changes have been assigned to a weight entry
    const assignedChanges = new Set<number>();

    return sortedEntries.map(entry => {
      const entryDate = parseISO(entry.entry_date);
      const dateStr = format(entryDate, 'MMM d');
      
      // Find the first unassigned dosage change that occurred on or before this weight entry
      let matchedChange: DosageChange | undefined;
      for (let i = 0; i < dosageChanges.length; i++) {
        if (assignedChanges.has(i)) continue;
        const change = dosageChanges[i];
        // Show badge on the first weight entry on or after the dosage change date
        if (change.date <= entryDate) {
          matchedChange = change;
          assignedChanges.add(i);
          break;
        }
      }

      return {
        date: dateStr,
        dateObj: entryDate,
        weight: (entry.metrics as any)?.weight,
        fullDate: entry.entry_date,
        dosageLabel: matchedChange ? formatDose(matchedChange.amount, matchedChange.unit) : undefined,
      };
    });
  }, [weightEntries, cutoffDate, dosageChanges]);

  // Calculate weight stats
  const weightStats = useMemo(() => {
    if (chartData.length === 0) return { current: 0, change: 0, trend: 'stable' as const };

    const current = chartData[chartData.length - 1]?.weight || 0;
    const first = chartData[0]?.weight || 0;
    const change = current - first;
    const trend = change < -1 ? 'down' : change > 1 ? 'up' : 'stable';

    return { current, change, trend };
  }, [chartData]);

  // Custom dot component that shows dosage label
  const CustomDot = (props: any) => {
    const { cx, cy, payload, index } = props;
    if (!cx || !cy) return null;
    
    // Calculate badge width based on text length
    const badgeWidth = payload?.dosageLabel ? Math.max(45, payload.dosageLabel.length * 7 + 16) : 0;
    const isLastPoint = index === chartData.length - 1;
    const isFirstPoint = index === 0;
    
    // Adjust badge position for edge points
    let badgeX = cx - badgeWidth / 2;
    if (isLastPoint && payload?.dosageLabel) {
      badgeX = cx - badgeWidth + 10; // Shift left for last point
    } else if (isFirstPoint && payload?.dosageLabel) {
      badgeX = cx - 10; // Shift right for first point
    }
    
    return (
      <g>
        <circle
          cx={cx}
          cy={cy}
          r={5}
          fill="hsl(var(--primary))"
          stroke="none"
        />
        {payload?.dosageLabel && (
          <g>
            {/* Badge background */}
            <rect
              x={badgeX}
              y={cy - 28}
              width={badgeWidth}
              height={18}
              rx={4}
              fill="hsl(var(--primary))"
            />
            {/* Badge text */}
            <text
              x={badgeX + badgeWidth / 2}
              y={cy - 16}
              textAnchor="middle"
              fill="hsl(var(--primary-foreground))"
              fontSize={10}
              fontWeight={600}
            >
              {payload.dosageLabel}
            </text>
          </g>
        )}
      </g>
    );
  };

  const CustomActiveDot = (props: any) => {
    const { cx, cy } = props;
    if (!cx || !cy) return null;
    
    return (
      <circle
        cx={cx}
        cy={cy}
        r={7}
        fill="hsl(var(--primary))"
        stroke="hsl(var(--background))"
        strokeWidth={2}
      />
    );
  };

  // Custom Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload[0]) return null;

    const data = payload[0].payload;
    return (
      <Card className="p-3 shadow-elevated border border-border bg-card">
        <p className="text-xs font-medium text-muted-foreground mb-1">{data.date}</p>
        {data.weight && (
          <p className="text-sm font-semibold text-foreground">
            {data.weight.toFixed(1)} lbs
          </p>
        )}
        {data.dosageLabel && (
          <p className="text-xs text-primary mt-1">
            Dosage: {data.dosageLabel}
          </p>
        )}
      </Card>
    );
  };

  const selectedCompound = compounds.find(c => c.id === selectedCompoundId);

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col overflow-hidden bg-background" style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' }}>
        <MainHeader title="Insights" />
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
        <BottomNavigation />
      </div>
    );
  }

  const hasWeightData = chartData.length > 0;
  const hasCompounds = compounds.length > 0;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background" style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' }}>
      <MainHeader title="Insights" />

      <div className="flex-1 overflow-y-auto p-4 space-y-6 max-w-2xl mx-auto w-full">
        {!hasWeightData ? (
          <Card className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-muted/50 mx-auto mb-4 flex items-center justify-center">
              <TrendingUp className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No Weight Data Yet
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              Start logging your weight to see how your medications correlate with your progress.
            </p>
            <Button onClick={() => navigate('/progress')}>
              Go to Progress
            </Button>
          </Card>
        ) : (
          <>
            {/* Current Weight Stats */}
            <Card className="p-4 bg-card border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Current Weight</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-foreground">
                      {weightStats.current.toFixed(1)}
                    </span>
                    <span className="text-sm text-muted-foreground">lbs</span>
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
                    {timeFrame === '1M' ? 'Last month' : 
                     timeFrame === '3M' ? 'Last 3 months' : 
                     timeFrame === '6M' ? 'Last 6 months' : 
                     timeFrame === '1Y' ? 'Last year' : 'All time'}
                  </p>
                </div>
              </div>
            </Card>

            {/* Time Frame Selector */}
            <div className="flex gap-1 bg-secondary p-1 rounded-lg w-fit">
              {(["1M", "3M", "6M", "1Y", "All"] as TimeFrame[]).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeFrame(tf)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    timeFrame === tf
                      ? 'bg-background text-primary shadow-sm'
                      : 'text-foreground/70 hover:text-foreground'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>

            {/* Medication Selector */}
            {hasCompounds && (
              <Select
                value={selectedCompoundId}
                onValueChange={setSelectedCompoundId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select medication to track" />
                </SelectTrigger>
                <SelectContent>
                  {compounds.map(compound => (
                    <SelectItem key={compound.id} value={compound.id}>
                      {compound.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Weight Chart with Dosage Markers */}
            <Card className="p-4 bg-muted/30">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={chartData} margin={{ top: 35, right: 20, left: 0, bottom: 5 }}>
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
                      domain={['dataMin - 5', 'dataMax + 5']}
                      label={{ 
                        value: 'Weight (lbs)', 
                        angle: -90, 
                        position: 'insideLeft',
                        style: { fill: 'hsl(var(--muted-foreground))', fontSize: 11 }
                      }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line 
                      type="monotone" 
                      dataKey="weight" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3}
                      dot={<CustomDot />}
                      activeDot={<CustomActiveDot />}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[280px] text-muted-foreground">
                  No weight data for this time period.
                </div>
              )}
            </Card>

            {/* Dosage Changes Legend */}
            {dosageChanges.length > 0 && selectedCompound && (
              <Card className="p-4 bg-card border border-border">
                <h3 className="text-sm font-medium text-foreground mb-3">
                  {selectedCompound.name} Dosage History
                </h3>
                <div className="space-y-2">
                  {dosageChanges.map((change, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <span className="text-foreground font-medium">
                          {formatDose(change.amount, change.unit)}
                        </span>
                      </div>
                      <span className="text-muted-foreground text-xs">
                        {change.dateFormatted}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
};
