import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, Clock, TrendingDown, Pencil, Syringe, BarChart3, Share2, CircleSlash, FlaskConical, ChevronDown, ChevronUp, FileText, RefreshCw } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDose } from "@/utils/doseUtils";
import { calculateCycleStatus } from "@/utils/cycleUtils";
import { Progress } from "@/components/ui/progress";
import { getHalfLifeData, getTmax } from "@/utils/halfLifeData";
import { calculateMedicationLevels, calculateCurrentLevel, TakenDose } from "@/utils/halfLifeCalculator";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceDot, ReferenceLine, BarChart, Bar, Cell } from 'recharts';
import { format, subDays, differenceInDays, addDays } from 'date-fns';
import { Share } from '@capacitor/share';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import { CompoundShareCard } from "@/components/ShareCard";
import { shareElementAsImage } from "@/utils/visualShare";
import { trackLevelsViewed, trackShareAction, trackCompoundViewed } from "@/utils/analytics";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  notes: string | null;
  vial_size: number | null;
  vial_unit: string | null;
  bac_water_volume: number | null;
  concentration: number | null;
  vial_started_at: string | null;
  end_date: string | null;
}

interface Dose {
  id: string;
  dose_amount: number;
  dose_unit: string;
  scheduled_date: string;
  scheduled_time: string;
  taken: boolean;
  taken_at: string | null;
  skipped?: boolean;
  calculated_ml?: number | null;
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

const DAY_INDEX_TO_NAME: Record<string, string> = {
  '0': 'Sun',
  '1': 'Mon',
  '2': 'Tue',
  '3': 'Wed',
  '4': 'Thu',
  '5': 'Fri',
  '6': 'Sat',
};

export const CompoundDetailScreenV2 = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [compound, setCompound] = useState<Compound | null>(null);
  const [doses, setDoses] = useState<Dose[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'1W' | '1M' | '3M' | '6M'>('1M');
  const [notesExpanded, setNotesExpanded] = useState(false);
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
      
      if (compoundData) {
        trackCompoundViewed(compoundData.name);
      }

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

  // === VIAL INVENTORY CALCULATIONS ===
  const calculateVialInventory = () => {
    if (!compound?.vial_size || !compound?.calculated_ml) return null;
    
    // Get vial start date (when they started current vial)
    const vialStartDate = compound.vial_started_at 
      ? new Date(compound.vial_started_at) 
      : new Date(compound.start_date + 'T00:00:00');
    
    // Sum up all taken doses since vial start
    const takenDosesSinceVialStart = doses.filter(d => {
      if (!d.taken || !d.taken_at) return false;
      const takenDate = new Date(d.taken_at + 'Z');
      return takenDate >= vialStartDate;
    });
    
    // Calculate mL used (use calculated_ml if available, else estimate from dose_amount)
    const mlUsed = takenDosesSinceVialStart.reduce((sum, dose) => {
      return sum + (dose.calculated_ml || compound.calculated_ml || 0);
    }, 0);
    
    const mlRemaining = Math.max(0, compound.vial_size - mlUsed);
    const percentRemaining = (mlRemaining / compound.vial_size) * 100;
    const dosesRemaining = compound.calculated_ml > 0 
      ? Math.floor(mlRemaining / compound.calculated_ml) 
      : 0;
    
    // Estimate days remaining based on schedule
    const dosesTaken = takenDosesSinceVialStart.length;
    const daysSinceStart = Math.max(1, differenceInDays(new Date(), vialStartDate));
    const avgDosesPerDay = dosesTaken / daysSinceStart;
    const daysRemaining = avgDosesPerDay > 0 ? Math.round(dosesRemaining / avgDosesPerDay) : null;
    const estimatedEmptyDate = daysRemaining ? addDays(new Date(), daysRemaining) : null;
    
    return {
      mlRemaining: mlRemaining.toFixed(2),
      mlTotal: compound.vial_size,
      percentRemaining,
      dosesRemaining,
      estimatedEmptyDate,
      daysRemaining,
      vialStartDate
    };
  };

  const vialInventory = calculateVialInventory();

  const handleStartNewVial = async () => {
    if (!compound) return;
    
    try {
      const { error } = await supabase
        .from('compounds')
        .update({ vial_started_at: new Date().toISOString() })
        .eq('id', compound.id);
      
      if (error) throw error;
      
      toast({
        title: "New vial started",
        description: "Inventory tracking has been reset",
      });
      
      loadCompoundData(); // Reload to get updated data
    } catch (error) {
      console.error('Error starting new vial:', error);
      toast({
        title: "Error",
        description: "Failed to start new vial",
        variant: "destructive"
      });
    }
  };

  // === DOSE CHANGE DETECTION ===
  const getDoseChanges = () => {
    // Get all doses sorted by date ascending
    const sortedDoses = [...doses]
      .filter(d => d.taken)
      .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime());
    
    const changes: { date: Date; fromDose: number; toDose: number; unit: string }[] = [];
    
    for (let i = 1; i < sortedDoses.length; i++) {
      const prevDose = sortedDoses[i - 1];
      const currDose = sortedDoses[i];
      
      if (prevDose.dose_amount !== currDose.dose_amount) {
        changes.push({
          date: new Date(currDose.scheduled_date + 'T00:00:00'),
          fromDose: prevDose.dose_amount,
          toDose: currDose.dose_amount,
          unit: currDose.dose_unit
        });
      }
    }
    
    return changes;
  };

  const doseChanges = getDoseChanges();

  const halfLifeData = compound ? getHalfLifeData(compound.name) : null;
  const takenDoses = doses.filter(d => d.taken && d.taken_at);
  const skippedDoses = doses.filter(d => d.skipped === true);
  
  // Deduplicate doses
  const uniqueTakenDoses = takenDoses
    .sort((a, b) => new Date(a.taken_at!).getTime() - new Date(b.taken_at!).getTime())
    .reduce((acc, dose) => {
      const doseTime = new Date(dose.taken_at! + 'Z').getTime();
      const isDuplicate = acc.some(d => {
        const existingTime = new Date(d.taken_at! + 'Z').getTime();
        return Math.abs(doseTime - existingTime) < 60000;
      });
      if (!isDuplicate) {
        acc.push(dose);
      }
      return acc;
    }, [] as Dose[])
    .sort((a, b) => new Date(b.taken_at! + 'Z').getTime() - new Date(a.taken_at! + 'Z').getTime());

  const allHandledDoses = [
    ...uniqueTakenDoses.map(d => ({ ...d, type: 'taken' as const })),
    ...skippedDoses.map(d => ({ ...d, type: 'skipped' as const }))
  ].sort((a, b) => {
    const dateA = a.taken_at ? new Date(a.taken_at + 'Z').getTime() : new Date(a.scheduled_date + 'T00:00:00').getTime();
    const dateB = b.taken_at ? new Date(b.taken_at + 'Z').getTime() : new Date(b.scheduled_date + 'T00:00:00').getTime();
    return dateB - dateA;
  });

  const takenDosesForCalc: TakenDose[] = uniqueTakenDoses.map(d => ({
    id: d.id,
    takenAt: new Date(d.taken_at! + 'Z'),
    amount: d.dose_amount,
    unit: d.dose_unit
  }));

  const currentLevel = halfLifeData && takenDosesForCalc.length > 0
    ? calculateCurrentLevel(takenDosesForCalc, halfLifeData.halfLifeHours, getTmax(halfLifeData))
    : null;

  const levelsTrackedRef = useRef(false);
  useEffect(() => {
    if (!loading && compound && halfLifeData && takenDosesForCalc.length > 0 && !levelsTrackedRef.current) {
      trackLevelsViewed(compound.name);
      levelsTrackedRef.current = true;
    }
  }, [loading, compound, halfLifeData, takenDosesForCalc.length]);

  const getRangeInDays = () => {
    switch (timeRange) {
      case '1W': return 7;
      case '1M': return 30;
      case '3M': return 90;
      case '6M': return 180;
    }
  };

  const pointsPerDay = timeRange === '1W' ? 48 : timeRange === '1M' ? 24 : timeRange === '3M' ? 12 : 8;
  
  const now = new Date();
  const nowTimestamp = now.getTime();
  
  const rawChartData = halfLifeData && takenDosesForCalc.length > 0
    ? calculateMedicationLevels(
        takenDosesForCalc,
        halfLifeData.halfLifeHours,
        subDays(new Date(), getRangeInDays()),
        new Date(),
        pointsPerDay,
        true,
        getTmax(halfLifeData)
      )
    : [];
  
  const maxAbsoluteLevel = rawChartData.length > 0 
    ? Math.max(...rawChartData.map(p => p.absoluteLevel)) 
    : 0;
  
  const formatYAxis = (value: number) => {
    if (value === 0) return '0';
    if (Number.isInteger(value)) return value.toString();
    if (value >= 10) return Math.round(value).toString();
    if (value >= 1) return value.toFixed(1);
    return value.toFixed(2);
  };
  
  const getAxisMax = (max: number) => {
    if (max <= 0) return 1;
    if (max < 1) return Math.ceil(max * 10) / 10;
    if (max < 10) return Math.ceil(max);
    if (max < 50) return Math.ceil(max / 5) * 5;
    if (max < 100) return Math.ceil(max / 10) * 10;
    if (max < 500) return Math.ceil(max / 25) * 25;
    if (max < 1000) return Math.ceil(max / 50) * 50;
    return Math.ceil(max / 100) * 100;
  };
  
  const yAxisMax = getAxisMax(maxAbsoluteLevel * 1.1);
  
  // Add dose change markers to chart data
  const chartRangeStart = subDays(new Date(), getRangeInDays());
  const relevantDoseChanges = doseChanges.filter(dc => dc.date >= chartRangeStart);
  
  const chartData = rawChartData.map(point => ({
    date: format(point.timestamp, 'MMM d'),
    timestamp: point.timestamp.getTime(),
    level: point.absoluteLevel,
    absoluteLevel: point.absoluteLevel.toFixed(2),
    percentOfPeak: Math.round(point.level * 10) / 10,
    isFuture: point.isFuture || false,
    pastLevel: !point.isFuture ? point.absoluteLevel : null,
    futureLevel: point.isFuture ? point.absoluteLevel : null,
  }));
  
  const nowIndex = chartData.findIndex(d => d.timestamp >= nowTimestamp);

  const totalDosesTaken = uniqueTakenDoses.length;
  
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
    
    const everyXMatch = compound.schedule_type.match(/Every (\d+) Days/);
    if (everyXMatch) {
      return `Every ${everyXMatch[1]} days`;
    }
    
    if ((compound.schedule_type === 'Specific day(s)' || compound.schedule_type === 'Specific day of the week') 
        && compound.schedule_days && compound.schedule_days.length > 0) {
      const dayNames = compound.schedule_days.map(d => {
        if (DAY_INDEX_TO_NAME[d]) {
          return DAY_INDEX_TO_NAME[d];
        }
        if (DAY_ABBREVIATIONS[d]) {
          return DAY_ABBREVIATIONS[d];
        }
        return d;
      });
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
    trackShareAction('stack');
    
    if (shareCardRef.current) {
      const success = await shareElementAsImage(shareCardRef.current, `${compound.name.toLowerCase().replace(/\s+/g, '-')}.png`);
      if (success) return;
    }
    
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
        {/* === PRIMARY INFO: Current Dose + Schedule === */}
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

          {/* Schedule + Next Dose Combined */}
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
                {formatTime(nextScheduledDose.scheduled_time)} • {getScheduleDaysDisplay()}
              </div>
            </div>
          ) : (
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
          )}
        </div>

        {/* === SECONDARY INFO: Level + Timeline === */}
        <div className="grid grid-cols-2 gap-3">
          {/* Estimated Level with half-life tooltip */}
          <div className="rounded-xl bg-card border border-border p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Est. Level</span>
              {halfLifeData && (
                <TooltipProvider>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <button className="flex items-center gap-1 text-[10px] text-muted-foreground/60 hover:text-muted-foreground">
                        <TrendingDown className="h-3 w-3" />
                        <span>t½ ~{Math.round(halfLifeData.halfLifeHours / 24)}d</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      Half-life: ~{halfLifeData.halfLifeHours} hours ({Math.round(halfLifeData.halfLifeHours / 24)} days)
                    </TooltipContent>
                  </UITooltip>
                </TooltipProvider>
              )}
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

          {/* Timeline: Started + Total Doses */}
          <div className="rounded-xl bg-card border border-border p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Syringe className="h-3 w-3 text-primary" />
              <span className="text-xs text-muted-foreground">Total Doses</span>
            </div>
            <div className="text-lg font-bold">{totalDosesTaken} doses</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              since {format(new Date(compound.start_date + 'T00:00:00'), 'MMM d, yyyy')}
            </div>
          </div>
        </div>

        {/* === VIAL INVENTORY (only if vial_size exists) === */}
        {vialInventory && (
          <div className="rounded-xl bg-card border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">Vial Inventory</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleStartNewVial}
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                New Vial
              </Button>
            </div>
            
            <div className="space-y-3">
              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Remaining</span>
                  <span className="font-medium">{vialInventory.mlRemaining} / {vialInventory.mlTotal} mL</span>
                </div>
                <Progress 
                  value={vialInventory.percentRemaining} 
                  className={`h-2 ${vialInventory.percentRemaining < 20 ? '[&>div]:bg-destructive' : ''}`}
                />
              </div>
              
              {/* Stats row */}
              <div className="flex justify-between text-xs">
                <div>
                  <span className="text-muted-foreground">Doses left: </span>
                  <span className="font-medium">{vialInventory.dosesRemaining}</span>
                </div>
                {vialInventory.estimatedEmptyDate && (
                  <div>
                    <span className="text-muted-foreground">Runs out: </span>
                    <span className="font-medium">~{format(vialInventory.estimatedEmptyDate, 'MMM d')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* === NOTES (collapsible, only if notes exist) === */}
        {compound.notes && (
          <Collapsible open={notesExpanded} onOpenChange={setNotesExpanded}>
            <div className="rounded-xl bg-card border border-border overflow-hidden">
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-sm">Notes</span>
                  </div>
                  {notesExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-3 pb-3 border-t border-border/50 pt-2">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{compound.notes}</p>
                  <button
                    onClick={() => navigate('/add-compound', { state: { editingCompound: compound } })}
                    className="mt-2 text-xs text-primary hover:underline"
                  >
                    Edit notes
                  </button>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        )}

        {/* Level History Chart with Dose Change Markers */}
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
                <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                  <defs>
                    <linearGradient id="levelGradientPastV2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                      <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="levelGradientFutureV2" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                      <stop offset="40%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.01} />
                    </linearGradient>
                    <linearGradient id="futureStrokeGradientV2" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.7} />
                      <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                    </linearGradient>
                    <filter id="currentPointGlowV2" x="-100%" y="-100%" width="300%" height="300%">
                      <feGaussianBlur stdDeviation="4" result="coloredBlur">
                        <animate attributeName="stdDeviation" values="3;6;3" dur="2s" repeatCount="indefinite" />
                      </feGaussianBlur>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    tick={{ fontSize: 9 }}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, yAxisMax]}
                    tickFormatter={formatYAxis}
                    width={32}
                    tickCount={4}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        // Check if this date has a dose change
                        const doseChange = relevantDoseChanges.find(dc => 
                          format(dc.date, 'MMM d') === data.date
                        );
                        return (
                          <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
                            <p className="text-xs text-muted-foreground mb-0.5">
                              {data.date} {data.isFuture && <span className="text-primary/60">(projected)</span>}
                            </p>
                            <p className="text-sm font-semibold text-primary">~{data.absoluteLevel} {compound.dose_unit}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {data.percentOfPeak}% of peak
                            </p>
                            {doseChange && (
                              <p className="text-[11px] text-amber-500 mt-1 font-medium">
                                Dose: {doseChange.fromDose} → {doseChange.toDose} {doseChange.unit}
                              </p>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  
                  {/* Dose change reference lines */}
                  {relevantDoseChanges.map((dc, idx) => {
                    const dateStr = format(dc.date, 'MMM d');
                    return (
                      <ReferenceLine
                        key={idx}
                        x={dateStr}
                        stroke="hsl(var(--amber-500, 245 158 11))"
                        strokeDasharray="3 3"
                        strokeWidth={1}
                        strokeOpacity={0.6}
                      />
                    );
                  })}
                  
                  <Area
                    type="monotone"
                    dataKey="pastLevel"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#levelGradientPastV2)"
                    isAnimationActive={false}
                    connectNulls={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="futureLevel"
                    stroke="url(#futureStrokeGradientV2)"
                    strokeWidth={1.5}
                    strokeDasharray="4 2"
                    fill="url(#levelGradientFutureV2)"
                    isAnimationActive={false}
                    connectNulls={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="level"
                    stroke="transparent"
                    strokeWidth={0}
                    fill="transparent"
                    isAnimationActive={false}
                  />
                  {nowIndex >= 0 && nowIndex < chartData.length && chartData[nowIndex] && (
                    <ReferenceDot
                      x={chartData[nowIndex].date}
                      y={chartData[nowIndex].level}
                      r={6}
                      fill="hsl(var(--primary))"
                      stroke="hsl(var(--background))"
                      strokeWidth={2}
                      filter="url(#currentPointGlowV2)"
                    >
                      <animate
                        attributeName="opacity"
                        values="1;0.7;1"
                        dur="2s"
                        repeatCount="indefinite"
                      />
                    </ReferenceDot>
                  )}
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
              {relevantDoseChanges.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-0.5 bg-amber-500/60 rounded-full border-dashed" style={{ borderWidth: '0 0 1px 0', borderStyle: 'dashed' }} />
                  <span>Dose change</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Dosage Timeline Chart - Shows dose changes over time */}
        {doseChanges.length > 0 && (
          <div className="rounded-2xl bg-card border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-amber-500" style={{ transform: 'scaleY(-1)' }} />
                <span className="font-semibold text-sm">Dosage Timeline</span>
              </div>
              <span className="text-xs text-muted-foreground">{doseChanges.length} change{doseChanges.length !== 1 ? 's' : ''}</span>
            </div>

            {(() => {
              // Build timeline data: start dose + all changes
              const sortedTakenDoses = [...doses]
                .filter(d => d.taken)
                .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime());
              
              if (sortedTakenDoses.length === 0) return null;
              
              // Create step data points
              const timelineData: { date: string; dose: number; label: string; isChange: boolean }[] = [];
              
              // Add first dose
              const firstDose = sortedTakenDoses[0];
              timelineData.push({
                date: format(new Date(firstDose.scheduled_date + 'T00:00:00'), 'MMM d'),
                dose: firstDose.dose_amount,
                label: `${firstDose.dose_amount} ${firstDose.dose_unit}`,
                isChange: false
              });
              
              // Add each dose change
              doseChanges.forEach(dc => {
                timelineData.push({
                  date: format(dc.date, 'MMM d'),
                  dose: dc.toDose,
                  label: `${dc.toDose} ${dc.unit}`,
                  isChange: true
                });
              });
              
              // Add current dose if different from last change
              const lastEntry = timelineData[timelineData.length - 1];
              if (compound && lastEntry.dose !== compound.intended_dose) {
                timelineData.push({
                  date: 'Now',
                  dose: compound.intended_dose,
                  label: `${compound.intended_dose} ${compound.dose_unit}`,
                  isChange: true
                });
              }
              
              const maxDose = Math.max(...timelineData.map(d => d.dose));
              
              return (
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={timelineData} margin={{ top: 10, right: 5, bottom: 5, left: 0 }}>
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        tick={{ fontSize: 9 }}
                        tickLine={false}
                        axisLine={false}
                        domain={[0, maxDose * 1.2]}
                        width={28}
                        tickCount={3}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
                                <p className="text-xs text-muted-foreground mb-0.5">{data.date}</p>
                                <p className="text-sm font-semibold text-amber-500">{data.label}</p>
                                {data.isChange && <p className="text-[10px] text-muted-foreground">Dose adjusted</p>}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="dose" radius={[4, 4, 0, 0]}>
                        {timelineData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.isChange ? 'hsl(var(--amber-500, 38 92% 50%))' : 'hsl(var(--primary))'} 
                            fillOpacity={entry.isChange ? 0.8 : 0.6}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              );
            })()}
            
            {/* Change list */}
            <div className="mt-3 space-y-1.5">
              {doseChanges.slice(-3).reverse().map((dc, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{format(dc.date, 'MMM d, yyyy')}</span>
                  <span className="font-medium">
                    <span className="text-muted-foreground">{dc.fromDose}</span>
                    <span className="text-amber-500 mx-1">→</span>
                    <span className="text-foreground">{dc.toDose} {dc.unit}</span>
                  </span>
                </div>
              ))}
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
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Dose History</h3>
            {allHandledDoses.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {uniqueTakenDoses.length} taken{skippedDoses.length > 0 && `, ${skippedDoses.length} skipped`}
              </span>
            )}
          </div>
          
          {allHandledDoses.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No doses logged yet
            </p>
          ) : (
            <div className={`space-y-2 ${allHandledDoses.length > 5 ? 'max-h-[280px] overflow-y-auto pr-1' : ''}`}>
              {allHandledDoses.map((dose, idx) => {
                // Check if this dose represents a dose change
                const prevDose = allHandledDoses[idx + 1];
                const isDoseChange = prevDose && dose.dose_amount !== prevDose.dose_amount && dose.type === 'taken' && prevDose.type === 'taken';
                
                return (
                  <div 
                    key={dose.id}
                    className={`flex items-center justify-between p-3 rounded-xl border ${
                      dose.type === 'skipped' 
                        ? 'bg-muted/30 border-border/50' 
                        : isDoseChange 
                          ? 'bg-amber-500/5 border-amber-500/20' 
                          : 'bg-card border-border'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full ${
                        dose.type === 'skipped' ? 'bg-muted-foreground/40' : isDoseChange ? 'bg-amber-500' : 'bg-primary'
                      }`} />
                      <div>
                        <div className={`font-medium text-sm flex items-center gap-2 ${
                          dose.type === 'skipped' ? 'text-muted-foreground/70' : ''
                        }`}>
                          {formatDose(dose.dose_amount, dose.dose_unit)}
                          {isDoseChange && (
                            <span className="text-[10px] text-amber-600 font-semibold">
                              {dose.dose_amount > prevDose.dose_amount ? '↑' : '↓'} from {formatDose(prevDose.dose_amount, prevDose.dose_unit)}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {dose.type === 'taken' && dose.taken_at 
                            ? format(new Date(dose.taken_at + 'Z'), 'MMM d, yyyy • h:mm a')
                            : format(new Date(dose.scheduled_date + 'T00:00:00'), 'MMM d, yyyy')
                          }
                        </div>
                      </div>
                    </div>
                    {dose.type === 'skipped' ? (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground/60 font-medium">
                        <CircleSlash className="h-3 w-3" />
                        Skipped
                      </div>
                    ) : (
                      <div className="text-xs text-primary font-medium">✓ Taken</div>
                    )}
                  </div>
                );
              })}
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
