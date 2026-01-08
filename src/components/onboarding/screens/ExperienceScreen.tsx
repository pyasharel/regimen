import { useState } from 'react';
import { OnboardingCard } from '../OnboardingCard';
import { OnboardingButton } from '../OnboardingButton';
import { ExperienceLevel } from '../hooks/useOnboardingState';

interface ExperienceScreenProps {
  initialLevel: ExperienceLevel | null;
  onSelect: (level: ExperienceLevel) => void;
}

const EXPERIENCE_OPTIONS: { id: ExperienceLevel; label: string }[] = [
  { id: 'beginner', label: 'Just getting started' },
  { id: 'intermediate', label: 'A few months in' },
  { id: 'experienced', label: "I've been doing this a while" },
];

export function ExperienceScreen({ initialLevel, onSelect }: ExperienceScreenProps) {
  const [selected, setSelected] = useState<ExperienceLevel | null>(initialLevel);

  const handleContinue = () => {
    if (selected) {
      onSelect(selected);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Headline */}
      <div className="mb-8">
        <h1 
          className="text-2xl font-bold text-[#333333] animate-in fade-in slide-in-from-bottom-4 duration-500"
        >
          How long have you been on this journey?
        </h1>
      </div>

      {/* Options - with accent lines for consistency */}
      <div className="space-y-3">
        {EXPERIENCE_OPTIONS.map((option, index) => (
          <OnboardingCard
            key={option.id}
            selected={selected === option.id}
            onClick={() => setSelected(option.id)}
            accentBorder
            delay={index * 100}
          >
            <p className="font-medium text-[#333333] pr-8">{option.label}</p>
          </OnboardingCard>
        ))}
      </div>

      {/* Continue Button */}
      <div className="mt-auto pt-6">
        <OnboardingButton 
          onClick={handleContinue}
          disabled={!selected}
        >
          Continue
        </OnboardingButton>
      </div>
    </div>
  );
}
