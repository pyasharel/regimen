import { useEffect, useRef } from 'react';
import { OnboardingButton } from '../OnboardingButton';
import { TrendingUp } from 'lucide-react';

interface PotentialScreenProps {
  currentWeight: number | null;
  goalWeight: number | null;
  weightUnit: 'lb' | 'kg';
  onContinue: () => void;
}

export function PotentialScreen({ 
  currentWeight, 
  goalWeight, 
  weightUnit,
  onContinue 
}: PotentialScreenProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  // Calculate estimated timeline (rough estimate: 1-2 lbs per week)
  const weightDiff = currentWeight && goalWeight ? Math.abs(currentWeight - goalWeight) : 0;
  const weeksEstimate = Math.ceil(weightDiff / 1.5); // 1.5 lbs/week average
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + weeksEstimate * 7);
  const formattedDate = targetDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Draw animated line
  useEffect(() => {
    if (!svgRef.current) return;
    
    const path = svgRef.current.querySelector('path');
    if (!path) return;

    const length = path.getTotalLength();
    path.style.strokeDasharray = `${length}`;
    path.style.strokeDashoffset = `${length}`;
    
    // Trigger animation
    requestAnimationFrame(() => {
      path.style.transition = 'stroke-dashoffset 1.5s ease-out';
      path.style.strokeDashoffset = '0';
    });
  }, []);

  return (
    <div className="flex-1 flex flex-col">
      {/* Headline */}
      <div className="mb-6">
        <h1 
          className="text-2xl font-bold text-[#333333] animate-in fade-in slide-in-from-bottom-4 duration-500"
        >
          You have great potential to crush your goal
        </h1>
      </div>

      {/* Subhead */}
      <p 
        className="text-[#666666] mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
        style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}
      >
        Based on your profile, consistent tracking can help you reach{' '}
        <span className="font-semibold text-primary">{goalWeight} {weightUnit}</span>{' '}
        by <span className="font-semibold">{formattedDate}</span>.
      </p>

      {/* Animated Graph */}
      <div 
        className="flex-1 flex items-center justify-center animate-in fade-in duration-700"
        style={{ animationDelay: '300ms', animationFillMode: 'backwards' }}
      >
        <div className="w-full max-w-[300px] aspect-[4/3] bg-white rounded-xl p-4 shadow-sm">
          <svg ref={svgRef} viewBox="0 0 200 120" className="w-full h-full">
            {/* Grid lines */}
            <line x1="20" y1="20" x2="20" y2="100" stroke="#E5E5E5" strokeWidth="1" />
            <line x1="20" y1="100" x2="190" y2="100" stroke="#E5E5E5" strokeWidth="1" />
            
            {/* Dashed horizontal lines */}
            <line x1="20" y1="40" x2="190" y2="40" stroke="#E5E5E5" strokeWidth="1" strokeDasharray="4 4" />
            <line x1="20" y1="60" x2="190" y2="60" stroke="#E5E5E5" strokeWidth="1" strokeDasharray="4 4" />
            <line x1="20" y1="80" x2="190" y2="80" stroke="#E5E5E5" strokeWidth="1" strokeDasharray="4 4" />
            
            {/* Progress line - animated */}
            <path
              d="M 25 30 Q 60 35 90 50 T 185 85"
              fill="none"
              stroke="hsl(6 100% 69%)"
              strokeWidth="3"
              strokeLinecap="round"
            />
            
            {/* Start dot */}
            <circle cx="25" cy="30" r="5" fill="hsl(6 100% 69%)" className="animate-in zoom-in-50 duration-300" style={{ animationDelay: '1500ms', animationFillMode: 'backwards' }} />
            
            {/* End dot */}
            <circle cx="185" cy="85" r="5" fill="hsl(142 71% 45%)" className="animate-in zoom-in-50 duration-300" style={{ animationDelay: '1700ms', animationFillMode: 'backwards' }} />
            
            {/* Labels */}
            <text x="25" y="18" fontSize="10" fill="#666666" textAnchor="middle">{currentWeight}</text>
            <text x="185" y="98" fontSize="10" fill="hsl(142 71% 45%)" textAnchor="middle" fontWeight="600">{goalWeight}</text>
          </svg>
          
          {/* Legend */}
          <div className="flex justify-between text-xs text-[#999999] mt-2 px-1">
            <span>Today</span>
            <span>{formattedDate}</span>
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
