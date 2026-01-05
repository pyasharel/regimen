import { OnboardingButton } from '../OnboardingButton';
import { Shield } from 'lucide-react';

interface PrivacyScreenProps {
  onContinue: () => void;
}

export function PrivacyScreen({ onContinue }: PrivacyScreenProps) {
  return (
    <div className="flex-1 flex flex-col">
      {/* Content centered */}
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        {/* Shield icon */}
        <div 
          className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-6 animate-in zoom-in-50 duration-500"
        >
          <Shield className="h-10 w-10 text-primary" />
        </div>

        {/* Headline */}
        <h1 
          className="text-2xl font-bold text-[#333333] mb-3 animate-in fade-in slide-in-from-bottom-4 duration-500"
          style={{ animationDelay: '150ms', animationFillMode: 'backwards' }}
        >
          Thank you for trusting us
        </h1>

        {/* Body */}
        <p 
          className="text-lg text-[#666666] max-w-[300px] animate-in fade-in slide-in-from-bottom-4 duration-500"
          style={{ animationDelay: '250ms', animationFillMode: 'backwards' }}
        >
          Your data stays private. We don't sell your information. Your protocols and progress stay between you and your goals.
        </p>
      </div>

      {/* CTA */}
      <div 
        className="animate-in fade-in duration-500"
        style={{ animationDelay: '400ms', animationFillMode: 'backwards' }}
      >
        <OnboardingButton onClick={onContinue}>
          Continue
        </OnboardingButton>
      </div>
    </div>
  );
}
