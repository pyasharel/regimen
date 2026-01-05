import { useState } from 'react';
import { OnboardingButton } from '../OnboardingButton';

interface NameScreenProps {
  initialName: string;
  onContinue: (name: string) => void;
  onSkip: () => void;
}

export function NameScreen({ initialName, onContinue, onSkip }: NameScreenProps) {
  const [name, setName] = useState(initialName);

  const handleContinue = () => {
    onContinue(name.trim());
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Headline */}
      <div className="mb-8">
        <h1 
          className="text-2xl font-bold text-[#333333] animate-in fade-in slide-in-from-bottom-4 duration-500"
        >
          What should we call you?
        </h1>
      </div>

      {/* Input */}
      <div 
        className="flex-1 animate-in fade-in slide-in-from-bottom-4 duration-500"
        style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}
      >
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="First name"
          autoFocus
          className="w-full h-14 px-5 rounded-xl bg-white border-2 border-transparent text-lg font-medium focus:border-primary focus:outline-none shadow-sm transition-all"
        />
        <p className="text-sm text-[#999999] mt-3">
          We'll use this to personalize your experience
        </p>
      </div>

      {/* CTAs */}
      <div className="space-y-3">
        <OnboardingButton 
          onClick={handleContinue}
          disabled={!name.trim()}
        >
          Continue
        </OnboardingButton>
        
        <button
          onClick={onSkip}
          className="w-full text-center text-[#999999] text-sm py-2 hover:text-[#666666] transition-colors"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
