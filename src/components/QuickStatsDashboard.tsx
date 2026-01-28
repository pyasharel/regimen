import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Scale, Pill, Clock, Check, Pencil } from "lucide-react";
import { format, isToday, isFuture, differenceInHours, differenceInDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { persistentStorage } from "@/utils/persistentStorage";
import { MetricLogModal } from "@/components/progress/MetricLogModal";

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
  allDoses?: Dose[]; // All doses including future for "next dose" calculation
  compounds: Compound[];
  selectedDate: Date;
  onScrollToDoses: () => void;
  onWeightUpdated: () => void;
}

export const QuickStatsDashboard = ({
  doses,
  allDoses,
  compounds,
  selectedDate,
  onScrollToDoses,
  onWeightUpdated,
}: QuickStatsDashboardProps) => {
  const navigate = useNavigate();
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);
  const [weightUnit, setWeightUnit] = useState<"lbs" | "kg">("lbs");
  const [showWeightModal, setShowWeightModal] = useState(false);

  // Load current weight from progress_entries or profile
  useEffect(() => {
    loadWeight();
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

  // Calculate doses remaining for selected date
  const dosesRemaining = useMemo(() => {
    return doses.filter(d => !d.taken && !d.skipped).length;
  }, [doses]);

  const totalDoses = doses.length;
  const allDone = totalDoses > 0 && dosesRemaining === 0;

  // Calculate next dose (for today only, find next untaken)
  const nextDose = useMemo(() => {
    if (!isToday(selectedDate)) return null;

    // Get untaken doses for today
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const untakenToday = doses.filter(d => 
      !d.taken && 
      !d.skipped && 
      d.scheduled_date === todayStr
    );

    if (untakenToday.length > 0) {
      // Return first untaken dose
      const dose = untakenToday[0];
      const compound = compounds.find(c => c.id === dose.compound_id);
      return {
        compound_id: dose.compound_id,
        compound_name: compound?.name || dose.compound_name || 'Medication',
        scheduled_time: dose.scheduled_time,
        isToday: true,
        timeLabel: dose.scheduled_time || 'Today'
      };
    }

    return null;
  }, [doses, compounds, selectedDate]);

  // Format weight for display
  const formatWeight = (weight: number, unit: "lbs" | "kg"): string => {
    if (unit === 'kg') {
      // Convert from lbs (stored) to kg
      const kg = weight / 2.20462;
      return `${kg.toFixed(1)} kg`;
    }
    return `${weight.toFixed(1)} lbs`;
  };

  const handleWeightUpdated = () => {
    loadWeight();
    onWeightUpdated();
  };

  // Don't render if no data to show
  if (totalDoses === 0 && !currentWeight && !nextDose) {
    return null;
  }

  return (
    <>
      <div className="mx-4 mb-3">
        <div className="flex items-stretch gap-2">
          {/* Doses Remaining */}
          {totalDoses > 0 && (
            <button
              onClick={onScrollToDoses}
              className="flex-1 flex flex-col items-center justify-center py-2.5 px-2 rounded-xl bg-card border border-border/50 hover:bg-muted/50 active:scale-[0.98] transition-all min-w-0"
            >
              {allDone ? (
                <>
                  <div className="flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-primary">Done</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">
                    All logged
                  </span>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1.5">
                    <Pill className="w-3.5 h-3.5 text-primary" />
                    <span className="text-lg font-bold text-foreground">{dosesRemaining}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    remaining
                  </span>
                </>
              )}
            </button>
          )}

          {/* Next Dose */}
          {nextDose && (
            <button
              onClick={() => navigate(`/compound/${nextDose.compound_id}`)}
              className="flex-1 flex flex-col items-center justify-center py-2.5 px-2 rounded-xl bg-card border border-border/50 hover:bg-muted/50 active:scale-[0.98] transition-all min-w-0"
            >
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold text-foreground truncate max-w-[80px]">
                  {nextDose.compound_name.length > 10 
                    ? nextDose.compound_name.substring(0, 10) + '…' 
                    : nextDose.compound_name}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">
                {nextDose.timeLabel}
              </span>
            </button>
          )}

          {/* Current Weight */}
          <button
            onClick={() => setShowWeightModal(true)}
            className="flex-1 flex flex-col items-center justify-center py-2.5 px-2 rounded-xl bg-card border border-border/50 hover:bg-muted/50 active:scale-[0.98] transition-all min-w-0"
          >
            {currentWeight ? (
              <>
                <div className="flex items-center gap-1">
                  <Scale className="w-3.5 h-3.5 text-primary" />
                  <span className="text-sm font-semibold text-foreground">
                    {formatWeight(currentWeight, weightUnit)}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    Weight
                  </span>
                  <Pencil className="w-2.5 h-2.5 text-muted-foreground" />
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-medium text-primary">Log</span>
                </div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">
                  Weight
                </span>
              </>
            )}
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
