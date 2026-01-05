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
      {/* Headline - cleaner without icon */}
      <div className="mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h1 className="text-2xl font-bold text-[#333333]">
          Health Disclaimer
        </h1>
      </div>

      {/* Content */}
      <div 
        className="flex-1 animate-in fade-in slide-in-from-bottom-4 duration-500"
        style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}
      >
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <p className="text-[#666666] leading-relaxed text-sm">
            The information provided by this app is for <span className="font-medium">tracking and educational purposes only</span>. 
            Regimen should not be used as a substitute for professional medical advice, diagnosis, or treatment.
          </p>
          <p className="text-[#666666] leading-relaxed text-sm mt-4">
            Always seek the advice of your physician or other qualified health provider before making any medical decisions or changes to your regimen.
          </p>
        </div>

        {/* Checkbox */}
        <button
          onClick={() => setAccepted(!accepted)}
          className="flex items-center gap-4 mt-6 w-full text-left animate-in fade-in slide-in-from-bottom-4 duration-300"
          style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}
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
          <span className="text-[#333333] font-medium">I accept the health disclaimer</span>
        </button>
      </div>

      {/* CTA */}
      <div 
        className="animate-in fade-in duration-500"
        style={{ animationDelay: '300ms', animationFillMode: 'backwards' }}
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
