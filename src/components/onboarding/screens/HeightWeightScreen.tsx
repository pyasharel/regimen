import { useState } from 'react';
import { OnboardingButton } from '../OnboardingButton';

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
  const [heightUnit, setHeightUnit] = useState<'ft' | 'cm'>(initialData.heightUnit);
  const [weightUnit, setWeightUnit] = useState<'lb' | 'kg'>(initialData.weightUnit);
  const [heightFeet, setHeightFeet] = useState<string>(initialData.heightFeet?.toString() || '5');
  const [heightInches, setHeightInches] = useState<string>(initialData.heightInches?.toString() || '10');
  const [heightCm, setHeightCm] = useState<string>(initialData.heightCm?.toString() || '178');
  const [weight, setWeight] = useState<string>(initialData.currentWeight?.toString() || '');

  const handleContinue = () => {
    onContinue({
      heightFeet: heightUnit === 'ft' ? (heightFeet ? parseInt(heightFeet) : null) : null,
      heightInches: heightUnit === 'ft' ? (heightInches ? parseInt(heightInches) : null) : null,
      heightCm: heightUnit === 'cm' ? (heightCm ? parseFloat(heightCm) : null) : null,
      heightUnit,
      currentWeight: weight ? parseFloat(weight) : null,
      weightUnit,
    });
  };

  const isValid = weight && (heightUnit === 'ft' ? heightFeet : heightCm);

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

      {/* Form */}
      <div className="flex-1 space-y-6">
        {/* Height Section */}
        <div 
          className="bg-white rounded-xl p-5 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300"
          style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}
        >
          <div className="flex items-center justify-between mb-4">
            <label className="text-sm font-medium text-[#666666]">Height</label>
            {/* Unit Toggle */}
            <div className="flex rounded-lg bg-[#F0F0F0] p-1">
              <button
                onClick={() => setHeightUnit('ft')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${
                  heightUnit === 'ft'
                    ? 'bg-white text-[#333333] shadow-sm'
                    : 'text-[#666666]'
                }`}
              >
                ft/in
              </button>
              <button
                onClick={() => setHeightUnit('cm')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${
                  heightUnit === 'cm'
                    ? 'bg-white text-[#333333] shadow-sm'
                    : 'text-[#666666]'
                }`}
              >
                cm
              </button>
            </div>
          </div>

          {heightUnit === 'ft' ? (
            <div className="flex gap-3">
              <div className="flex-1">
                <input
                  type="number"
                  inputMode="numeric"
                  value={heightFeet}
                  onChange={(e) => setHeightFeet(e.target.value)}
                  placeholder="5"
                  className="w-full h-12 px-4 rounded-lg bg-[#F5F5F5] border-0 text-center text-lg font-medium text-[#333333] placeholder:text-[#999999] focus:ring-2 focus:ring-primary focus:outline-none"
                />
                <span className="block text-center text-sm text-[#999999] mt-1">feet</span>
              </div>
              <div className="flex-1">
                <input
                  type="number"
                  inputMode="numeric"
                  value={heightInches}
                  onChange={(e) => setHeightInches(e.target.value)}
                  placeholder="10"
                  className="w-full h-12 px-4 rounded-lg bg-[#F5F5F5] border-0 text-center text-lg font-medium text-[#333333] placeholder:text-[#999999] focus:ring-2 focus:ring-primary focus:outline-none"
                />
                <span className="block text-center text-sm text-[#999999] mt-1">inches</span>
              </div>
            </div>
          ) : (
            <input
              type="number"
              inputMode="decimal"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              placeholder="178"
              className="w-full h-12 px-4 rounded-lg bg-[#F5F5F5] border-0 text-center text-lg font-medium text-[#333333] placeholder:text-[#999999] focus:ring-2 focus:ring-primary focus:outline-none"
            />
          )}
        </div>

        {/* Weight Section */}
        <div 
          className="bg-white rounded-xl p-5 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300"
          style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}
        >
          <div className="flex items-center justify-between mb-4">
            <label className="text-sm font-medium text-[#666666]">Current Weight</label>
            {/* Unit Toggle */}
            <div className="flex rounded-lg bg-[#F0F0F0] p-1">
              <button
                onClick={() => setWeightUnit('lb')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${
                  weightUnit === 'lb'
                    ? 'bg-white text-[#333333] shadow-sm'
                    : 'text-[#666666]'
                }`}
              >
                lb
              </button>
              <button
                onClick={() => setWeightUnit('kg')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${
                  weightUnit === 'kg'
                    ? 'bg-white text-[#333333] shadow-sm'
                    : 'text-[#666666]'
                }`}
              >
                kg
              </button>
            </div>
          </div>

          <input
            type="number"
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder={weightUnit === 'lb' ? '180' : '82'}
            className="w-full h-12 px-4 rounded-lg bg-[#F5F5F5] border-0 text-center text-lg font-medium text-[#333333] placeholder:text-[#999999] focus:ring-2 focus:ring-primary focus:outline-none"
          />
        </div>
      </div>

      {/* CTAs */}
      <div className="mt-6 space-y-3">
        <OnboardingButton 
          onClick={handleContinue}
          disabled={!isValid}
        >
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
