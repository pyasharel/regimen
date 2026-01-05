import { OnboardingButton } from '../OnboardingButton';
import { PathRouting } from '../hooks/useOnboardingState';
import { Check, Bell, TrendingUp, Calendar, Pill, BarChart3 } from 'lucide-react';

interface FeaturesScreenProps {
  pathRouting: PathRouting | null;
  onContinue: () => void;
}

const PATH_A_FEATURES = [
  { icon: Bell, label: 'Smart dose reminders' },
  { icon: TrendingUp, label: 'Weight tracking with insights' },
  { icon: Calendar, label: 'Dose escalation schedule' },
  { icon: BarChart3, label: 'Progress visualization' },
];

const PATH_B_FEATURES = [
  { icon: Pill, label: 'Multi-compound tracking' },
  { icon: Bell, label: 'Smart dose reminders' },
  { icon: Calendar, label: 'Cycle and schedule management' },
  { icon: BarChart3, label: 'Progress visualization' },
];

export function FeaturesScreen({ pathRouting, onContinue }: FeaturesScreenProps) {
  const features = pathRouting === 'A' ? PATH_A_FEATURES : PATH_B_FEATURES;
  const headline = pathRouting === 'A' 
    ? "Track smart and unlock unique insights"
    : "Your full stack, organized";

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
                
                {/* Checkmark */}
                <div className="ml-auto">
                  <Check className="h-5 w-5 text-primary" />
                </div>
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
