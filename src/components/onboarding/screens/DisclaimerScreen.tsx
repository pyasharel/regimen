import { useState } from 'react';
import { OnboardingButton } from '../OnboardingButton';
import { Check } from 'lucide-react';

interface DisclaimerScreenProps {
  onAccept: (accepted: boolean) => void;
}

export function DisclaimerScreen({ onAccept }: DisclaimerScreenProps) {
  const [accepted, setAccepted] = useState(false);

  return (
    <div className="flex-1 flex flex-col">
      {/* Headline */}
      <div className="mb-6">
        <h1 
          className="text-2xl font-bold text-[#333333] animate-in fade-in slide-in-from-bottom-4 duration-500"
        >
          Quick note
        </h1>
      </div>

      {/* Content */}
      <div 
        className="flex-1 animate-in fade-in slide-in-from-bottom-4 duration-500"
        style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}
      >
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <p className="text-[#666666] leading-relaxed">
            Regimen is for tracking purposes only and doesn't provide medical advice. 
            Always consult your healthcare provider about your health decisions.
          </p>
        </div>

        {/* Checkbox */}
        <button
          onClick={() => setAccepted(!accepted)}
          className="flex items-center gap-4 mt-6 w-full text-left"
        >
          <div 
            className={`h-6 w-6 rounded-md border-2 flex items-center justify-center transition-all ${
              accepted
                ? 'bg-primary border-primary'
                : 'border-[#CCCCCC] bg-white'
            }`}
          >
            {accepted && (
              <Check className="h-4 w-4 text-white animate-in zoom-in-50 duration-200" />
            )}
          </div>
          <span className="text-[#333333] font-medium">I understand</span>
        </button>
      </div>

      {/* CTA */}
      <div 
        className="animate-in fade-in duration-500"
        style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}
      >
        <OnboardingButton 
          onClick={() => onAccept(true)}
          disabled={!accepted}
        >
          Continue
        </OnboardingButton>
      </div>
    </div>
  );
}
