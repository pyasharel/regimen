import { useEffect, useRef } from 'react';
import { OnboardingButton } from '../OnboardingButton';

interface OutcomeScreenProps {
  onContinue: () => void;
}

export function OutcomeScreen({ onContinue }: OutcomeScreenProps) {
  const leftLineRef = useRef<SVGPathElement>(null);
  const rightLineRef = useRef<SVGPathElement>(null);

  // Animate the lines drawing
  useEffect(() => {
    const animateLine = (element: SVGPathElement | null, delay: number) => {
      if (!element) return;
      
      const length = element.getTotalLength();
      element.style.strokeDasharray = `${length}`;
      element.style.strokeDashoffset = `${length}`;
      
      setTimeout(() => {
        element.style.transition = 'stroke-dashoffset 1s ease-out';
        element.style.strokeDashoffset = '0';
      }, delay);
    };

    animateLine(leftLineRef.current, 300);
    animateLine(rightLineRef.current, 1100);
  }, []);

  return (
    <div className="flex-1 flex flex-col">
      {/* Headline */}
      <div className="mb-4">
        <h1 
          className="text-2xl font-bold text-[#333333] animate-in fade-in slide-in-from-bottom-4 duration-500"
        >
          Get 2x better results
        </h1>
      </div>

      {/* Subhead */}
      <p 
        className="text-[#666666] mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
        style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}
      >
        Users who track consistently reach goals 2x faster
      </p>

      {/* Comparison graphs */}
      <div 
        className="flex-1 flex items-center justify-center animate-in fade-in duration-700"
        style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}
      >
        <div className="w-full grid grid-cols-2 gap-4">
          {/* Without tracking */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-sm text-[#999999] mb-3 text-center">Without tracking</p>
            <svg viewBox="0 0 100 80" className="w-full h-24">
              {/* Grid */}
              <line x1="10" y1="70" x2="90" y2="70" stroke="#E5E5E5" strokeWidth="1" />
              
              {/* Erratic line */}
              <path
                ref={leftLineRef}
                d="M 10 50 L 25 45 L 35 55 L 45 40 L 55 50 L 65 42 L 75 48 L 90 45"
                fill="none"
                stroke="#CCCCCC"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="text-xs text-[#999999] text-center mt-1">Inconsistent progress</p>
          </div>

          {/* With Regimen */}
          <div className="bg-white rounded-xl p-4 shadow-sm border-2 border-primary/20">
            <p className="text-sm text-primary font-medium mb-3 text-center">With Regimen</p>
            <svg viewBox="0 0 100 80" className="w-full h-24">
              {/* Grid */}
              <line x1="10" y1="70" x2="90" y2="70" stroke="#E5E5E5" strokeWidth="1" />
              
              {/* Steady progress line */}
              <path
                ref={rightLineRef}
                d="M 10 55 Q 30 50 50 40 T 90 20"
                fill="none"
                stroke="hsl(6 100% 69%)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
            <p className="text-xs text-primary text-center mt-1 font-medium">Steady progress</p>
          </div>
        </div>
      </div>

      {/* Stats callout */}
      <div 
        className="bg-primary/5 rounded-xl p-4 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
        style={{ animationDelay: '1500ms', animationFillMode: 'backwards' }}
      >
        <p className="text-center text-[#333333] font-medium">
          <span className="text-primary font-bold">2x</span> faster results with consistent tracking
        </p>
      </div>

      {/* CTA */}
      <OnboardingButton onClick={onContinue}>
        Continue
      </OnboardingButton>
    </div>
  );
}
