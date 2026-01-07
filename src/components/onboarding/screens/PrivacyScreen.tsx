import { OnboardingButton } from '../OnboardingButton';
import { Handshake } from 'lucide-react';

interface PrivacyScreenProps {
  onContinue: () => void;
}

export function PrivacyScreen({ onContinue }: PrivacyScreenProps) {
  return (
    <div className="flex-1 flex flex-col">
      {/* Content - pushed up from center */}
      <div className="flex-[0.7] flex flex-col items-center justify-center text-center">
        {/* Partnership illustration - handshake icon with warm styling */}
        <div 
          className="relative mb-8 animate-in zoom-in-50 duration-500"
        >
          {/* Outer glow ring */}
          <div className="absolute inset-0 h-24 w-24 rounded-full bg-primary/5 scale-125" />
          {/* Main circle */}
          <div className="relative h-24 w-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
            <Handshake className="h-12 w-12 text-primary" />
          </div>
        </div>

        {/* Headline */}
        <h1 
          className="text-2xl font-bold text-[#333333] mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
          style={{ animationDelay: '150ms', animationFillMode: 'backwards' }}
        >
          Your privacy matters
        </h1>

        {/* Body - softer styling without shadow */}
        <div 
          className="bg-[#F5F3EF] rounded-xl p-5 max-w-[300px] animate-in fade-in slide-in-from-bottom-4 duration-500"
          style={{ animationDelay: '250ms', animationFillMode: 'backwards' }}
        >
          <p className="text-[#666666] leading-relaxed">
            We never sell your data. Your protocols and progress stay private, just between you and your goals.
          </p>
        </div>

        {/* Warm closing - moved here from subhead */}
        <p 
          className="text-base text-[#666666] font-medium mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
          style={{ animationDelay: '400ms', animationFillMode: 'backwards' }}
        >
          Thank you for trusting us
        </p>
      </div>

      {/* CTA */}
      <div>
        <OnboardingButton onClick={onContinue}>
          Continue
        </OnboardingButton>
      </div>
    </div>
  );
}
