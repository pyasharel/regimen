import { OnboardingButton } from '../OnboardingButton';
import { Target, TrendingUp, Dumbbell, Zap, RefreshCw, Clock } from 'lucide-react';

interface PotentialScreenProps {
  goals: string[];
  firstName?: string;
  onContinue: () => void;
}

// Map goal IDs to display info
const GOAL_DISPLAY: Record<string, { label: string; icon: typeof Target }> = {
  'lose-weight': { label: 'Lose weight', icon: Target },
  'build-muscle': { label: 'Build muscle', icon: Dumbbell },
  'recovery': { label: 'Recover faster', icon: RefreshCw },
  'energy': { label: 'Boost energy', icon: Zap },
  'more-energy': { label: 'More energy', icon: Zap },
  'get-healthier': { label: 'Get healthier', icon: TrendingUp },
  'stay-consistent': { label: 'Build a routine', icon: Clock },
  'optimization': { label: 'Optimize performance', icon: TrendingUp },
};

export function PotentialScreen({ 
  goals,
  firstName,
  onContinue 
}: PotentialScreenProps) {
  const headline = firstName 
    ? `You have great potential, ${firstName}!`
    : "You have great potential!";

  return (
    <div className="flex-1 flex flex-col">
      {/* Headline */}
      <div className="mb-6">
        <h1 
          className="text-2xl font-bold text-[#333333] animate-in fade-in slide-in-from-bottom-4 duration-500"
        >
          {headline}
        </h1>
      </div>

      {/* Subhead */}
      <p 
        className="text-[#666666] mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
        style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}
      >
        Here's what you're working toward:
      </p>

      {/* Goals list */}
      <div 
        className="flex-1 animate-in fade-in slide-in-from-bottom-4 duration-500"
        style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}
      >
        <div className="bg-white rounded-xl p-5 shadow-sm space-y-4">
          {goals.map((goalId, index) => {
            const goalInfo = GOAL_DISPLAY[goalId] || { label: goalId, icon: Target };
            const Icon = goalInfo.icon;
            
            return (
              <div 
                key={goalId}
                className="flex items-center gap-4 animate-in fade-in slide-in-from-left duration-300"
                style={{ animationDelay: `${300 + index * 100}ms`, animationFillMode: 'backwards' }}
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <span className="font-medium text-[#333333]">{goalInfo.label}</span>
              </div>
            );
          })}
        </div>

      </div>

      {/* CTA */}
      <div 
        className="mt-6 animate-in fade-in duration-500"
        style={{ animationDelay: '700ms', animationFillMode: 'backwards' }}
      >
        <OnboardingButton onClick={onContinue}>
          Continue
        </OnboardingButton>
      </div>
    </div>
  );
}
