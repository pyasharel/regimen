import { OnboardingButton } from '../OnboardingButton';
import { PathRouting } from '../hooks/useOnboardingState';

interface PersonalizationScreenProps {
  pathRouting: PathRouting | null;
  onContinue: () => void;
}

export function PersonalizationScreen({ pathRouting, onContinue }: PersonalizationScreenProps) {
  const headline = pathRouting === 'A'
    ? "Great. Let's personalize your GLP-1 experience."
    : "Great. Let's set up your protocol tracking.";

  return (
    <div className="flex-1 flex flex-col">
      {/* Content centered */}
      <div className="flex-1 flex flex-col justify-center">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h1 className="text-2xl font-bold text-[#333333] mb-3">
            {headline}
          </h1>
          <p className="text-lg text-[#666666]">
            Takes about 2 minutes.
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="animate-in fade-in duration-500" style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}>
        <OnboardingButton onClick={onContinue}>
          Continue
        </OnboardingButton>
      </div>
    </div>
  );
}
