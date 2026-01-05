import { useEffect, useRef } from 'react';
import { OnboardingButton } from '../OnboardingButton';

interface OutcomeScreenProps {
  onContinue: () => void;
}

export function OutcomeScreen({ onContinue }: OutcomeScreenProps) {
  const leftBarRef = useRef<HTMLDivElement>(null);
  const rightBarRef = useRef<HTMLDivElement>(null);

  // Animate bars growing up
  useEffect(() => {
    const animateBar = (element: HTMLDivElement | null, targetHeight: string, delay: number) => {
      if (!element) return;
      
      element.style.height = '0%';
      element.style.transition = 'none';
      
      setTimeout(() => {
        element.style.transition = 'height 0.8s ease-out';
        element.style.height = targetHeight;
      }, delay);
    };

    animateBar(leftBarRef.current, '40%', 300);
    animateBar(rightBarRef.current, '80%', 600);
  }, []);

  return (
    <div className="flex-1 flex flex-col">
      {/* Headline */}
      <div className="mb-4">
        <h1 
          className="text-2xl font-bold text-[#333333] animate-in fade-in slide-in-from-bottom-4 duration-500"
        >
          Reach your goals 2x faster
        </h1>
      </div>

      {/* Subhead */}
      <p 
        className="text-[#666666] mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500"
        style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}
      >
        Users who track consistently reach their goals 2x faster
      </p>

      {/* Cal AI-style side-by-side vertical bars */}
      <div 
        className="flex-1 flex items-end justify-center gap-8 pb-8 animate-in fade-in duration-700"
        style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}
      >
        {/* Without tracking */}
        <div className="flex flex-col items-center">
          <div className="h-48 w-20 bg-[#F0F0F0] rounded-t-xl relative overflow-hidden flex items-end">
            <div 
              ref={leftBarRef}
              className="w-full bg-[#CCCCCC] rounded-t-lg"
              style={{ height: '0%' }}
            />
          </div>
          <div className="mt-4 text-center">
            <p className="text-sm font-medium text-[#999999]">Without</p>
            <p className="text-sm font-medium text-[#999999]">tracking</p>
          </div>
        </div>

        {/* With Regimen */}
        <div className="flex flex-col items-center">
          <div className="h-48 w-20 bg-primary/10 rounded-t-xl relative overflow-hidden flex items-end">
            <div 
              ref={rightBarRef}
              className="w-full bg-primary rounded-t-lg"
              style={{ height: '0%' }}
            />
            {/* 2x label */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-white text-primary font-bold text-sm px-2 py-1 rounded-full shadow-sm">
              2x
            </div>
          </div>
          <div className="mt-4 text-center">
            <p className="text-sm font-medium text-primary">With</p>
            <p className="text-sm font-medium text-primary">Regimen</p>
          </div>
        </div>
      </div>

      {/* Bottom text - Cal AI style */}
      <div 
        className="bg-primary/5 rounded-xl p-4 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
        style={{ animationDelay: '1200ms', animationFillMode: 'backwards' }}
      >
        <p className="text-center text-[#333333]">
          <span className="font-bold text-primary">Regimen</span> makes it easy and keeps you accountable.
        </p>
      </div>

      {/* CTA */}
      <OnboardingButton onClick={onContinue}>
        Continue
      </OnboardingButton>
    </div>
  );
}
