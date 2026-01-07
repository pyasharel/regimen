import { useState } from 'react';
import { OnboardingButton } from '../OnboardingButton';
import { RulerSlider } from '@/components/ui/ruler-slider';

interface GoalWeightScreenProps {
  currentWeight: number | null;
  weightUnit: 'lb' | 'kg';
  initialGoalWeight: number | null;
  onContinue: (goalWeight: number) => void;
  onSkip: () => void;
}

export function GoalWeightScreen({ 
  currentWeight, 
  weightUnit, 
  initialGoalWeight, 
  onContinue,
  onSkip 
}: GoalWeightScreenProps) {
  // Default: start at current weight so user can adjust up or down
  const defaultWeight = currentWeight || (weightUnit === 'lb' ? 180 : 82);
  const [goalWeight, setGoalWeight] = useState<number>(initialGoalWeight || defaultWeight);

  // Calculate min/max for slider - fixed realistic bounds
  const minWeight = weightUnit === 'lb' ? 80 : 36;
  const maxWeight = weightUnit === 'lb' ? 400 : 180;
  
  // Calculate weight difference - positive means gaining, negative means losing
  const weightDiff = goalWeight - (currentWeight || 0);
  const isGaining = weightDiff > 0;
  const isLosing = weightDiff < 0;

  return (
    <div className="flex-1 flex flex-col">
      {/* Headline - Cal AI phrasing */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#333333] animate-in fade-in slide-in-from-bottom-4 duration-500">
          What is your desired weight?
        </h1>
      </div>

      {/* Goal Weight Display with Ruler */}
      <div 
        className="flex-1 flex flex-col items-center justify-center animate-in fade-in slide-in-from-bottom-4 duration-500"
        style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}
      >
        <div className="w-full max-w-sm">
          <RulerSlider
            min={minWeight}
            max={maxWeight}
            value={goalWeight}
            onChange={setGoalWeight}
            unit={weightUnit}
          />
        </div>
        
        {/* Weight difference indicator */}
        <div className="mt-6 h-6">
          {isLosing && currentWeight && (
            <div className="text-primary font-medium animate-in fade-in duration-300">
              −{Math.abs(weightDiff)} {weightUnit} from current
            </div>
          )}
          {isGaining && currentWeight && (
            <div className="text-[#10B981] font-medium animate-in fade-in duration-300">
              +{weightDiff} {weightUnit} from current
            </div>
          )}
        </div>
      </div>

      {/* Helper text */}
      <p 
        className="text-center text-sm text-[#999999] mb-4 animate-in fade-in duration-500"
        style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}
      >
        You can adjust this anytime
      </p>

      {/* CTAs */}
      <div className="space-y-3">
        <OnboardingButton onClick={() => onContinue(goalWeight)}>
          Continue
        </OnboardingButton>
        
        <button
          onClick={onSkip}
          className="w-full text-center text-[#999999] text-sm py-2 hover:text-[#666666] transition-colors"
        >
          Skip this step
        </button>
      </div>
    </div>
  );
}
