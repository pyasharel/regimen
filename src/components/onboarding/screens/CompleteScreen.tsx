import { OnboardingButton } from '../OnboardingButton';
import { Check } from 'lucide-react';

interface CompleteScreenProps {
  firstName: string;
  medicationName?: string;
  onContinue: () => void;
}

export function CompleteScreen({ firstName, medicationName, onContinue }: CompleteScreenProps) {
  const headline = firstName 
    ? `You're all set, ${firstName}!`
    : "You're all set!";
  
  const body = medicationName
    ? `Your ${medicationName} is ready to track.`
    : "Add your first compound to get started.";

  return (
    <div className="flex-1 flex flex-col">
      {/* Content positioned ~40% from top */}
      <div className="pt-[20vh] flex flex-col items-center text-center">
        {/* Success checkmark */}
        <div 
          className="h-20 w-20 rounded-full bg-primary flex items-center justify-center mb-6 animate-in zoom-in-50 duration-500"
        >
          <Check className="h-10 w-10 text-white" />
        </div>

        {/* Headline */}
        <h1 
          className="text-2xl font-bold text-[#333333] mb-3 animate-in fade-in slide-in-from-bottom-4 duration-500"
          style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}
        >
          {headline}
        </h1>

        {/* Body */}
        <p 
          className="text-lg text-[#666666] animate-in fade-in slide-in-from-bottom-4 duration-500"
          style={{ animationDelay: '300ms', animationFillMode: 'backwards' }}
        >
          {body}
        </p>
      </div>

      {/* CTA */}
      <div className="mt-auto">
        <OnboardingButton onClick={onContinue}>
          Let's Go
        </OnboardingButton>
      </div>
    </div>
  );
}
