import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Scale, Check, ListChecks, CalendarClock, Flame, TrendingUp } from "lucide-react";
import { format, isToday, differenceInDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { persistentStorage } from "@/utils/persistentStorage";
import { MetricLogModal } from "@/components/progress/MetricLogModal";
import { useStreaks } from "@/hooks/useStreaks";

interface Dose {
  id: string;
  compound_id: string;
  scheduled_date: string;
  scheduled_time: string;
  dose_amount: number;
  dose_unit: string;
  taken: boolean;
  skipped?: boolean;
  compound_name?: string;
}

interface Compound {
  id: string;
  name: string;
}

interface QuickStatsDashboardProps {
  doses: Dose[];
  compounds: Compound[];
  selectedDate: Date;
  onScrollToDoses: () => void;
  onWeightUpdated: () => void;
}

export const QuickStatsDashboard = ({
  doses,
  compounds,
  selectedDate,
  onScrollToDoses,
  onWeightUpdated,
}: QuickStatsDashboardProps) => {
  const navigate = useNavigate();
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);
  const [weightUnit, setWeightUnit] = useState<"lbs" | "kg">("lbs");
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [adherenceRate, setAdherenceRate] = useState<number | null>(null);
  const [nextDose, setNextDose] = useState<{
    compoundName: string;
    daysUntil: number;
    date: string;
  } | null>(null);

  // Get streak data
  const { data: stats } = useStreaks();
  const currentStreak = stats?.current_streak || 0;

  // Only show dashboard when viewing today
  const isViewingToday = isToday(selectedDate);

  // Load current weight from progress_entries or profile
  useEffect(() => {
    loadWeight();
    loadAdherence();
  }, []);

  const loadWeight = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Try to get from progress_entries first (most recent)
      const { data: progressEntry } = await supabase
        .from('progress_entries')
        .select('metrics')
        .eq('user_id', user.id)
        .not('metrics->weight', 'is', null)
        .order('entry_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (progressEntry?.metrics && typeof progressEntry.metrics === 'object') {
        const metrics = progressEntry.metrics as { weight?: number };
        if (metrics.weight) {
          setCurrentWeight(metrics.weight);
          return;
        }
      }

      // Fallback to profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('current_weight, current_weight_unit')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profile?.current_weight) {
        setCurrentWeight(profile.current_weight);
        if (profile.current_weight_unit === 'kg') {
          setWeightUnit('kg');
        }
      }
    } catch (error) {
      console.error('Error loading weight:', error);
    }
  };

  const loadAdherence = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoStr = format(sevenDaysAgo, 'yyyy-MM-dd');
      const todayStr = format(new Date(), 'yyyy-MM-dd');

      const { data: doseData } = await supabase
        .from('doses')
        .select('taken, skipped')
        .eq('user_id', user.id)
        .gte('scheduled_date', sevenDaysAgoStr)
        .lte('scheduled_date', todayStr);

      if (doseData && doseData.length > 0) {
        // Count taken doses (not skipped) as completed
        const completed = doseData.filter(d => d.taken || d.skipped).length;
        setAdherenceRate(Math.round((completed / doseData.length) * 100));
      }
    } catch (error) {
      console.error('Error loading adherence:', error);
    }
  };

  // Load preferred weight unit
  useEffect(() => {
    const loadUnit = async () => {
      const savedUnit = await persistentStorage.get('weightUnit');
      if (savedUnit === 'kg' || savedUnit === 'lbs') {
        setWeightUnit(savedUnit);
      }
    };
    loadUnit();
  }, []);

  // Load next dose if no doses today
  useEffect(() => {
    if (isViewingToday && doses.length === 0) {
      loadNextDose();
    } else {
      setNextDose(null);
    }
  }, [isViewingToday, doses.length]);

  const loadNextDose = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = format(new Date(), 'yyyy-MM-dd');
      
      const { data } = await supabase
        .from('doses')
        .select('scheduled_date, compound_id, compounds(name)')
        .eq('user_id', user.id)
        .eq('taken', false)
        .eq('skipped', false)
        .gt('scheduled_date', today)
        .order('scheduled_date', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (data) {
        const scheduledDate = new Date(data.scheduled_date + 'T00:00:00');
        const daysUntil = differenceInDays(scheduledDate, new Date());
        const compoundData = data.compounds as { name: string } | null;
        setNextDose({
          compoundName: compoundData?.name || 'Dose',
          daysUntil: Math.max(1, daysUntil),
          date: data.scheduled_date
        });
      }
    } catch (error) {
      console.error('Error loading next dose:', error);
    }
  };

  // Calculate doses remaining for today only
  const dosesRemaining = useMemo(() => {
    if (!isViewingToday) return 0;
    return doses.filter(d => !d.taken && !d.skipped).length;
  }, [doses, isViewingToday]);

  const totalDoses = doses.length;
  const allDone = totalDoses > 0 && dosesRemaining === 0;

  // Format weight for display (compact)
  const formatWeightCompact = (weight: number, unit: "lbs" | "kg"): string => {
    if (unit === 'kg') {
      const kg = weight / 2.20462;
      return `${Math.round(kg)}`;
    }
    return `${Math.round(weight)}`;
  };

  const handleWeightUpdated = () => {
    loadWeight();
    onWeightUpdated();
  };

  // Only show dashboard when viewing today
  if (!isViewingToday) {
    return null;
  }

  return (
    <>
      <div className="mx-4 mb-3">
        <div className="grid grid-cols-4 gap-2">
          {/* Streak */}
          <div className="rounded-lg bg-card border border-border/50 px-2 py-2 flex items-center justify-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-orange-500" fill="currentColor" />
            <span className="text-xs font-bold text-foreground">{currentStreak}</span>
          </div>

          {/* Doses */}
          <button
            onClick={onScrollToDoses}
            className="rounded-lg bg-card border border-border/50 px-2 py-2 flex items-center justify-center gap-1.5 hover:bg-muted/50 active:scale-[0.97] transition-all"
          >
            {dosesRemaining > 0 ? (
              <>
                <ListChecks className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-bold text-foreground">{dosesRemaining}</span>
              </>
            ) : totalDoses > 0 ? (
              <>
                <Check className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold text-primary">Done</span>
              </>
            ) : nextDose ? (
              <>
                <CalendarClock className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold text-foreground">{nextDose.daysUntil}d</span>
              </>
            ) : (
              <>
                <ListChecks className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground">—</span>
              </>
            )}
          </button>

          {/* Adherence */}
          <button
            onClick={() => navigate('/progress')}
            className="rounded-lg bg-card border border-border/50 px-2 py-2 flex items-center justify-center gap-1.5 hover:bg-muted/50 active:scale-[0.97] transition-all"
          >
            <TrendingUp className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-bold text-foreground">
              {adherenceRate !== null ? `${adherenceRate}%` : '—'}
            </span>
          </button>

          {/* Weight */}
          <button
            onClick={() => setShowWeightModal(true)}
            className="rounded-lg bg-card border border-border/50 px-2 py-2 flex items-center justify-center gap-1.5 hover:bg-muted/50 active:scale-[0.97] transition-all"
          >
            <Scale className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-bold text-foreground">
              {currentWeight ? formatWeightCompact(currentWeight, weightUnit) : 'Log'}
            </span>
          </button>
        </div>
      </div>

      {/* Weight Log Modal */}
      <MetricLogModal
        open={showWeightModal}
        onOpenChange={setShowWeightModal}
        metricType="weight"
        onSuccess={handleWeightUpdated}
      />
    </>
  );
};
