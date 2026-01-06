import { OnboardingButton } from '../OnboardingButton';
import { Target, TrendingUp, Dumbbell, Zap, RefreshCw, Clock } from 'lucide-react';

interface PotentialScreenProps {
  goals: string[];
  firstName?: string;
  onContinue: () => void;
}

// Map goal IDs to display info - progressive tense for action-oriented feel
const GOAL_DISPLAY: Record<string, { label: string; icon: typeof Target }> = {
  'lose-weight': { label: 'Losing weight', icon: Target },
  'lose weight': { label: 'Losing weight', icon: Target },
  'weight-loss': { label: 'Losing weight', icon: Target },
  'build-muscle': { label: 'Building muscle', icon: Dumbbell },
  'build muscle': { label: 'Building muscle', icon: Dumbbell },
  'gain-muscle': { label: 'Building muscle', icon: Dumbbell },
  'recovery': { label: 'Recovering faster', icon: RefreshCw },
  'faster-recovery': { label: 'Recovering faster', icon: RefreshCw },
  'energy': { label: 'Boosting energy', icon: Zap },
  'more-energy': { label: 'Boosting energy', icon: Zap },
  'more energy': { label: 'Boosting energy', icon: Zap },
  'boost-energy': { label: 'Boosting energy', icon: Zap },
  'get-healthier': { label: 'Getting healthier', icon: TrendingUp },
  'get healthier': { label: 'Getting healthier', icon: TrendingUp },
  'stay-consistent': { label: 'Building a routine', icon: Clock },
  'stay consistent': { label: 'Building a routine', icon: Clock },
  'consistency': { label: 'Building a routine', icon: Clock },
  'optimization': { label: 'Optimizing performance', icon: TrendingUp },
  'optimize': { label: 'Optimizing performance', icon: TrendingUp },
  'performance': { label: 'Optimizing performance', icon: TrendingUp },
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
            // Normalize goal ID for lookup (lowercase, trim)
            const normalizedId = goalId.toLowerCase().trim();
            const goalInfo = GOAL_DISPLAY[normalizedId] || GOAL_DISPLAY[normalizedId.replace(/ /g, '-')] || { 
              // Fallback: capitalize first letter of each word
              label: goalId.split(/[-_\s]/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '), 
              icon: Target 
            };
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
