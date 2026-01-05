import { useEffect, useState } from 'react';
import { OnboardingButton } from '../OnboardingButton';

interface LongTermResultsScreenProps {
  onContinue: () => void;
}

export function LongTermResultsScreen({ onContinue }: LongTermResultsScreenProps) {
  const [animatedPercent, setAnimatedPercent] = useState(0);

  // Animate the percentage counting up
  useEffect(() => {
    const duration = 1200;
    const steps = 40;
    const targetPercent = 80;
    const increment = targetPercent / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= targetPercent) {
        setAnimatedPercent(targetPercent);
        clearInterval(timer);
      } else {
        setAnimatedPercent(Math.round(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex-1 flex flex-col">
      {/* Headline */}
      <div className="mb-6">
        <h1 
          className="text-2xl font-bold text-[#333333] animate-in fade-in slide-in-from-bottom-4 duration-500"
        >
          Regimen creates long-term results
        </h1>
      </div>

      {/* Main stat */}
      <div 
        className="flex-1 flex flex-col items-center justify-center animate-in fade-in slide-in-from-bottom-4 duration-500"
        style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}
      >
        {/* Big number */}
        <div className="text-center mb-8">
          <div className="text-7xl font-bold text-primary tabular-nums">
            {animatedPercent}%
          </div>
          <p className="text-lg text-[#666666] mt-3 max-w-[280px]">
            of Regimen users maintain their results even 6 months later
          </p>
        </div>

        {/* Visual bar chart */}
        <div className="w-full max-w-[280px] space-y-4">
          {/* 6 month bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[#666666]">6 months</span>
              <span className="font-semibold text-primary">80%</span>
            </div>
            <div className="h-3 bg-[#E5E5E5] rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${animatedPercent}%` }}
              />
            </div>
          </div>

          {/* Comparison bar - without tracking */}
          <div className="space-y-2 opacity-60">
            <div className="flex justify-between text-sm">
              <span className="text-[#999999]">Without tracking</span>
              <span className="text-[#999999]">~35%</span>
            </div>
            <div className="h-3 bg-[#E5E5E5] rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#CCCCCC] rounded-full transition-all duration-1000 ease-out delay-300"
                style={{ width: `${animatedPercent > 35 ? 35 : animatedPercent * 0.44}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div 
        className="animate-in fade-in duration-500"
        style={{ animationDelay: '600ms', animationFillMode: 'backwards' }}
      >
        <OnboardingButton onClick={onContinue}>
          Continue
        </OnboardingButton>
      </div>
    </div>
  );
}
