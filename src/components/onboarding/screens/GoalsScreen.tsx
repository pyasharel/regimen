import { useState } from 'react';
import { OnboardingButton } from '../OnboardingButton';
import { PathRouting } from '../hooks/useOnboardingState';
import { Check } from 'lucide-react';

interface GoalsScreenProps {
  pathRouting: PathRouting | null;
  initialGoals: string[];
  onContinue: (goals: string[]) => void;
}

const PATH_A_GOALS = [
  { id: 'lose-weight', label: 'Lose weight' },
  { id: 'more-energy', label: 'Boost energy' },
  { id: 'get-healthier', label: 'Get healthier' },
  { id: 'stay-consistent', label: 'Build a routine' },
];

const PATH_B_GOALS = [
  { id: 'lose-weight', label: 'Lose weight' },
  { id: 'build-muscle', label: 'Build muscle' },
  { id: 'recovery', label: 'Recover faster' },
  { id: 'energy', label: 'Boost energy' },
  { id: 'stay-consistent', label: 'Build a routine' },
  { id: 'optimization', label: 'Optimize performance' },
];

export function GoalsScreen({ pathRouting, initialGoals, onContinue }: GoalsScreenProps) {
  const [selectedGoals, setSelectedGoals] = useState<string[]>(initialGoals);
  
  const goals = pathRouting === 'A' ? PATH_A_GOALS : PATH_B_GOALS;

  const toggleGoal = (goalId: string) => {
    setSelectedGoals(prev => 
      prev.includes(goalId)
        ? prev.filter(g => g !== goalId)
        : [...prev, goalId]
    );
  };

  const handleContinue = () => {
    onContinue(selectedGoals);
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Headline */}
      <div className="mb-6">
        <h1 
          className="text-2xl font-bold text-[#333333] animate-in fade-in slide-in-from-bottom-4 duration-500"
        >
          What are you hoping to achieve?
        </h1>
      </div>


      {/* Options - Checkbox style */}
      <div className="flex-1">
        <div className="space-y-3">
          {goals.map((goal, index) => (
            <button
              key={goal.id}
              onClick={() => toggleGoal(goal.id)}
              className="w-full flex items-center gap-4 p-4 rounded-xl bg-white border-2 border-transparent hover:border-border transition-all animate-in fade-in slide-in-from-bottom-4 duration-300 active:scale-[0.98]"
              style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'backwards' }}
            >
              {/* Checkbox */}
              <div 
                className={`h-6 w-6 rounded-md border-2 flex items-center justify-center transition-all ${
                  selectedGoals.includes(goal.id)
                    ? 'bg-primary border-primary'
                    : 'border-[#CCCCCC] bg-white'
                }`}
              >
                {selectedGoals.includes(goal.id) && (
                  <Check className="h-4 w-4 text-white animate-in zoom-in-50 duration-200" />
                )}
              </div>
              
              {/* Label */}
              <span className="font-medium text-[#333333]">{goal.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="mt-6">
        <OnboardingButton 
          onClick={handleContinue}
          disabled={selectedGoals.length === 0}
        >
          Continue
        </OnboardingButton>
      </div>
    </div>
  );
}
