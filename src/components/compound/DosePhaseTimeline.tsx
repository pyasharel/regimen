import { Plus, Pause, Trash2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export interface DosePhase {
  id: string;
  type: 'dose' | 'break';
  doseAmount: number;
  doseUnit: string;
  duration: number;
  durationUnit: 'weeks' | 'months' | 'ongoing';
  calculatedUnits?: number | null;
}

interface DosePhaseTimelineProps {
  phases: DosePhase[];
  onPhasesChange: (phases: DosePhase[]) => void;
  repeatCycle: boolean;
  onRepeatCycleChange: (repeat: boolean) => void;
  globalDoseUnit: string;
  onCalculateUnits?: (doseAmount: number) => number | null;
  isSubscribed?: boolean;
  onShowPaywall?: () => void;
  startDate?: string;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

// Calculate current phase based on start date and phase durations
const getCurrentPhaseIndex = (phases: DosePhase[], startDate?: string): number => {
  if (!startDate || phases.length === 0) return -1;
  
  const start = new Date(startDate);
  const now = new Date();
  const daysSinceStart = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysSinceStart < 0) return -1; // Not started yet
  
  let accumulatedDays = 0;
  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i];
    if (phase.durationUnit === 'ongoing') {
      return i; // If ongoing, this is the current phase
    }
    const phaseDays = phase.durationUnit === 'months' ? phase.duration * 30 : phase.duration * 7;
    if (daysSinceStart < accumulatedDays + phaseDays) {
      return i;
    }
    accumulatedDays += phaseDays;
  }
  
  return phases.length - 1; // Return last phase if past all phases
};

export const DosePhaseTimeline = ({
  phases,
  onPhasesChange,
  repeatCycle,
  onRepeatCycleChange,
  globalDoseUnit,
  onCalculateUnits,
  isSubscribed = true,
  onShowPaywall,
  startDate
}: DosePhaseTimelineProps) => {
  const { toast } = useToast();
  const currentPhaseIndex = getCurrentPhaseIndex(phases, startDate);
  
  // Check if last phase is ongoing
  const lastPhaseIsOngoing = phases.length > 0 && phases[phases.length - 1].durationUnit === 'ongoing';
  
  const addPhase = () => {
    if (!isSubscribed && phases.length >= 1) {
      onShowPaywall?.();
      return;
    }
    
    // If last phase is ongoing, show a message
    if (lastPhaseIsOngoing) {
      toast({
        title: "Change last phase duration first",
        description: "Set a specific duration (weeks/months) before adding another phase",
      });
      return;
    }
    
    const lastDosePhase = phases.filter(p => p.type === 'dose').pop();
    const newPhase: DosePhase = {
      id: generateId(),
      type: 'dose',
      doseAmount: lastDosePhase?.doseAmount || 0,
      doseUnit: globalDoseUnit,
      duration: 4,
      durationUnit: 'weeks',
      calculatedUnits: null
    };
    onPhasesChange([...phases, newPhase]);
  };

  const addBreak = () => {
    if (!isSubscribed && phases.length >= 1) {
      onShowPaywall?.();
      return;
    }
    
    // If last phase is ongoing, show a message
    if (lastPhaseIsOngoing) {
      toast({
        title: "Change last phase duration first",
        description: "Set a specific duration (weeks/months) before adding an off cycle",
      });
      return;
    }
    
    const newBreak: DosePhase = {
      id: generateId(),
      type: 'break',
      doseAmount: 0,
      doseUnit: globalDoseUnit,
      duration: 2,
      durationUnit: 'weeks',
      calculatedUnits: null
    };
    onPhasesChange([...phases, newBreak]);
  };

  const updatePhase = (id: string, updates: Partial<DosePhase>) => {
    onPhasesChange(
      phases.map(phase => {
        if (phase.id === id) {
          const updatedPhase = { ...phase, ...updates };
          // Recalculate units when dose changes
          if (updates.doseAmount !== undefined && onCalculateUnits) {
            updatedPhase.calculatedUnits = onCalculateUnits(updates.doseAmount);
          }
          return updatedPhase;
        }
        return phase;
      })
    );
  };

  const removePhase = (id: string) => {
    onPhasesChange(phases.filter(phase => phase.id !== id));
  };

  const getTotalDays = (phase: DosePhase): number => {
    if (phase.durationUnit === 'ongoing') return 0;
    const multiplier = phase.durationUnit === 'months' ? 30 : 7;
    return phase.duration * multiplier;
  };

  const getPhaseLabel = (index: number, phase: DosePhase): string => {
    if (phase.type === 'break') {
      const breakIndex = phases.slice(0, index + 1).filter(p => p.type === 'break').length;
      return `Off Cycle ${breakIndex}`;
    }
    const phaseIndex = phases.slice(0, index + 1).filter(p => p.type === 'dose').length;
    return `Phase ${phaseIndex}`;
  };

  return (
    <div className="space-y-3">
      {/* Phases List */}
      <div className="space-y-3">
        {phases.map((phase, index) => {
          const isCurrentPhase = index === currentPhaseIndex;
          const isBreak = phase.type === 'break';
          
          return (
            <div
              key={phase.id}
              className={cn(
                "relative rounded-lg border p-4 transition-all",
                isBreak 
                  ? "bg-muted/30 border-muted-foreground/30" 
                  : "bg-card border-border",
                isCurrentPhase && "ring-2 ring-primary ring-offset-1 ring-offset-background"
              )}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {isBreak && (
                    <Pause className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className={cn(
                    "text-sm font-medium",
                    isBreak ? "text-muted-foreground" : "text-foreground"
                  )}>
                    {getPhaseLabel(index, phase)}
                  </span>
                  {isCurrentPhase && (
                    <span className="text-[10px] uppercase tracking-wide font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                      Active
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removePhase(phase.id)}
                  className="p-1.5 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Break Period Content */}
              {isBreak && (
                <p className="text-sm text-muted-foreground mb-3">
                  No dosing during off cycle
                </p>
              )}

              {/* Dose Phase Content */}
              {phase.type === 'dose' && (
                <div className="flex items-center gap-2 mb-3">
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={phase.doseAmount || ''}
                    onChange={(e) => updatePhase(phase.id, { 
                      doseAmount: parseFloat(e.target.value) || 0 
                    })}
                    placeholder="0"
                    className="w-20 h-10 text-center bg-input"
                  />
                  <div className="flex rounded-lg overflow-hidden border border-border">
                    {['mcg', 'mg'].map((unit) => (
                      <button
                        key={unit}
                        type="button"
                        onClick={() => updatePhase(phase.id, { doseUnit: unit })}
                        className={cn(
                          "px-4 py-2 text-sm font-medium transition-colors",
                          phase.doseUnit === unit
                            ? "bg-muted text-foreground"
                            : "bg-card text-muted-foreground hover:bg-muted/50"
                        )}
                      >
                        {unit}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Duration Row */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Duration:</span>
                {phase.durationUnit !== 'ongoing' && (
                  <Input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    value={phase.duration || ''}
                    onChange={(e) => updatePhase(phase.id, { 
                      duration: parseInt(e.target.value) || 1 
                    })}
                    className="w-16 h-9 text-center bg-input"
                  />
                )}
                <select
                  value={phase.durationUnit}
                  onChange={(e) => updatePhase(phase.id, { 
                    durationUnit: e.target.value as 'weeks' | 'months' | 'ongoing' 
                  })}
                  className="h-9 bg-input border-border rounded-lg border px-2 text-sm text-primary"
                >
                  <option value="weeks">Weeks</option>
                  <option value="months">Months</option>
                  <option value="ongoing">Ongoing</option>
                </select>
              </div>

              {/* Total Days & Calculated Units */}
              <div className="mt-2 space-y-1">
                {phase.durationUnit !== 'ongoing' && (
                  <p className="text-xs text-muted-foreground">
                    Total: {getTotalDays(phase)} days
                  </p>
                )}
                {phase.durationUnit === 'ongoing' && (
                  <p className="text-xs text-muted-foreground">
                    Continues until you add the next phase
                  </p>
                )}
                {phase.type === 'dose' && phase.calculatedUnits !== null && phase.calculatedUnits !== undefined && (
                  <p className="text-sm font-medium text-primary">
                    Draw up: {Math.round(phase.calculatedUnits)} units
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Links - Minimal hyperlink style */}
      <div className="flex items-center justify-center gap-6 py-2">
        <button
          type="button"
          onClick={addPhase}
          className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Phase
        </button>
        <button
          type="button"
          onClick={addBreak}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Pause className="w-4 h-4" />
          Add Off Cycle
        </button>
      </div>

      {/* Repeat Cycle Toggle */}
      {phases.length > 0 && (
        <div className="pt-3 border-t border-border space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Repeat Cycle</Label>
            <button
              type="button"
              onClick={() => onRepeatCycleChange(!repeatCycle)}
              className={cn(
                "w-12 h-7 rounded-full transition-colors relative",
                repeatCycle ? "bg-primary" : "bg-muted"
              )}
            >
              <span
                className={cn(
                  "absolute top-1 w-5 h-5 rounded-full bg-white transition-transform",
                  repeatCycle ? "left-6" : "left-1"
                )}
              />
            </button>
          </div>
          {repeatCycle && (
            <p className="text-xs text-muted-foreground">
              This protocol will repeat after completing all phases
            </p>
          )}
        </div>
      )}

      {/* Empty State */}
      {phases.length === 0 && (
        <div className="text-center py-4 text-muted-foreground">
          <p className="text-sm">Define dose and break phases over time</p>
        </div>
      )}
    </div>
  );
};

// Export helper to get current phase dose for syncing with global dose
export const getCurrentPhaseDose = (phases: DosePhase[], startDate?: string): { dose: number; unit: string } | null => {
  const currentIndex = getCurrentPhaseIndex(phases, startDate);
  if (currentIndex === -1 || !phases[currentIndex]) return null;
  
  const currentPhase = phases[currentIndex];
  if (currentPhase.type === 'break') return null;
  
  return { dose: currentPhase.doseAmount, unit: currentPhase.doseUnit };
};
