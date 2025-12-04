import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, Clock, TrendingDown, Pencil, Syringe, BarChart3, Share2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDose } from "@/utils/doseUtils";
import { calculateCycleStatus } from "@/utils/cycleUtils";
import { Progress } from "@/components/ui/progress";
import { getHalfLifeData } from "@/utils/halfLifeData";
import { calculateMedicationLevels, calculateCurrentLevel, TakenDose } from "@/utils/halfLifeCalculator";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { format, subDays } from 'date-fns';
import { Share } from '@capacitor/share';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import { CompoundShareCard } from "@/components/ShareCard";
import { shareElementAsImage } from "@/utils/visualShare";

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

const DAY_ABBREVIATIONS: Record<string, string> = {
  'Monday': 'Mon',
  'Tuesday': 'Tue', 
  'Wednesday': 'Wed',
  'Thursday': 'Thu',
  'Friday': 'Fri',
  'Saturday': 'Sat',
  'Sunday': 'Sun'
};

// Day index to name mapping (0 = Sunday, 1 = Monday, etc.)
const DAY_INDEX_TO_NAME: Record<string, string> = {
  '0': 'Sun',
  '1': 'Mon',
  '2': 'Tue',
  '3': 'Wed',
  '4': 'Thu',
  '5': 'Fri',
  '6': 'Sat',
};

export const CompoundDetailScreen = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [compound, setCompound] = useState<Compound | null>(null);
  const [doses, setDoses] = useState<Dose[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'1W' | '1M' | '3M' | '6M'>('1M');
  const shareCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      loadCompoundData();
    }
  }, [id]);

  const loadCompoundData = async () => {
    try {
      const { data: compoundData, error: compoundError } = await supabase
        .from('compounds')
        .select('*')
        .eq('id', id)
        .single();

      if (compoundError) throw compoundError;
      setCompound(compoundData);

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
  
  // Deduplicate doses - if two doses are within 60 seconds of each other, they're duplicates
  const uniqueTakenDoses = takenDoses
    .sort((a, b) => new Date(a.taken_at!).getTime() - new Date(b.taken_at!).getTime())
    .reduce((acc, dose) => {
      const doseTime = new Date(dose.taken_at! + 'Z').getTime();
      const isDuplicate = acc.some(d => {
        const existingTime = new Date(d.taken_at! + 'Z').getTime();
        return Math.abs(doseTime - existingTime) < 60000; // Within 60 seconds
      });
      if (!isDuplicate) {
        acc.push(dose);
      }
      return acc;
    }, [] as Dose[])
    .sort((a, b) => new Date(b.taken_at! + 'Z').getTime() - new Date(a.taken_at! + 'Z').getTime()); // Sort newest first

  const takenDosesForCalc: TakenDose[] = uniqueTakenDoses.map(d => ({
    id: d.id,
    takenAt: new Date(d.taken_at! + 'Z'), // Add 'Z' to treat as UTC consistently
    amount: d.dose_amount,
    unit: d.dose_unit
  }));

  const currentLevel = halfLifeData && takenDosesForCalc.length > 0
    ? calculateCurrentLevel(takenDosesForCalc, halfLifeData.halfLifeHours)
    : null;

  const getRangeInDays = () => {
    switch (timeRange) {
      case '1W': return 7;
      case '1M': return 30;
      case '3M': return 90;
      case '6M': return 180;
    }
  };

  // Use more data points for smoother peaks/troughs visualization
  const pointsPerDay = timeRange === '1W' ? 12 : timeRange === '1M' ? 8 : timeRange === '3M' ? 4 : 2;
  
  const now = new Date();
  const nowTimestamp = now.getTime();
  
  const chartData = halfLifeData && takenDosesForCalc.length > 0
    ? calculateMedicationLevels(
        takenDosesForCalc,
        halfLifeData.halfLifeHours,
        subDays(new Date(), getRangeInDays()),
        new Date(),
        pointsPerDay,
        true // Include future projections until clearance
      ).map(point => ({
        date: format(point.timestamp, 'MMM d'),
        timestamp: point.timestamp.getTime(),
        level: Math.round(point.level * 10) / 10,
        absoluteLevel: point.absoluteLevel.toFixed(2),
        isFuture: point.isFuture || false,
        // Split data for dual-area rendering
        pastLevel: !point.isFuture ? Math.round(point.level * 10) / 10 : null,
        futureLevel: point.isFuture ? Math.round(point.level * 10) / 10 : null,
      }))
    : [];
  
  // Find the "now" index for the reference line
  const nowIndex = chartData.findIndex(d => d.timestamp >= nowTimestamp);

  const totalDosesTaken = uniqueTakenDoses.length;
  
  // Find next scheduled dose - compare date strings to avoid timezone issues
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const nextScheduledDose = doses
    .filter(d => !d.taken && d.scheduled_date >= todayStr)
    .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))[0];

  const formatTime = (time: string) => {
    if (time === 'Morning') return '8 AM';
    if (time === 'Afternoon') return '2 PM';
    if (time === 'Evening') return '6 PM';
    
    const match = time.match(/^(\d{1,2}):(\d{2})$/);
    if (match) {
      let hours = parseInt(match[1]);
      const minutes = match[2];
      const period = hours >= 12 ? 'PM' : 'AM';
      hours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      return minutes === '00' ? `${hours} ${period}` : `${hours}:${minutes} ${period}`;
    }
    return time;
  };

  const getScheduleDaysDisplay = () => {
    if (!compound) return '';
    if (compound.schedule_type === 'Daily') return 'Daily';
    if (compound.schedule_type === 'Weekly') return 'Weekly';
    if (compound.schedule_type === 'As Needed') return 'As Needed';
    
    // Handle "Every X Days" format
    const everyXMatch = compound.schedule_type.match(/Every (\d+) Days/);
    if (everyXMatch) {
      return `Every ${everyXMatch[1]} days`;
    }
    
    // Handle specific days - schedule_days contains day indices (0=Sun, 1=Mon, etc.)
    if ((compound.schedule_type === 'Specific day(s)' || compound.schedule_type === 'Specific day of the week') 
        && compound.schedule_days && compound.schedule_days.length > 0) {
      const dayNames = compound.schedule_days.map(d => {
        // d could be a string like "1" or a full day name like "Monday"
        if (DAY_INDEX_TO_NAME[d]) {
          return DAY_INDEX_TO_NAME[d];
        }
        if (DAY_ABBREVIATIONS[d]) {
          return DAY_ABBREVIATIONS[d];
        }
        return d;
      });
      // For single day, show "Every Mon" or "Weekly (Mon)"
      // For multiple days, show "Mon, Wed, Fri"
      return dayNames.length === 1 ? `Every ${dayNames[0]}` : dayNames.join(', ');
    }
    
    return compound.schedule_type;
  };

  const triggerHaptic = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        await Haptics.impact({ style: ImpactStyle.Light });
      } else if ('vibrate' in navigator) {
        navigator.vibrate(30);
      }
    } catch (err) {
      console.log('Haptic failed:', err);
    }
  };

  const handleShare = async () => {
    if (!compound) return;
    
    triggerHaptic();
    
    // Try visual share first
    if (shareCardRef.current) {
      const success = await shareElementAsImage(shareCardRef.current, `${compound.name.toLowerCase().replace(/\s+/g, '-')}.png`);
      if (success) return;
    }
    
    // Fallback to text share
    const scheduleDisplay = getScheduleDaysDisplay();
    const timesDisplay = compound.time_of_day.map(t => formatTime(t)).join(', ');
    const startDateDisplay = format(new Date(compound.start_date + 'T00:00:00'), 'MMM d, yyyy');
    
    let shareText = `${compound.name}\n\n`;
    shareText += `💊 Dose: ${formatDose(compound.intended_dose, compound.dose_unit)}\n`;
    shareText += `📅 Schedule: ${scheduleDisplay} at ${timesDisplay}\n`;
    shareText += `📆 Started: ${startDateDisplay}\n`;
    shareText += `✓ Total doses: ${totalDosesTaken}\n`;
    
    if (currentLevel) {
      shareText += `📊 Est. level: ~${currentLevel.absoluteLevel.toFixed(2)} ${compound.dose_unit}\n`;
    }
    
    shareText += `\nTrack your protocol at regimen.app`;
    
    try {
      await Share.share({
        title: compound.name,
        text: shareText,
        url: 'https://regimen.app',
        dialogTitle: `Share ${compound.name}`,
      });
    } catch (err) {
      console.log('Share cancelled or failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="p-4 space-y-4">
          <div className="h-12 bg-muted animate-pulse rounded-lg" />
          <div className="h-48 bg-muted animate-pulse rounded-xl" />
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

      <div className="p-4 space-y-4">
        {/* Stats Grid - 2x2 layout */}
        <div className="grid grid-cols-2 gap-3">
          {/* Current Dose - highlighted */}
          <div className="rounded-xl bg-gradient-to-br from-primary/15 via-primary/10 to-primary/5 border border-primary/20 p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Current Dose</span>
              <div className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                compound.is_active 
                  ? 'bg-primary/20 text-primary' 
                  : 'bg-muted text-muted-foreground'
              }`}>
                {compound.is_active ? 'Active' : 'Inactive'}
              </div>
            </div>
            <div className="text-xl font-bold text-foreground">
              {formatDose(compound.intended_dose, compound.dose_unit)}
            </div>
          </div>

          {/* Estimated Level */}
          <div className="rounded-xl bg-card border border-border p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Est. Level</span>
            </div>
            {halfLifeData && currentLevel ? (
              <>
                <div className="text-xl font-bold">
                  <span className="text-primary">~{currentLevel.absoluteLevel.toFixed(2)} {compound.dose_unit}</span>
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  in system
                </div>
              </>
            ) : (
              <>
                <div className="text-xl font-bold text-muted-foreground">—</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {halfLifeData ? 'Log doses to track' : 'Not available'}
                </div>
              </>
            )}
          </div>

          {/* Started */}
          <div className="rounded-xl bg-card border border-border p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Calendar className="h-3 w-3 text-primary" />
              <span className="text-xs text-muted-foreground">Started</span>
            </div>
            <div className="text-lg font-bold">
              {format(new Date(compound.start_date + 'T00:00:00'), 'MMM d')}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {format(new Date(compound.start_date + 'T00:00:00'), 'yyyy')}
            </div>
          </div>

          {/* Total Doses */}
          <div className="rounded-xl bg-card border border-border p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Syringe className="h-3 w-3 text-primary" />
              <span className="text-xs text-muted-foreground">Total Doses</span>
            </div>
            <div className="text-xl font-bold">{totalDosesTaken}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">logged</div>
          </div>
        </div>

        {/* Schedule + Next Dose Row */}
        <div className="grid grid-cols-2 gap-3">
          {/* Schedule */}
          <div className="rounded-xl bg-card border border-border p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Calendar className="h-3 w-3 text-primary" />
              <span className="text-xs text-muted-foreground">Schedule</span>
            </div>
            <div className="text-sm font-semibold">
              {getScheduleDaysDisplay()}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {compound.time_of_day.map(t => formatTime(t)).join(', ')}
            </div>
          </div>

          {/* Next Dose */}
          {nextScheduledDose ? (
            <div className="rounded-xl bg-primary/10 border border-primary/20 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Clock className="h-3 w-3 text-primary" />
                <span className="text-xs text-muted-foreground">Next Dose</span>
              </div>
              <div className="text-sm font-semibold">
                {format(new Date(nextScheduledDose.scheduled_date + 'T00:00:00'), 'EEE, MMM d')}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {formatTime(nextScheduledDose.scheduled_time)}
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-card border border-border p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Clock className="h-3 w-3 text-primary" />
                <span className="text-xs text-muted-foreground">Next Dose</span>
              </div>
              <div className="text-sm font-semibold text-muted-foreground">—</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Not scheduled</div>
            </div>
          )}
        </div>

        {/* Half-life Info - Compact */}
        {halfLifeData && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
            <TrendingDown className="h-3.5 w-3.5" />
            <span>Half-life: ~{Math.round(halfLifeData.halfLifeHours / 24)} days</span>
          </div>
        )}

        {/* Level History Chart */}
        {halfLifeData && chartData.length > 0 && (
          <div className="rounded-2xl bg-card border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">Estimated Levels</span>
              </div>
              <div className="flex gap-1">
                {(['1W', '1M', '3M', '6M'] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
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

            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                  <defs>
                    <linearGradient id="levelGradientPast" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                      <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="levelGradientFuture" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                      <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity={0.12} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
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
                            <p className="text-xs text-muted-foreground">
                              {data.date} {data.isFuture && <span className="text-primary/60">(projected)</span>}
                            </p>
                            <p className="text-sm font-semibold">~{data.absoluteLevel} {compound.dose_unit}</p>
                            <p className="text-xs text-muted-foreground">
                              {data.level}% of peak concentration
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  {/* Past levels - solid */}
                  <Area
                    type="basis"
                    dataKey="pastLevel"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#levelGradientPast)"
                    isAnimationActive={false}
                    connectNulls={false}
                  />
                  {/* Future projections - lighter */}
                  <Area
                    type="basis"
                    dataKey="futureLevel"
                    stroke="hsl(var(--primary))"
                    strokeWidth={1.5}
                    strokeDasharray="4 2"
                    fill="url(#levelGradientFuture)"
                    isAnimationActive={false}
                    connectNulls={false}
                  />
                  {/* Continuous line for visual connection */}
                  <Area
                    type="basis"
                    dataKey="level"
                    stroke="transparent"
                    strokeWidth={0}
                    fill="transparent"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            
            {/* Legend for chart */}
            <div className="flex items-center justify-center gap-4 mt-2 text-[10px] text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 bg-primary rounded-full" />
                <span>Current</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 bg-primary/40 rounded-full border-dashed" style={{ borderWidth: '0 0 1px 0', borderStyle: 'dashed' }} />
                <span>Projected</span>
              </div>
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
                <span className="font-semibold text-sm">Cycle Status</span>
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
          <h3 className="font-semibold text-sm">Dose History</h3>
          
          {uniqueTakenDoses.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No doses logged yet
            </p>
          ) : (
            <div className="space-y-2">
              {uniqueTakenDoses.slice(0, 20).map((dose) => (
                <div 
                  key={dose.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-card border border-border"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <div>
                      <div className="font-medium text-sm">
                        {formatDose(dose.dose_amount, dose.dose_unit)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {dose.taken_at 
                          ? format(new Date(dose.taken_at + 'Z'), 'MMM d, yyyy • h:mm a')
                          : format(new Date(dose.scheduled_date + 'T00:00:00'), 'MMM d, yyyy')
                        }
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-primary font-medium">✓ Taken</div>
                </div>
              ))}
              {uniqueTakenDoses.length > 20 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Showing most recent 20 doses
                </p>
              )}
            </div>
          )}
        </div>

        {/* Share Link */}
        <div className="flex justify-center pt-2">
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          >
            <Share2 className="h-3 w-3" />
            <span>Share {compound.name}</span>
          </button>
        </div>

      </div>

      {/* Hidden share card for image generation */}
      {compound && (
        <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
          <CompoundShareCard
            ref={shareCardRef}
            name={compound.name}
            dose={formatDose(compound.intended_dose, compound.dose_unit)}
            scheduleFrequency={getScheduleDaysDisplay()}
            scheduleTime={compound.time_of_day.map(t => formatTime(t)).join(', ')}
            startDate={format(new Date(compound.start_date + 'T00:00:00'), 'MMM d, yyyy')}
            totalDoses={totalDosesTaken}
            estimatedLevel={currentLevel ? `~${currentLevel.absoluteLevel.toFixed(2)} ${compound.dose_unit}` : undefined}
            doseUnit={compound.dose_unit}
            nextDose={nextScheduledDose ? format(new Date(nextScheduledDose.scheduled_date + 'T00:00:00'), 'EEE, MMM d') : undefined}
            nextDoseTime={nextScheduledDose ? formatTime(nextScheduledDose.scheduled_time) : undefined}
            chartData={chartData.length > 0 ? chartData.map(d => ({ date: d.date, level: d.level, isFuture: d.isFuture })) : undefined}
          />
        </div>
      )}
    </div>
  );
};
