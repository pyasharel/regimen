import { OnboardingButton } from '../OnboardingButton';
import { PathRouting } from '../hooks/useOnboardingState';
import { Bell, TrendingUp, Calendar, Pill, BarChart3 } from 'lucide-react';

interface FeaturesScreenProps {
  pathRouting: PathRouting | null;
  onContinue: () => void;
}

const PATH_A_FEATURES = [
  { icon: Bell, label: 'Stay on track with dose reminders' },
  { icon: TrendingUp, label: 'Connect the dots between what you take and your results' },
  { icon: Calendar, label: 'Track dose changes over time' },
  { icon: BarChart3, label: 'See your progress with photos and metrics' },
];

const PATH_B_FEATURES = [
  { icon: Pill, label: 'Track everything you take in one place' },
  { icon: Bell, label: 'Stay on track with dose reminders' },
  { icon: TrendingUp, label: 'Connect the dots between what you take and your results' },
  { icon: BarChart3, label: 'See your progress with photos and metrics' },
];

export function FeaturesScreen({ pathRouting, onContinue }: FeaturesScreenProps) {
  const features = pathRouting === 'A' ? PATH_A_FEATURES : PATH_B_FEATURES;
  const headline = "How Regimen helps you succeed";

  return (
    <div className="flex-1 flex flex-col">
      {/* Headline */}
      <div className="mb-8">
        <h1 
          className="text-2xl font-bold text-[#333333] animate-in fade-in slide-in-from-bottom-4 duration-500"
        >
          {headline}
        </h1>
      </div>

      {/* Features list */}
      <div className="flex-1">
        <div className="space-y-4">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.label}
                className="flex items-center gap-4 bg-white rounded-xl p-4 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300"
                style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'backwards' }}
              >
                {/* Icon */}
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                
                {/* Label */}
                <span className="font-medium text-[#333333]">{feature.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* CTA */}
      <div 
        className="mt-6 animate-in fade-in duration-500"
        style={{ animationDelay: `${features.length * 100 + 200}ms`, animationFillMode: 'backwards' }}
      >
        <OnboardingButton onClick={onContinue}>
          Continue
        </OnboardingButton>
      </div>
    </div>
  );
}
