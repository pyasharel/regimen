import { useState } from 'react';
import { OnboardingButton } from '../OnboardingButton';
import { HeightWheelPicker, WeightWheelPicker } from '@/components/ui/ios-wheel-picker';

interface HeightWeightScreenProps {
  initialData: {
    heightFeet: number | null;
    heightInches: number | null;
    heightCm: number | null;
    heightUnit: 'ft' | 'cm';
    currentWeight: number | null;
    weightUnit: 'lb' | 'kg';
  };
  onContinue: (data: {
    heightFeet: number | null;
    heightInches: number | null;
    heightCm: number | null;
    heightUnit: 'ft' | 'cm';
    currentWeight: number | null;
    weightUnit: 'lb' | 'kg';
  }) => void;
  onSkip: () => void;
}

// Weight bounds for validation
const WEIGHT_BOUNDS = {
  lb: { min: 80, max: 400 },
  kg: { min: 36, max: 180 },
};

export function HeightWeightScreen({ initialData, onContinue, onSkip }: HeightWeightScreenProps) {
  // Unified unit system: imperial or metric
  const [unitSystem, setUnitSystem] = useState<'imperial' | 'metric'>(
    initialData.heightUnit === 'cm' || initialData.weightUnit === 'kg' ? 'metric' : 'imperial'
  );
  
  const [heightFeet, setHeightFeet] = useState<number>(initialData.heightFeet || 5);
  const [heightInches, setHeightInches] = useState<number>(initialData.heightInches || 10);
  const [heightCm, setHeightCm] = useState<number>(initialData.heightCm || 178);
  const [weight, setWeight] = useState<number>(initialData.currentWeight || (unitSystem === 'imperial' ? 180 : 82));

  // Derived values based on unit system
  const heightUnit: 'ft' | 'cm' = unitSystem === 'imperial' ? 'ft' : 'cm';
  const weightUnit: 'lb' | 'kg' = unitSystem === 'imperial' ? 'lb' : 'kg';

  // Auto-convert when switching units
  const handleUnitSystemChange = (newSystem: 'imperial' | 'metric') => {
    if (newSystem === unitSystem) return;
    
    // Convert height
    if (newSystem === 'metric') {
      // ft/in to cm
      const totalInches = heightFeet * 12 + heightInches;
      setHeightCm(Math.round(totalInches * 2.54));
    } else {
      // cm to ft/in
      const totalInches = Math.round(heightCm / 2.54);
      setHeightFeet(Math.floor(totalInches / 12));
      setHeightInches(totalInches % 12);
    }
    
    // Convert weight
    if (newSystem === 'metric') {
      // lb to kg
      setWeight(Math.round(weight * 0.453592));
    } else {
      // kg to lb
      setWeight(Math.round(weight / 0.453592));
    }
    
    setUnitSystem(newSystem);
  };

  const handleContinue = () => {
    onContinue({
      heightFeet: heightUnit === 'ft' ? heightFeet : null,
      heightInches: heightUnit === 'ft' ? heightInches : null,
      heightCm: heightUnit === 'cm' ? heightCm : null,
      heightUnit,
      currentWeight: weight,
      weightUnit,
    });
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Headline - reframed to emphasize personalization */}
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-[#333333] animate-in fade-in slide-in-from-bottom-4 duration-500">
          Let's personalize your insights
        </h1>
      </div>

      {/* Subhead */}
      <p 
        className="text-[#666666] mb-6 animate-in fade-in duration-300"
        style={{ animationDelay: '50ms', animationFillMode: 'backwards' }}
      >
        Height & Weight
      </p>

      {/* Unit System Toggle - Cal AI style */}
      <div 
        className="flex justify-center mb-6 animate-in fade-in duration-300"
        style={{ animationDelay: '75ms', animationFillMode: 'backwards' }}
      >
        <div className="flex rounded-xl bg-[#F0F0F0] p-1 gap-1">
          <button
            onClick={() => handleUnitSystemChange('imperial')}
            className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all ${
              unitSystem === 'imperial'
                ? 'bg-white text-[#333333] shadow-sm'
                : 'text-[#666666]'
            }`}
          >
            Imperial
          </button>
          <button
            onClick={() => handleUnitSystemChange('metric')}
            className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all ${
              unitSystem === 'metric'
                ? 'bg-white text-[#333333] shadow-sm'
                : 'text-[#666666]'
            }`}
          >
            Metric
          </button>
        </div>
      </div>

      {/* Form with Wheel Pickers */}
      <div className="flex-1 space-y-6">
        {/* Height Section */}
        <div 
          className="bg-white rounded-xl p-5 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300"
          style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}
        >
          <label className="block text-sm font-medium text-[#666666] mb-3 text-center">Height</label>
          <HeightWheelPicker
            unit={unitSystem}
            feet={heightFeet}
            inches={heightInches}
            cm={heightCm}
            onChangeFeet={setHeightFeet}
            onChangeInches={setHeightInches}
            onChangeCm={setHeightCm}
          />
        </div>

        {/* Weight Section */}
        <div 
          className="bg-white rounded-xl p-5 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300"
          style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}
        >
          <label className="block text-sm font-medium text-[#666666] mb-3 text-center">Current Weight</label>
          <WeightWheelPicker
            unit={weightUnit}
            value={weight}
            onChange={setWeight}
          />
        </div>
      </div>

      {/* CTAs */}
      <div className="mt-6 space-y-3">
        <OnboardingButton onClick={handleContinue}>
          Continue
        </OnboardingButton>
        
        <button
          onClick={onSkip}
          className="w-full text-center text-[#999999] text-sm py-2 hover:text-[#666666] transition-colors"
        >
          I'll add this later
        </button>
      </div>
    </div>
  );
}
