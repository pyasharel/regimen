import { useState } from 'react';
import { OnboardingButton } from '../OnboardingButton';

interface GoalWeightScreenProps {
  currentWeight: number | null;
  weightUnit: 'lb' | 'kg';
  initialGoalWeight: number | null;
  onContinue: (goalWeight: number) => void;
}

export function GoalWeightScreen({ 
  currentWeight, 
  weightUnit, 
  initialGoalWeight, 
  onContinue 
}: GoalWeightScreenProps) {
  // Better default: start at 90% of current weight or reasonable default
  const defaultWeight = currentWeight ? Math.round(currentWeight * 0.9) : (weightUnit === 'lb' ? 180 : 82);
  const [goalWeight, setGoalWeight] = useState<number>(initialGoalWeight || defaultWeight);

  // Calculate min/max for slider - reasonable range ±50% of current weight
  const baseWeight = currentWeight || (weightUnit === 'lb' ? 180 : 82);
  const minWeight = Math.max(weightUnit === 'lb' ? 80 : 36, Math.round(baseWeight * 0.5));
  const maxWeight = Math.round(baseWeight * 1.3);
  
  // Calculate weight difference
  const weightDiff = currentWeight ? currentWeight - goalWeight : 0;

  return (
    <div className="flex-1 flex flex-col">
      {/* Headline - Cal AI phrasing */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#333333] animate-in fade-in slide-in-from-bottom-4 duration-500">
          What is your desired weight?
        </h1>
      </div>

      {/* Goal Weight Display */}
      <div 
        className="flex-1 flex flex-col items-center justify-center animate-in fade-in slide-in-from-bottom-4 duration-500"
        style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}
      >
        <div className="text-center mb-8">
          <div className="text-6xl font-bold text-[#333333] tabular-nums">
            {goalWeight}
          </div>
          <div className="text-xl text-[#666666] mt-1">
            {weightUnit}
          </div>
          
          {weightDiff > 0 && (
            <div className="mt-4 text-primary font-medium animate-in fade-in duration-300">
              −{weightDiff} {weightUnit} from current
            </div>
          )}
          {weightDiff < 0 && (
            <div className="mt-4 text-[#10B981] font-medium animate-in fade-in duration-300">
              +{Math.abs(weightDiff)} {weightUnit} from current
            </div>
          )}
        </div>

        {/* Slider */}
        <div className="w-full px-4">
          <input
            type="range"
            min={minWeight}
            max={maxWeight}
            value={goalWeight}
            onChange={(e) => setGoalWeight(parseInt(e.target.value))}
            className="w-full h-2 bg-[#E5E5E5] rounded-full appearance-none cursor-pointer accent-primary
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-7
              [&::-webkit-slider-thumb]:h-7
              [&::-webkit-slider-thumb]:bg-primary
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:shadow-lg
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:transition-transform
              [&::-webkit-slider-thumb]:hover:scale-110
              [&::-webkit-slider-thumb]:active:scale-95
              [&::-moz-range-thumb]:w-7
              [&::-moz-range-thumb]:h-7
              [&::-moz-range-thumb]:bg-primary
              [&::-moz-range-thumb]:border-0
              [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:shadow-lg
              [&::-moz-range-thumb]:cursor-pointer
            "
          />
          <div className="flex justify-between text-sm text-[#999999] mt-2">
            <span>{minWeight} {weightUnit}</span>
            <span>{maxWeight} {weightUnit}</span>
          </div>
        </div>
      </div>

      {/* Helper text */}
      <p 
        className="text-center text-sm text-[#999999] mb-4 animate-in fade-in duration-500"
        style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}
      >
        You can adjust this anytime
      </p>

      {/* CTA */}
      <OnboardingButton onClick={() => onContinue(goalWeight)}>
        Continue
      </OnboardingButton>
    </div>
  );
}
