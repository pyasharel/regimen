import { useState } from 'react';
import { OnboardingButton } from '../OnboardingButton';
import { Input } from '@/components/ui/input';

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

export function HeightWeightScreen({ initialData, onContinue, onSkip }: HeightWeightScreenProps) {
  // Unified unit system: imperial or metric
  const [unitSystem, setUnitSystem] = useState<'imperial' | 'metric'>(
    initialData.heightUnit === 'cm' || initialData.weightUnit === 'kg' ? 'metric' : 'imperial'
  );
  
  const [heightFeet, setHeightFeet] = useState<string>(initialData.heightFeet?.toString() || '5');
  const [heightInches, setHeightInches] = useState<string>(initialData.heightInches?.toString() || '10');
  const [heightCm, setHeightCm] = useState<string>(initialData.heightCm?.toString() || '178');
  const [weight, setWeight] = useState<string>(
    initialData.currentWeight?.toString() || (unitSystem === 'imperial' ? '180' : '82')
  );

  // Derived values based on unit system
  const heightUnit: 'ft' | 'cm' = unitSystem === 'imperial' ? 'ft' : 'cm';
  const weightUnit: 'lb' | 'kg' = unitSystem === 'imperial' ? 'lb' : 'kg';

  // Auto-convert when switching units
  const handleUnitSystemChange = (newSystem: 'imperial' | 'metric') => {
    if (newSystem === unitSystem) return;
    
    // Convert height
    if (newSystem === 'metric') {
      // ft/in to cm
      const totalInches = (parseInt(heightFeet) || 0) * 12 + (parseInt(heightInches) || 0);
      setHeightCm(Math.round(totalInches * 2.54).toString());
    } else {
      // cm to ft/in
      const totalInches = Math.round((parseInt(heightCm) || 0) / 2.54);
      setHeightFeet(Math.floor(totalInches / 12).toString());
      setHeightInches((totalInches % 12).toString());
    }
    
    // Convert weight
    const currentWeight = parseFloat(weight) || 0;
    if (newSystem === 'metric') {
      // lb to kg
      setWeight(Math.round(currentWeight * 0.453592).toString());
    } else {
      // kg to lb
      setWeight(Math.round(currentWeight / 0.453592).toString());
    }
    
    setUnitSystem(newSystem);
  };

  const handleContinue = () => {
    onContinue({
      heightFeet: heightUnit === 'ft' ? parseInt(heightFeet) || null : null,
      heightInches: heightUnit === 'ft' ? parseInt(heightInches) || null : null,
      heightCm: heightUnit === 'cm' ? parseInt(heightCm) || null : null,
      heightUnit,
      currentWeight: parseFloat(weight) || null,
      weightUnit,
    });
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Headline */}
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
        className="flex justify-center mb-8 animate-in fade-in duration-300"
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

      {/* Simple Input Fields */}
      <div 
        className="flex-1 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300"
        style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}
      >
        {/* Height */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-[#666666]">Height</label>
          {unitSystem === 'imperial' ? (
            <div className="flex gap-3">
              <div className="flex-1">
                <div className="relative">
                  <Input
                    type="number"
                    inputMode="numeric"
                    placeholder="5"
                    value={heightFeet}
                    onChange={(e) => setHeightFeet(e.target.value)}
                    className="text-2xl font-bold text-center h-14 pr-10 bg-white border-[#E5E5E5]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999999] text-sm">ft</span>
                </div>
              </div>
              <div className="flex-1">
                <div className="relative">
                  <Input
                    type="number"
                    inputMode="numeric"
                    placeholder="10"
                    value={heightInches}
                    onChange={(e) => setHeightInches(e.target.value)}
                    className="text-2xl font-bold text-center h-14 pr-10 bg-white border-[#E5E5E5]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999999] text-sm">in</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative">
              <Input
                type="number"
                inputMode="numeric"
                placeholder="178"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                className="text-2xl font-bold text-center h-14 pr-12 bg-white border-[#E5E5E5]"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999999] text-sm">cm</span>
            </div>
          )}
        </div>

        {/* Weight */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-[#666666]">Weight</label>
          <div className="relative">
            <Input
              type="number"
              inputMode="decimal"
              placeholder={unitSystem === 'imperial' ? '180' : '82'}
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="text-2xl font-bold text-center h-14 pr-12 bg-white border-[#E5E5E5]"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999999] text-sm">
              {unitSystem === 'imperial' ? 'lbs' : 'kg'}
            </span>
          </div>
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
