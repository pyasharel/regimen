import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Calculator, Copy, Plus, HelpCircle, ChevronDown, Settings2, ArrowRightLeft } from "lucide-react";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { toast } from 'sonner';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import { trackCalculatorUsed } from '@/utils/analytics';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface CalculatorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialVialSize?: number;
  initialVialUnit?: string;
  initialBacWater?: number;
  initialConcentration?: number;
  initialDose?: number;
  initialDoseUnit?: string;
}

type CalculatorTab = 'reconstitution' | 'ml';
type ReconstitutionMode = 'standard' | 'reverse';

// Common presets
const VIAL_SIZES = [5, 10, 15, 20];
const BAC_WATER_AMOUNTS = [1, 2, 3, 5];
const CONCENTRATION_PRESETS = [100, 200, 250, 300];
const SYRINGE_SIZES = [
  { value: 30, label: '0.3mL (30u)' },
  { value: 50, label: '0.5mL (50u)' },
  { value: 100, label: '1mL (100u)' },
];

export const CalculatorModal = ({
  open,
  onOpenChange,
  initialVialSize,
  initialVialUnit = 'mg',
  initialBacWater,
  initialConcentration,
  initialDose,
  initialDoseUnit = 'mg'
}: CalculatorModalProps) => {
  const navigate = useNavigate();
  // Default to 'reconstitution' unless initialConcentration provided (meaning mL calc)
  const [activeTab, setActiveTab] = useState<CalculatorTab>(
    initialConcentration ? 'ml' : 'reconstitution'
  );
  
  // Reconstitution calculator state - NO default values
  const [reconMode, setReconMode] = useState<ReconstitutionMode>('standard');
  const [vialSize, setVialSize] = useState(initialVialSize?.toString() || '');
  const [vialUnit, setVialUnit] = useState(initialVialUnit);
  const [bacWater, setBacWater] = useState(initialBacWater?.toString() || '');
  const [intendedDose, setIntendedDose] = useState(initialDose?.toString() || '');
  const [doseUnit, setDoseUnit] = useState(initialDoseUnit);
  const [syringeSize, setSyringeSize] = useState(100); // 1mL is most common
  const [showAdvanced, setShowAdvanced] = useState(false); // Always start collapsed
  
  // Reverse mode state
  const [preferredUnits, setPreferredUnits] = useState('');
  
  // mL calculator state
  const [concentration, setConcentration] = useState(initialConcentration?.toString() || '');
  const [mgDose, setMgDose] = useState(initialDose?.toString() || '');

  const triggerHaptic = useCallback(async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        await Haptics.impact({ style: ImpactStyle.Light });
      }
    } catch (err) {
      console.log('Haptic failed:', err);
    }
  }, []);

  // Clamp input to positive values
  const handlePositiveInput = (value: string, setter: (val: string) => void, minValue: number = 0) => {
    const num = parseFloat(value);
    if (value === '' || value === '0' || value === '0.') {
      setter(value);
    } else if (!isNaN(num) && num >= minValue) {
      setter(value);
    } else if (!isNaN(num) && num < minValue) {
      setter(minValue.toString());
    }
  };

  // Calculate IU for reconstitution (standard mode)
  const calculateIU = (): string | null => {
    if (!vialSize || !bacWater || !intendedDose) return null;
    
    const vialNum = parseFloat(vialSize);
    const bacWaterNum = parseFloat(bacWater);
    const doseNum = parseFloat(intendedDose);
    
    if (isNaN(vialNum) || isNaN(bacWaterNum) || isNaN(doseNum) || 
        vialNum <= 0 || bacWaterNum <= 0 || doseNum <= 0) {
      return null;
    }

    const vialMcg = vialUnit === 'mg' ? vialNum * 1000 : vialNum;
    let doseMcg: number;
    if (doseUnit === 'mg') {
      doseMcg = doseNum * 1000;
    } else if (doseUnit === 'mcg') {
      doseMcg = doseNum;
    } else {
      return null;
    }

    const concentrationMcgPerMl = vialMcg / bacWaterNum;
    const mlNeeded = doseMcg / concentrationMcgPerMl;
    const iu = mlNeeded * syringeSize;

    if (iu <= 0 || !isFinite(iu)) return null;
    // Format: remove trailing .0 for whole numbers, but keep decimals when needed
    const formatted = iu.toFixed(1);
    return formatted.endsWith('.0') ? Math.round(iu).toString() : formatted;
  };

  // Calculate BAC water for reverse mode
  const calculateReverseBAC = (): string | null => {
    if (!vialSize || !intendedDose || !preferredUnits) return null;
    
    const vialNum = parseFloat(vialSize);
    const doseNum = parseFloat(intendedDose);
    const unitsNum = parseFloat(preferredUnits);
    
    if (isNaN(vialNum) || isNaN(doseNum) || isNaN(unitsNum) || 
        vialNum <= 0 || doseNum <= 0 || unitsNum <= 0) {
      return null;
    }

    const vialMcg = vialUnit === 'mg' ? vialNum * 1000 : vialNum;
    let doseMcg: number;
    if (doseUnit === 'mg') {
      doseMcg = doseNum * 1000;
    } else if (doseUnit === 'mcg') {
      doseMcg = doseNum;
    } else {
      return null;
    }

    const bacWaterNeeded = (unitsNum * vialMcg) / (doseMcg * syringeSize);

    if (bacWaterNeeded <= 0 || !isFinite(bacWaterNeeded)) return null;
    return bacWaterNeeded.toFixed(2);
  };

  // Calculate mL for mL calculator
  const calculateML = (): string | null => {
    if (!concentration || !mgDose) return null;
    
    const concNum = parseFloat(concentration);
    const doseNum = parseFloat(mgDose);
    
    if (isNaN(concNum) || isNaN(doseNum) || concNum <= 0 || doseNum <= 0) {
      return null;
    }

    const mlNeeded = doseNum / concNum;
    if (mlNeeded <= 0 || !isFinite(mlNeeded)) return null;
    return mlNeeded.toFixed(2);
  };

  const handleCopyResult = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      triggerHaptic();
      toast.success(`${label} copied`);
      trackCalculatorUsed(activeTab === 'reconstitution' ? 'iu' : 'ml');
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  const handleAddToStack = () => {
    onOpenChange(false);
    
    if (activeTab === 'reconstitution') {
      navigate('/add-compound', {
        state: {
          prefillData: {
            vialSize: parseFloat(vialSize),
            vialUnit,
            bacWater: parseFloat(bacWater),
            intendedDose: parseFloat(intendedDose),
            doseUnit
          }
        }
      });
    } else {
      navigate('/add-compound', {
        state: {
          prefillData: {
            concentration: parseFloat(concentration),
            intendedDose: parseFloat(mgDose),
            doseUnit: 'mg'
          }
        }
      });
    }
  };

  const calculatedIU = calculateIU();
  const calculatedReverseBAC = calculateReverseBAC();
  const calculatedML = calculateML();

  // Helper component for info tooltip
  const InfoTooltip = ({ content }: { content: string }) => (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" className="text-muted-foreground hover:text-foreground transition-colors">
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px] text-xs">
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  // Quick select button component
  const QuickSelectButton = ({ 
    value, 
    currentValue, 
    onSelect, 
    suffix 
  }: { 
    value: number; 
    currentValue: string; 
    onSelect: (val: string) => void;
    suffix: string;
  }) => (
    <button
      onClick={() => {
        triggerHaptic();
        onSelect(value.toString());
      }}
      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
        currentValue === value.toString()
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted hover:bg-muted/80'
      }`}
    >
      {value}{suffix}
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" hideClose>
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <Calculator className="w-5 h-5 text-primary" />
            {activeTab === 'reconstitution' ? 'Reconstitution Calculator' : 'mL Calculator'}
          </DialogTitle>
          <div className="flex items-center gap-2">
            {/* Switch calculator type */}
            <button
              onClick={() => {
                triggerHaptic();
                setActiveTab(activeTab === 'reconstitution' ? 'ml' : 'reconstitution');
              }}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              {activeTab === 'reconstitution' ? 'mL calc' : 'Peptide calc'}
            </button>
            <button
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">

          {/* Reconstitution Calculator */}
          {activeTab === 'reconstitution' && (
            <div className="space-y-4">
              {/* Vial Size */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  Vial Size
                  <InfoTooltip content="The total mg in your peptide vial, shown on the label" />
                </Label>
                <div className="flex gap-1.5 flex-wrap items-center">
                  {VIAL_SIZES.map((size) => (
                    <QuickSelectButton 
                      key={size} 
                      value={size} 
                      currentValue={vialSize} 
                      onSelect={setVialSize}
                      suffix="mg"
                    />
                  ))}
                      <Input
                        type="number"
                        inputMode="decimal"
                        min="0.1"
                        placeholder="Other"
                        value={VIAL_SIZES.includes(Number(vialSize)) ? '' : vialSize}
                        onChange={(e) => handlePositiveInput(e.target.value, setVialSize, 0)}
                        className="w-16 h-8 text-xs px-2"
                      />
                    </div>
              </div>

              {/* Standard Mode: BAC Water + Dose */}
              {reconMode === 'standard' && (
                <>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      BAC Water Added
                      <InfoTooltip content="How much bacteriostatic water you added to reconstitute the peptide" />
                    </Label>
                    <div className="flex gap-1.5 flex-wrap items-center">
                      {BAC_WATER_AMOUNTS.map((amount) => (
                        <QuickSelectButton 
                          key={amount} 
                          value={amount} 
                          currentValue={bacWater} 
                          onSelect={setBacWater}
                          suffix="mL"
                        />
                      ))}
                      <Input
                        type="number"
                        inputMode="decimal"
                        min="0.1"
                        placeholder="Other"
                        value={BAC_WATER_AMOUNTS.includes(Number(bacWater)) ? '' : bacWater}
                        onChange={(e) => handlePositiveInput(e.target.value, setBacWater, 0)}
                        className="w-16 h-8 text-xs px-2"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium flex items-center gap-1.5">
                        Dose
                        <InfoTooltip content="The amount you want to inject per dose" />
                      </Label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        placeholder="e.g., 250"
                        value={intendedDose}
                        onChange={(e) => handlePositiveInput(e.target.value, setIntendedDose, 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Unit</Label>
                      <SegmentedControl
                        value={doseUnit}
                        onChange={(val) => setDoseUnit(val)}
                        options={[
                          { value: 'mcg', label: 'mcg' },
                          { value: 'mg', label: 'mg' }
                        ]}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Reverse Mode Fields */}
              {reconMode === 'reverse' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium flex items-center gap-1.5">
                        Dose
                        <InfoTooltip content="The amount you want to inject per dose" />
                      </Label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        placeholder="e.g., 250"
                        value={intendedDose}
                        onChange={(e) => handlePositiveInput(e.target.value, setIntendedDose, 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Unit</Label>
                      <SegmentedControl
                        value={doseUnit}
                        onChange={(val) => setDoseUnit(val)}
                        options={[
                          { value: 'mcg', label: 'mcg' },
                          { value: 'mg', label: 'mg' }
                        ]}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      Preferred Units to Draw
                      <InfoTooltip content="The number of units you want each dose to be (e.g., 10u for easy measuring)" />
                    </Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min="1"
                      placeholder="e.g., 10"
                      value={preferredUnits}
                      onChange={(e) => handlePositiveInput(e.target.value, setPreferredUnits, 1)}
                    />
                  </div>
                </>
              )}

              {/* Advanced Options (Collapsible) */}
              <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                <CollapsibleTrigger asChild>
                  <button 
                    className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
                    onClick={triggerHaptic}
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                    <span>Advanced Options</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3 space-y-3">
                  {/* Mode Toggle */}
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      Mode
                      <InfoTooltip content="Standard: calculate units to draw. Reverse: calculate BAC water needed for preferred units." />
                    </Label>
                    <SegmentedControl
                      value={reconMode}
                      onChange={(val) => {
                        triggerHaptic();
                        setReconMode(val as ReconstitutionMode);
                      }}
                      options={[
                        { value: 'standard', label: 'Standard' },
                        { value: 'reverse', label: 'Reverse' }
                      ]}
                    />
                  </div>

                  {/* Syringe Size */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      Syringe Size
                      <InfoTooltip content="Select your insulin syringe size. 1mL (100u) is most common." />
                    </Label>
                    <div className="flex gap-2">
                      {SYRINGE_SIZES.map((syringe) => (
                        <button
                          key={syringe.value}
                          onClick={() => {
                            triggerHaptic();
                            setSyringeSize(syringe.value);
                          }}
                          className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            syringeSize === syringe.value
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted hover:bg-muted/80'
                          }`}
                        >
                          {syringe.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Standard Result */}
              {reconMode === 'standard' && calculatedIU && (
                <div 
                  className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:bg-primary/15 transition-colors"
                  onClick={() => handleCopyResult(calculatedIU, 'Units')}
                >
                  <div>
                    <p className="text-sm text-muted-foreground">Draw on syringe</p>
                    <p className="text-2xl font-bold text-primary">{calculatedIU} units</p>
                    {syringeSize !== 100 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        on a {syringeSize}u syringe
                      </p>
                    )}
                  </div>
                  <Copy className="w-5 h-5 text-primary" />
                </div>
              )}

              {/* Reverse Result */}
              {reconMode === 'reverse' && calculatedReverseBAC && (
                <div 
                  className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:bg-primary/15 transition-colors"
                  onClick={() => handleCopyResult(calculatedReverseBAC, 'BAC water')}
                >
                  <div>
                    <p className="text-sm text-muted-foreground">Add BAC water</p>
                    <p className="text-2xl font-bold text-primary">{calculatedReverseBAC} mL</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      to draw {preferredUnits}u per {intendedDose}{doseUnit} dose
                    </p>
                  </div>
                  <Copy className="w-5 h-5 text-primary" />
                </div>
              )}

              {/* Add to Stack Button - Primary CTA */}
              {(calculatedIU || calculatedReverseBAC) && (
                <Button 
                  onClick={handleAddToStack}
                  className="w-full flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add to Stack
                </Button>
              )}
            </div>
          )}

          {/* mL Calculator */}
          {activeTab === 'ml' && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground -mt-2">
                For oil-based compounds (testosterone, etc.)
              </p>
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  Concentration
                  <InfoTooltip content="The mg/mL shown on your vial label (e.g., 250mg/mL)" />
                </Label>
                <div className="flex gap-1.5 flex-wrap items-center">
                  {CONCENTRATION_PRESETS.map((conc) => (
                    <QuickSelectButton 
                      key={conc} 
                      value={conc} 
                      currentValue={concentration} 
                      onSelect={setConcentration}
                      suffix=""
                    />
                  ))}
                  <Input
                    type="number"
                    inputMode="decimal"
                    min="1"
                    placeholder="Other"
                    value={CONCENTRATION_PRESETS.includes(Number(concentration)) ? '' : concentration}
                    onChange={(e) => handlePositiveInput(e.target.value, setConcentration, 0)}
                    className="w-16 h-8 text-xs px-2"
                  />
                  <span className="text-xs text-muted-foreground">mg/mL</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  Dose (mg)
                  <InfoTooltip content="The amount you want to inject per dose" />
                </Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  placeholder="e.g., 200"
                  value={mgDose}
                  onChange={(e) => handlePositiveInput(e.target.value, setMgDose, 0)}
                />
              </div>

              {/* Result */}
              {calculatedML && (
                <>
                  <div 
                    className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:bg-primary/15 transition-colors"
                    onClick={() => handleCopyResult(calculatedML, 'mL value')}
                  >
                    <div>
                      <p className="text-sm text-muted-foreground">Draw volume</p>
                      <p className="text-2xl font-bold text-primary">{calculatedML} mL</p>
                    </div>
                    <Copy className="w-5 h-5 text-primary" />
                  </div>

                  <Button 
                    onClick={handleAddToStack}
                    className="w-full flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add to Stack
                  </Button>
                </>
              )}
            </div>
          )}

          <Button 
            onClick={() => onOpenChange(false)} 
            variant="ghost" 
            className="w-full"
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
