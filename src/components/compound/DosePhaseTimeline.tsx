import { useState } from "react";
import { Plus, Pause, Trash2, GripVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
}

const generateId = () => Math.random().toString(36).substring(2, 9);

export const DosePhaseTimeline = ({
  phases,
  onPhasesChange,
  repeatCycle,
  onRepeatCycleChange,
  globalDoseUnit,
  onCalculateUnits,
  isSubscribed = true,
  onShowPaywall
}: DosePhaseTimelineProps) => {
  const addPhase = () => {
    if (!isSubscribed && phases.length >= 1) {
      onShowPaywall?.();
      return;
    }
    
    const lastPhase = phases.filter(p => p.type === 'dose').pop();
    const newPhase: DosePhase = {
      id: generateId(),
      type: 'dose',
      doseAmount: lastPhase?.doseAmount || 0,
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
    if (phase.durationUnit === 'ongoing') return 0; // Ongoing has no fixed days
    const multiplier = phase.durationUnit === 'months' ? 30 : 7;
    return phase.duration * multiplier;
  };

  const getPhaseLabel = (index: number, phase: DosePhase): string => {
    if (phase.type === 'break') {
      const breakIndex = phases.slice(0, index + 1).filter(p => p.type === 'break').length;
      return `Break Period ${breakIndex}`;
    }
    const phaseIndex = phases.slice(0, index + 1).filter(p => p.type === 'dose').length;
    return `Phase ${phaseIndex}`;
  };

  return (
    <div className="space-y-4">
      {/* Phases List */}
      <div className="space-y-3">
        {phases.map((phase, index) => (
          <div
            key={phase.id}
            className={cn(
              "relative rounded-lg border p-4 transition-all",
              phase.type === 'break' 
                ? "bg-destructive/5 border-destructive/30" 
                : "bg-card border-border"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {phase.type === 'break' && (
                  <Pause className="w-4 h-4 text-destructive" />
                )}
                <span className={cn(
                  "text-sm font-medium",
                  phase.type === 'break' ? "text-destructive" : "text-foreground"
                )}>
                  {getPhaseLabel(index, phase)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => removePhase(phase.id)}
                className="p-1.5 rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Break Period Content */}
            {phase.type === 'break' && (
              <p className="text-sm text-destructive mb-3">
                No dosing during break period
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
                  Draw up: {phase.calculatedUnits.toFixed(1)} Units
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Buttons */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addPhase}
          className="flex-1 gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Add Phase
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addBreak}
          className="flex-1 gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/5"
        >
          <Pause className="w-4 h-4" />
          Add Break
        </Button>
      </div>

      {/* Repeat Cycle Toggle */}
      {phases.length > 0 && (
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div>
            <Label className="text-sm font-medium">Repeat Cycle</Label>
            <p className="text-xs text-muted-foreground">
              Restart from Phase 1 after completing all phases
            </p>
          </div>
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
      )}

      {/* Empty State */}
      {phases.length === 0 && (
        <div className="text-center py-6 text-muted-foreground">
          <p className="text-sm">No phases configured</p>
          <p className="text-xs mt-1">Add a phase to create a dosing schedule</p>
        </div>
      )}
    </div>
  );
};
