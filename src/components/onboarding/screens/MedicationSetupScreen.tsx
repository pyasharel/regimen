import { useState } from 'react';
import { OnboardingButton } from '../OnboardingButton';
import { PathRouting } from '../hooks/useOnboardingState';
import { Search } from 'lucide-react';

interface MedicationSetupScreenProps {
  pathRouting: PathRouting | null;
  initialMedication: {
    name: string;
    dose: number;
    doseUnit: string;
    frequency: string;
    frequencyDays?: number;
    specificDays?: string[];
    timeOfDay: string;
    customTime?: string;
  } | null;
  onContinue: (medication: {
    name: string;
    dose: number;
    doseUnit: string;
    frequency: string;
    frequencyDays?: number;
    specificDays?: string[];
    timeOfDay: string;
    customTime?: string;
  }) => void;
  onSkip: () => void;
}

const PATH_A_COMPOUNDS = [
  'Semaglutide',
  'Tirzepatide',
  'Ozempic',
  'Wegovy',
  'Mounjaro',
  'Zepbound',
  'Retatrutide',
  'Other',
];

const PATH_B_COMPOUNDS = [
  'BPC-157',
  'TB-500',
  'Testosterone',
  'Ipamorelin',
  'CJC-1295',
  'MK-677',
  'PT-141',
  'Other',
];

const DOSE_UNITS = ['mg', 'mcg', 'mL', 'IU'];
const FREQUENCIES = ['Daily', 'Weekly', 'Every X days', 'Specific days'];
const TIME_OPTIONS = ['Morning', 'Afternoon', 'Evening', 'Custom'];

export function MedicationSetupScreen({ 
  pathRouting, 
  initialMedication, 
  onContinue, 
  onSkip 
}: MedicationSetupScreenProps) {
  const [name, setName] = useState(initialMedication?.name || '');
  const [showCompoundList, setShowCompoundList] = useState(false);
  const [dose, setDose] = useState(initialMedication?.dose?.toString() || '');
  const [doseUnit, setDoseUnit] = useState(initialMedication?.doseUnit || 'mg');
  const [frequency, setFrequency] = useState(initialMedication?.frequency || 'Weekly');
  const [timeOfDay, setTimeOfDay] = useState(initialMedication?.timeOfDay || 'Morning');

  const compounds = pathRouting === 'A' ? PATH_A_COMPOUNDS : PATH_B_COMPOUNDS;
  const filteredCompounds = compounds.filter(c => 
    c.toLowerCase().includes(name.toLowerCase())
  );

  const isValid = name && dose && parseFloat(dose) > 0;

  const handleContinue = () => {
    onContinue({
      name,
      dose: parseFloat(dose),
      doseUnit,
      frequency,
      timeOfDay,
    });
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Headline */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#333333] animate-in fade-in slide-in-from-bottom-4 duration-500">
          Set up your first compound
        </h1>
      </div>

      {/* Form */}
      <div className="flex-1 space-y-4 overflow-y-auto">
        {/* Compound name */}
        <div 
          className="bg-white rounded-xl p-4 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300"
          style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}
        >
          <label className="text-sm font-medium text-[#666666] mb-2 block">Compound</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#999999]" />
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setShowCompoundList(true);
              }}
              onFocus={() => setShowCompoundList(true)}
              placeholder="Search compounds..."
              className="w-full h-12 pl-10 pr-4 rounded-lg bg-[#F5F5F5] border-0 text-base focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>
          
          {/* Compound suggestions */}
          {showCompoundList && filteredCompounds.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {filteredCompounds.slice(0, 6).map((compound) => (
                <button
                  key={compound}
                  onClick={() => {
                    setName(compound);
                    setShowCompoundList(false);
                  }}
                  className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                    name === compound
                      ? 'bg-primary text-white'
                      : 'bg-[#F0F0F0] text-[#666666] hover:bg-[#E5E5E5]'
                  }`}
                >
                  {compound}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dose */}
        <div 
          className="bg-white rounded-xl p-4 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300"
          style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}
        >
          <label className="text-sm font-medium text-[#666666] mb-2 block">Dose</label>
          <div className="flex gap-3">
            <input
              type="number"
              value={dose}
              onChange={(e) => setDose(e.target.value)}
              placeholder="2.5"
              className="flex-1 h-12 px-4 rounded-lg bg-[#F5F5F5] border-0 text-base focus:ring-2 focus:ring-primary focus:outline-none"
            />
            <select
              value={doseUnit}
              onChange={(e) => setDoseUnit(e.target.value)}
              className="h-12 px-4 rounded-lg bg-[#F5F5F5] border-0 text-base focus:ring-2 focus:ring-primary focus:outline-none appearance-none"
            >
              {DOSE_UNITS.map(unit => (
                <option key={unit} value={unit}>{unit}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Frequency */}
        <div 
          className="bg-white rounded-xl p-4 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300"
          style={{ animationDelay: '300ms', animationFillMode: 'backwards' }}
        >
          <label className="text-sm font-medium text-[#666666] mb-2 block">Frequency</label>
          <div className="flex flex-wrap gap-2">
            {FREQUENCIES.map((freq) => (
              <button
                key={freq}
                onClick={() => setFrequency(freq)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  frequency === freq
                    ? 'bg-primary text-white'
                    : 'bg-[#F0F0F0] text-[#666666] hover:bg-[#E5E5E5]'
                }`}
              >
                {freq}
              </button>
            ))}
          </div>
        </div>

        {/* Time of day */}
        <div 
          className="bg-white rounded-xl p-4 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300"
          style={{ animationDelay: '400ms', animationFillMode: 'backwards' }}
        >
          <label className="text-sm font-medium text-[#666666] mb-2 block">Time</label>
          <div className="flex flex-wrap gap-2">
            {TIME_OPTIONS.map((time) => (
              <button
                key={time}
                onClick={() => setTimeOfDay(time)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  timeOfDay === time
                    ? 'bg-primary text-white'
                    : 'bg-[#F0F0F0] text-[#666666] hover:bg-[#E5E5E5]'
                }`}
              >
                {time}
              </button>
            ))}
          </div>
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
          I'll set this up later
        </button>
      </div>
    </div>
  );
}
