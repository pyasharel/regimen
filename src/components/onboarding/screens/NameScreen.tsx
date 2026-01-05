import { useState } from 'react';
import { OnboardingButton } from '../OnboardingButton';

interface NameScreenProps {
  initialName: string;
  onContinue: (name: string) => void;
  onSkip: () => void;
}

export function NameScreen({ initialName, onContinue, onSkip }: NameScreenProps) {
  const [name, setName] = useState(initialName);

  // Sanitize name: remove HTML chars, trim whitespace
  const sanitizeName = (input: string): string => {
    return input
      .replace(/[<>&"']/g, '') // Remove HTML special chars
      .trim()
      .slice(0, 30); // Max 30 characters
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow up to 30 chars
    if (value.length <= 30) {
      setName(value);
    }
  };

  const handleContinue = () => {
    onContinue(sanitizeName(name));
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

      {/* Input - fixed text contrast */}
      <div 
        className="flex-1 animate-in fade-in slide-in-from-bottom-4 duration-500"
        style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}
      >
        <input
          type="text"
          value={name}
          onChange={handleNameChange}
          placeholder="First name"
          autoFocus
          maxLength={30}
          className="w-full h-14 px-5 rounded-xl bg-white border-2 border-transparent text-lg font-medium text-[#333333] placeholder:text-[#999999] focus:border-primary focus:outline-none shadow-sm transition-all"
        />
        <div className="flex justify-between items-center mt-3">
          <p className="text-sm text-[#999999]">
            We'll use this to personalize your experience
          </p>
          {name.length > 20 && (
            <span className="text-xs text-[#999999]">{name.length}/30</span>
          )}
        </div>
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
