import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, Clock, Activity, TrendingDown, Pencil, Syringe, BarChart3 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDose } from "@/utils/doseUtils";
import { calculateCycleStatus } from "@/utils/cycleUtils";
import { Progress } from "@/components/ui/progress";
import { getHalfLifeData, hasHalfLifeTracking } from "@/utils/halfLifeData";
import { calculateMedicationLevels, calculateCurrentLevel, TakenDose } from "@/utils/halfLifeCalculator";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Area, ReferenceLine, Tooltip } from 'recharts';
import { format, subDays } from 'date-fns';

interface Compound {
  id: string;
  name: string;
  intended_dose: number;
  dose_unit: string;
  calculated_iu: number | null;
  calculated_ml: number | null;
  schedule_type: string;
  schedule_days: string[] | null;
  time_of_day: string[];
  start_date: string;
  is_active: boolean;
  has_cycles: boolean;
  cycle_weeks_on: number | null;
  cycle_weeks_off: number | null;
}

interface Dose {
  id: string;
  dose_amount: number;
  dose_unit: string;
  scheduled_date: string;
  scheduled_time: string;
  taken: boolean;
  taken_at: string | null;
}

export const CompoundDetailScreen = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [compound, setCompound] = useState<Compound | null>(null);
  const [doses, setDoses] = useState<Dose[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'1M' | '3M' | '6M'>('1M');

  useEffect(() => {
    if (id) {
      loadCompoundData();
    }
  }, [id]);

  const loadCompoundData = async () => {
    try {
      // Load compound details
      const { data: compoundData, error: compoundError } = await supabase
        .from('compounds')
        .select('*')
        .eq('id', id)
        .single();

      if (compoundError) throw compoundError;
      setCompound(compoundData);

      // Load dose history
      const { data: dosesData, error: dosesError } = await supabase
        .from('doses')
        .select('*')
        .eq('compound_id', id)
        .order('scheduled_date', { ascending: false })
        .order('scheduled_time', { ascending: false });

      if (dosesError) throw dosesError;
      setDoses(dosesData || []);
    } catch (error) {
      console.error('Error loading compound:', error);
      toast({
        title: "Error",
        description: "Failed to load compound details",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const halfLifeData = compound ? getHalfLifeData(compound.name) : null;
  const takenDoses = doses.filter(d => d.taken && d.taken_at);
  
  // Convert to TakenDose format for calculations
  const takenDosesForCalc: TakenDose[] = takenDoses.map(d => ({
    id: d.id,
    takenAt: new Date(d.taken_at!),
    amount: d.dose_amount,
    unit: d.dose_unit
  }));

  // Calculate current level if half-life data available
  const currentLevel = halfLifeData && takenDosesForCalc.length > 0
    ? calculateCurrentLevel(takenDosesForCalc, halfLifeData.halfLifeHours)
    : null;

  // Calculate levels for chart
  const getRangeInDays = () => {
    switch (timeRange) {
      case '1M': return 30;
      case '3M': return 90;
      case '6M': return 180;
    }
  };

  const chartData = halfLifeData && takenDosesForCalc.length > 0
    ? calculateMedicationLevels(
        takenDosesForCalc,
        halfLifeData.halfLifeHours,
        subDays(new Date(), getRangeInDays()),
        new Date(),
        2 // 2 points per day (12-hour intervals)
      ).map(point => ({
        date: format(point.timestamp, 'MMM d'),
        timestamp: point.timestamp.getTime(),
        level: Math.round(point.level),
        absoluteLevel: point.absoluteLevel.toFixed(2)
      }))
    : [];

  const totalDosesTaken = takenDoses.length;
  const lastDose = takenDoses[0];
  const nextScheduledDose = doses.find(d => !d.taken && new Date(d.scheduled_date) >= new Date());

  const formatTime = (time: string) => {
    if (time === 'Morning') return '8:00 AM';
    if (time === 'Afternoon') return '2:00 PM';
    if (time === 'Evening') return '6:00 PM';
    
    const match = time.match(/^(\d{1,2}):(\d{2})$/);
    if (match) {
      let hours = parseInt(match[1]);
      const minutes = match[2];
      const period = hours >= 12 ? 'PM' : 'AM';
      hours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      return `${hours}:${minutes} ${period}`;
    }
    return time;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="p-4 space-y-4">
          <div className="h-12 bg-muted animate-pulse rounded-lg" />
          <div className="h-48 bg-muted animate-pulse rounded-xl" />
          <div className="h-32 bg-muted animate-pulse rounded-xl" />
        </div>
      </div>
    );
  }

  if (!compound) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Compound not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between p-4" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
          <button 
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold">{compound.name}</h1>
          <button 
            onClick={() => navigate('/add-compound', { state: { editingCompound: compound } })}
            className="p-2 -mr-2 rounded-lg hover:bg-muted transition-colors"
          >
            <Pencil className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Current Status Card */}
        <div className="rounded-2xl bg-gradient-to-br from-primary/15 via-primary/10 to-primary/5 border border-primary/20 p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-muted-foreground">Current Dose</span>
            <div className={`px-2 py-1 rounded-full text-xs font-semibold ${
              compound.is_active 
                ? 'bg-primary/20 text-primary' 
                : 'bg-muted text-muted-foreground'
            }`}>
              {compound.is_active ? 'Active' : 'Inactive'}
            </div>
          </div>
          <div className="text-3xl font-bold text-foreground mb-1">
            {formatDose(compound.intended_dose, compound.dose_unit)}
          </div>
          {compound.calculated_iu && (
            <p className="text-sm text-muted-foreground">
              {compound.calculated_iu} IU • Draw {compound.calculated_ml} mL
            </p>
          )}
          <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span>{compound.schedule_type}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span>{compound.time_of_day.map(t => formatTime(t)).join(', ')}</span>
            </div>
          </div>
        </div>

        {/* Half-Life Tracking Section */}
        {halfLifeData ? (
          <div className="space-y-4">
            {/* Estimated Level Card */}
            <div className="rounded-2xl bg-card border border-border p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  <span className="font-semibold">Estimated Levels</span>
                </div>
                <div className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  {halfLifeData.category.toUpperCase()}
                </div>
              </div>

              {takenDosesForCalc.length > 0 && currentLevel ? (
                <>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-4xl font-bold text-primary">
                      {Math.round(currentLevel.percentOfPeak)}%
                    </span>
                    <span className="text-sm text-muted-foreground">of peak</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    ~{currentLevel.absoluteLevel.toFixed(2)} {compound.dose_unit} estimated in system
                  </p>
                  
                  {/* Half-life info */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                    <TrendingDown className="h-3.5 w-3.5" />
                    <span>Half-life: ~{Math.round(halfLifeData.halfLifeHours / 24)} days</span>
                    {halfLifeData.notes && <span>• {halfLifeData.notes}</span>}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Log doses to see estimated medication levels
                </p>
              )}
            </div>

            {/* Level Chart */}
            {chartData.length > 0 && (
              <div className="rounded-2xl bg-card border border-border p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    <span className="font-semibold">Level History</span>
                  </div>
                  <div className="flex gap-1">
                    {(['1M', '3M', '6M'] as const).map((range) => (
                      <button
                        key={range}
                        onClick={() => setTimeRange(range)}
                        className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                          timeRange === range
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {range}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                      <defs>
                        <linearGradient id="levelGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis 
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        domain={[0, 100]}
                        ticks={[0, 50, 100]}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
                                <p className="text-xs text-muted-foreground">{data.date}</p>
                                <p className="text-sm font-semibold">{data.level}% of peak</p>
                                <p className="text-xs text-muted-foreground">
                                  ~{data.absoluteLevel} {compound.dose_unit}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="level"
                        stroke="none"
                        fill="url(#levelGradient)"
                      />
                      <Line
                        type="monotone"
                        dataKey="level"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, fill: "hsl(var(--primary))" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* No half-life data available */
          <div className="rounded-2xl bg-muted/50 border border-border p-5">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Activity className="h-5 w-5" />
              <span className="text-sm">Half-life tracking not available for this medication</span>
            </div>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-card border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Syringe className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Total Doses</span>
            </div>
            <div className="text-2xl font-bold">{totalDosesTaken}</div>
          </div>
          <div className="rounded-xl bg-card border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Started</span>
            </div>
            <div className="text-lg font-bold">
              {format(new Date(compound.start_date + 'T00:00:00'), 'MMM d, yyyy')}
            </div>
          </div>
        </div>

        {/* Next Dose */}
        {nextScheduledDose && (
          <div className="rounded-xl bg-primary/10 border border-primary/20 p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground">Next Scheduled</span>
                <div className="font-semibold">
                  {format(new Date(nextScheduledDose.scheduled_date + 'T00:00:00'), 'EEEE, MMM d')}
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatTime(nextScheduledDose.scheduled_time)}
                </div>
              </div>
              <Clock className="h-8 w-8 text-primary/50" />
            </div>
          </div>
        )}

        {/* Cycle Status */}
        {compound.has_cycles && (() => {
          const cycleStatus = calculateCycleStatus(
            compound.start_date,
            compound.cycle_weeks_on,
            compound.cycle_weeks_off
          );
          
          if (!cycleStatus) return null;
          
          return (
            <div className="rounded-xl bg-card border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold">Cycle Status</span>
                <div className={`px-2 py-1 rounded-full text-xs font-semibold ${
                  cycleStatus.currentPhase === 'on' 
                    ? 'bg-primary/20 text-primary' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {cycleStatus.currentPhase === 'on' ? 'ON Cycle' : 'OFF Cycle'}
                </div>
              </div>
              <div className="text-sm text-muted-foreground mb-2">
                Day {cycleStatus.daysIntoPhase} of {cycleStatus.totalDaysInPhase}
              </div>
              <Progress value={cycleStatus.progressPercentage} className="h-2" />
            </div>
          );
        })()}

        {/* Dose History */}
        <div className="space-y-3">
          <h3 className="font-semibold">Dose History</h3>
          
          {takenDoses.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No doses logged yet
            </p>
          ) : (
            <div className="space-y-2">
              {takenDoses.slice(0, 20).map((dose) => (
                <div 
                  key={dose.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-card border border-border"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <div>
                      <div className="font-medium">
                        {formatDose(dose.dose_amount, dose.dose_unit)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {dose.taken_at 
                          ? format(new Date(dose.taken_at), 'MMM d, yyyy • h:mm a')
                          : format(new Date(dose.scheduled_date + 'T00:00:00'), 'MMM d, yyyy')
                        }
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-primary font-medium">✓ Taken</div>
                </div>
              ))}
              {takenDoses.length > 20 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Showing most recent 20 doses
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
