import { useEffect, useState } from 'react';
import { OnboardingButton } from '../OnboardingButton';
import { Check } from 'lucide-react';

interface GoalValidationScreenProps {
  currentWeight: number | null;
  goalWeight: number | null;
  weightUnit: 'lb' | 'kg';
  onContinue: () => void;
}

export function GoalValidationScreen({ 
  currentWeight, 
  goalWeight, 
  weightUnit,
  onContinue 
}: GoalValidationScreenProps) {
  const [animatedDiff, setAnimatedDiff] = useState(0);
  
  const weightDiff = currentWeight && goalWeight ? Math.abs(currentWeight - goalWeight) : 0;
  const percentChange = currentWeight ? (weightDiff / currentWeight) * 100 : 0;
  const isAggressive = percentChange > 30;

  // Animate the weight difference counting up
  useEffect(() => {
    if (weightDiff === 0) return;
    
    const duration = 1000;
    const steps = 30;
    const increment = weightDiff / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= weightDiff) {
        setAnimatedDiff(weightDiff);
        clearInterval(timer);
      } else {
        setAnimatedDiff(Math.round(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [weightDiff]);

  return (
    <div className="flex-1 flex flex-col">
      {/* Content centered */}
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        {/* Checkmark */}
        <div 
          className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-6 animate-in zoom-in-50 duration-500"
        >
          <Check className="h-8 w-8 text-primary" />
        </div>

        {/* Headline */}
        <h1 
          className="text-2xl font-bold text-[#333333] mb-3 animate-in fade-in slide-in-from-bottom-4 duration-500"
          style={{ animationDelay: '150ms', animationFillMode: 'backwards' }}
        >
          {isAggressive ? "That's ambitious." : "That's achievable."}
        </h1>

        {/* Weight journey visual */}
        <div 
          className="flex items-center justify-center gap-4 my-8 animate-in fade-in slide-in-from-bottom-4 duration-500"
          style={{ animationDelay: '250ms', animationFillMode: 'backwards' }}
        >
          <div className="text-center">
            <div className="text-3xl font-bold text-[#999999]">{currentWeight}</div>
            <div className="text-sm text-[#999999]">{weightUnit}</div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="w-12 h-0.5 bg-[#E5E5E5]" />
            <div className="text-primary font-bold text-lg">
              -{animatedDiff}
            </div>
            <div className="w-12 h-0.5 bg-primary" />
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">{goalWeight}</div>
            <div className="text-sm text-[#666666]">{weightUnit}</div>
          </div>
        </div>

        {/* Motivational text */}
        <p 
          className="text-lg text-[#666666] max-w-[280px] animate-in fade-in slide-in-from-bottom-4 duration-500"
          style={{ animationDelay: '350ms', animationFillMode: 'backwards' }}
        >
          {isAggressive 
            ? "We'll help you track every step of the way."
            : "People who track consistently get there faster."
          }
        </p>
      </div>

      {/* CTA */}
      <div 
        className="animate-in fade-in duration-500"
        style={{ animationDelay: '500ms', animationFillMode: 'backwards' }}
      >
        <OnboardingButton onClick={onContinue}>
          Continue
        </OnboardingButton>
      </div>
    </div>
  );
}
