import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Scale, Check, Pencil, ListChecks } from "lucide-react";
import { format, isToday } from "date-fns";
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

  // Only show dashboard when viewing today
  const isViewingToday = isToday(selectedDate);

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

  // Calculate doses remaining for today only
  const dosesRemaining = useMemo(() => {
    if (!isViewingToday) return 0;
    return doses.filter(d => !d.taken && !d.skipped).length;
  }, [doses, isViewingToday]);

  const totalDoses = doses.length;
  const allDone = totalDoses > 0 && dosesRemaining === 0;

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

  // Only show dashboard when viewing today and there's something to show
  if (!isViewingToday || (totalDoses === 0 && !currentWeight)) {
    return null;
  }

  return (
    <>
      <div className="mx-4 mb-3">
        <div className="flex items-stretch gap-2">
          {/* Doses for Today */}
          {totalDoses > 0 && (
            <button
              onClick={onScrollToDoses}
              className="flex-1 flex flex-col items-center justify-center py-2.5 px-2 rounded-xl bg-card border border-border/50 hover:bg-muted/50 active:scale-[0.98] transition-all min-w-0"
            >
              {allDone ? (
                <>
                  <div className="flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-primary">All Done</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">
                    for today
                  </span>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1.5">
                    <ListChecks className="w-3.5 h-3.5 text-primary" />
                    <span className="text-lg font-bold text-foreground">{dosesRemaining}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    doses today
                  </span>
                </>
              )}
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
