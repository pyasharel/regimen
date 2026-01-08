import { useState } from 'react';
import { OnboardingCard } from '../OnboardingCard';
import { OnboardingButton } from '../OnboardingButton';
import { PathType, PathRouting } from '../hooks/useOnboardingState';

interface PathSelectionScreenProps {
  onSelect: (pathType: PathType, routing: PathRouting) => void;
}

const PATH_OPTIONS = [
  {
    id: 'glp1' as PathType,
    routing: 'A' as PathRouting,
    title: "I'm on a GLP-1",
    subtitle: "Ozempic, Mounjaro, Wegovy, Zepbound",
  },
  {
    id: 'peptides' as PathType,
    routing: 'B' as PathRouting,
    title: "I use peptides",
    subtitle: "BPC-157, TB-500, and others",
  },
  {
    id: 'trt' as PathType,
    routing: 'B' as PathRouting,
    title: "I'm on TRT or similar",
    subtitle: "Testosterone, performance protocols",
  },
  {
    id: 'multiple' as PathType,
    routing: 'B' as PathRouting,
    title: "I use multiple compounds",
    subtitle: "Managing a full stack",
  },
];

export function PathSelectionScreen({ onSelect }: PathSelectionScreenProps) {
  const [selected, setSelected] = useState<PathType | null>(null);
  const [selectedRouting, setSelectedRouting] = useState<PathRouting | null>(null);

  const handleCardClick = (pathType: PathType, routing: PathRouting) => {
    setSelected(pathType);
    setSelectedRouting(routing);
  };

  const handleContinue = () => {
    if (selected && selectedRouting) {
      onSelect(selected, selectedRouting);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Headline */}
      <div className="mb-8">
        <h1 
          className="text-2xl font-bold text-[#333333] animate-in fade-in slide-in-from-bottom-4 duration-500"
        >
          What brings you here?
        </h1>
      </div>

      {/* Options */}
      <div className="space-y-3">
        {PATH_OPTIONS.map((option, index) => (
          <OnboardingCard
            key={option.id}
            selected={selected === option.id}
            onClick={() => handleCardClick(option.id, option.routing)}
            accentBorder
            delay={index * 100}
          >
            <div className="pr-8">
              <p className="font-semibold text-[#333333]">{option.title}</p>
              <p className="text-sm text-[#666666] mt-0.5">{option.subtitle}</p>
            </div>
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
