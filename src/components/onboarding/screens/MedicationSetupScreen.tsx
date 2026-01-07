import { useState } from 'react';
import { OnboardingButton } from '../OnboardingButton';
import { PathRouting } from '../hooks/useOnboardingState';
import { Search, ChevronDown } from 'lucide-react';

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

// Comprehensive compound list from AddCompoundScreen
const ALL_COMPOUNDS = [
  // GLP-1 Agonists (Weight Loss) - Path A focused
  "Semaglutide", "Ozempic", "Wegovy",
  "Tirzepatide", "Mounjaro", "Zepbound",
  "Retatrutide", "CagriSema", "Mazdutide", "Survodutide",
  "Dulaglutide", "Trulicity", "Liraglutide", "Saxenda", "Rybelsus",
  
  // Research Peptides - Healing & Recovery
  "AOD-9604", "ARA-290", "BPC-157", "BPC-157 + KPV Blend",
  "Bremelanotide", "PT-141",
  "CJC-1295 with DAC", "CJC-1295 without DAC",
  "DSIP", "Dihexa", "GHK-Cu", "GHRP-2", "GHRP-6",
  "Gonadorelin", "GRF 1-29", "HCG", "Hexarelin", "HMG",
  "IGF-1 LR3", "Ipamorelin", "Ibutamoren", "MK-677",
  "Kisspeptin", "KPV", "MOTS-c", "Melanotan II",
  "NAD+", "N-Acetyl Semax", "N-Acetyl Selank",
  "PEG-MGF", "Selank", "Semax", "Sermorelin", "SS-31", "Elamipretide",
  "TB-500", "TB4-FRAG", "Tesamorelin", "Tesofensine",
  "Thymosin Alpha-1", "Thymosin Beta-4", "Thymulin",
  
  // Testosterone - Men's TRT
  "Testosterone Cypionate", "Testosterone Enanthate", "Testosterone Propionate",
  "Testosterone Gel",
  
  // Anabolic Steroids
  "Nandrolone Decanoate", "Deca", "NPP",
  "Trenbolone Acetate", "Trenbolone Enanthate",
  "Boldenone Undecylenate", "Equipoise",
  "Masteron Propionate", "Masteron Enanthate",
  "Primobolan", "Oxandrolone", "Anavar", "Stanozolol", "Winstrol",
  
  // HGH
  "Somatropin", "HGH", "Genotropin", "Humatrope", "Norditropin",
  
  // PCT & Ancillaries
  "Anastrozole", "Arimidex", "Letrozole", "Clomid", "Tamoxifen", "Nolvadex",
  
  // Health & Metabolic
  "Metformin", "Berberine", "DHEA", "Pregnenolone",
  "Levothyroxine", "Cytomel", "Armour Thyroid",
  
  // Sexual Health
  "Cialis", "Tadalafil", "Viagra", "Sildenafil",
];

const DOSE_UNITS = ['mg', 'mcg', 'mL', 'IU'];
const FREQUENCIES = ['Daily', 'Weekly', 'Every X days', 'Specific days'];
const DAY_OPTIONS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TIME_OPTIONS = ['Morning', 'Afternoon', 'Evening', 'Bedtime'];

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
  const [frequencyDays, setFrequencyDays] = useState(initialMedication?.frequencyDays || 3);
  // Default to today's day for weekly - fix JS getDay() mapping (0=Sun) to DAY_OPTIONS (0=Mon)
  const jsDay = new Date().getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const mondayStartIndex = jsDay === 0 ? 6 : jsDay - 1; // Convert to Mon=0, Tue=1, ..., Sun=6
  const todayDayName = DAY_OPTIONS[mondayStartIndex];
  const [weeklyDay, setWeeklyDay] = useState<string>(initialMedication?.specificDays?.[0] || todayDayName);
  const [specificDays, setSpecificDays] = useState<string[]>(initialMedication?.specificDays || []);
  const [timeOfDay, setTimeOfDay] = useState(initialMedication?.timeOfDay || 'Morning');

  // Filter compounds based on search
  const filteredCompounds = ALL_COMPOUNDS.filter(c => 
    c.toLowerCase().includes(name.toLowerCase())
  ).slice(0, 8);

  // Get suggested compounds based on path
  const suggestedCompounds = pathRouting === 'A' 
    ? ['Semaglutide', 'Tirzepatide', 'Ozempic', 'Mounjaro', 'Wegovy', 'Zepbound']
    : ['BPC-157', 'TB-500', 'Testosterone Cypionate', 'Ipamorelin', 'CJC-1295', 'MK-677'];

  // Validate: name, dose > 0, and if specific days selected, at least 1 day
  const isValid = name && 
    dose && 
    parseFloat(dose) > 0 && 
    (frequency !== 'Specific days' || specificDays.length > 0);

  const toggleDay = (day: string) => {
    setSpecificDays(prev => 
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const handleContinue = () => {
    onContinue({
      name,
      dose: parseFloat(dose),
      doseUnit,
      frequency,
      frequencyDays: frequency === 'Every X days' ? frequencyDays : undefined,
      specificDays: frequency === 'Specific days' ? specificDays : (frequency === 'Weekly' ? [weeklyDay] : undefined),
      timeOfDay,
    });
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Headline - partnership language */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#333333] animate-in fade-in slide-in-from-bottom-4 duration-500">
          Let's set up your first compound
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
              className="w-full h-12 pl-10 pr-4 rounded-lg bg-[#F5F5F5] border-0 text-base text-[#333333] placeholder:text-[#999999] focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>
          
          {/* Compound suggestions - only show when typing */}
          {showCompoundList && name.length > 0 && filteredCompounds.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {filteredCompounds.map((compound) => (
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
              inputMode="decimal"
              min="0.01"
              step="any"
              value={dose}
              onChange={(e) => setDose(e.target.value)}
              onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
              placeholder="2"
              className="flex-1 h-12 px-4 rounded-lg bg-[#F5F5F5] border-0 text-base text-[#333333] placeholder:text-[#999999] focus:ring-2 focus:ring-primary focus:outline-none"
            />
            <div className="relative w-[72px] flex-shrink-0">
              <select
                value={doseUnit}
                onChange={(e) => setDoseUnit(e.target.value)}
                className="w-full h-12 pl-2 pr-6 rounded-lg bg-[#F5F5F5] border-0 text-sm text-[#333333] focus:ring-2 focus:ring-primary focus:outline-none appearance-none cursor-pointer"
              >
                {DOSE_UNITS.map(unit => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 h-4 w-4 text-[#999999] pointer-events-none" />
            </div>
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

          {/* Weekly day picker */}
          {frequency === 'Weekly' && (
            <div className="mt-4 animate-in fade-in duration-200">
              <span className="text-sm text-[#666666] mb-2 block">Which day?</span>
              <div className="flex flex-wrap gap-2">
                {DAY_OPTIONS.map((day) => (
                  <button
                    key={day}
                    onClick={() => setWeeklyDay(day)}
                    className={`h-10 w-12 rounded-lg text-sm font-medium transition-all ${
                      weeklyDay === day
                        ? 'bg-primary text-white'
                        : 'bg-[#F0F0F0] text-[#666666] hover:bg-[#E5E5E5]'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Every X days sub-selection */}
          {frequency === 'Every X days' && (
            <div className="mt-4 flex items-center gap-3 animate-in fade-in duration-200">
              <span className="text-sm text-[#666666]">Every</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFrequencyDays(Math.max(2, frequencyDays - 1))}
                  className="h-10 w-10 rounded-lg bg-[#F0F0F0] text-[#666666] font-bold hover:bg-[#E5E5E5] transition-colors"
                >
                  −
                </button>
                <span className="w-8 text-center text-lg font-semibold text-[#333333]">{frequencyDays}</span>
                <button
                  onClick={() => setFrequencyDays(Math.min(14, frequencyDays + 1))}
                  className="h-10 w-10 rounded-lg bg-[#F0F0F0] text-[#666666] font-bold hover:bg-[#E5E5E5] transition-colors"
                >
                  +
                </button>
              </div>
              <span className="text-sm text-[#666666]">days</span>
            </div>
          )}

          {/* Specific days sub-selection */}
          {frequency === 'Specific days' && (
            <div className="mt-4 animate-in fade-in duration-200">
              <div className="flex flex-wrap gap-2">
                {DAY_OPTIONS.map((day) => (
                  <button
                    key={day}
                    onClick={() => toggleDay(day)}
                    className={`h-10 w-12 rounded-lg text-sm font-medium transition-all ${
                      specificDays.includes(day)
                        ? 'bg-primary text-white'
                        : 'bg-[#F0F0F0] text-[#666666] hover:bg-[#E5E5E5]'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
              {specificDays.length === 0 && (
                <p className="text-sm text-primary mt-2">Please select at least one day</p>
              )}
            </div>
          )}
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
