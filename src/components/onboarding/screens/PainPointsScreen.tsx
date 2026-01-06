import { useState } from 'react';
import { OnboardingButton } from '../OnboardingButton';
import { PathRouting } from '../hooks/useOnboardingState';
import { Check } from 'lucide-react';

interface PainPointsScreenProps {
  pathRouting: PathRouting | null;
  initialPainPoints: string[];
  onContinue: (painPoints: string[]) => void;
  onSkip: () => void;
}

const PATH_A_PAIN_POINTS = [
  { id: 'remembering-doses', label: 'Remembering when to take doses' },
  { id: 'tracking-progress', label: 'Tracking my progress' },
  { id: 'staying-motivated', label: 'Staying motivated' },
  { id: 'understanding-patterns', label: 'Understanding what works' },
];

const PATH_B_PAIN_POINTS = [
  { id: 'managing-multiple', label: 'Managing multiple compounds' },
  { id: 'timing-doses', label: 'Timing my doses correctly' },
  { id: 'tracking-cycles', label: 'Tracking cycles and schedules' },
  { id: 'measuring-results', label: 'Measuring my results' },
  { id: 'staying-organized', label: 'Staying organized' },
];

export function PainPointsScreen({ pathRouting, initialPainPoints, onContinue, onSkip }: PainPointsScreenProps) {
  const [selected, setSelected] = useState<string[]>(initialPainPoints);
  
  const painPoints = pathRouting === 'A' ? PATH_A_PAIN_POINTS : PATH_B_PAIN_POINTS;

  const togglePainPoint = (id: string) => {
    setSelected(prev => 
      prev.includes(id)
        ? prev.filter(p => p !== id)
        : [...prev, id]
    );
  };

  const handleContinue = () => {
    onContinue(selected);
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Headline - rephrased for multi-select clarity */}
      <div className="mb-6">
        <h1 
          className="text-2xl font-bold text-[#333333] animate-in fade-in slide-in-from-bottom-4 duration-500"
        >
          What have been the biggest challenges?
        </h1>
      </div>

      {/* Options */}
      <div className="flex-1">
        <div className="space-y-3">
          {painPoints.map((point, index) => (
            <button
              key={point.id}
              onClick={() => togglePainPoint(point.id)}
              className="w-full flex items-center gap-4 p-4 rounded-xl bg-white border-2 border-transparent hover:border-border transition-all animate-in fade-in slide-in-from-bottom-4 duration-300 active:scale-[0.98]"
              style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'backwards' }}
            >
              {/* Checkbox */}
              <div 
                className={`h-6 w-6 rounded-md border-2 flex items-center justify-center transition-all ${
                  selected.includes(point.id)
                    ? 'bg-primary border-primary'
                    : 'border-[#CCCCCC] bg-white'
                }`}
              >
                {selected.includes(point.id) && (
                  <Check className="h-4 w-4 text-white animate-in zoom-in-50 duration-200" />
                )}
              </div>
              
              {/* Label */}
              <span className="font-medium text-[#333333] text-left">{point.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="mt-6 space-y-3">
        <OnboardingButton 
          onClick={handleContinue}
          disabled={selected.length === 0}
        >
          Continue
        </OnboardingButton>
        
        <button
          onClick={onSkip}
          className="w-full text-sm text-[#999999] hover:text-[#666666] transition-colors py-2"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
