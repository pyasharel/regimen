import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Calculator, Droplets, FlaskConical, Copy, Plus, ArrowRightLeft, Syringe } from "lucide-react";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { toast } from 'sonner';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import { trackCalculatorUsed } from '@/utils/analytics';

interface CalculatorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Optional pre-fill from existing compound
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
const SYRINGE_SIZES = [
  { value: 30, label: '0.3mL (30u)' },
  { value: 50, label: '0.5mL (50u)' },
  { value: 100, label: '1.0mL (100u)' },
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
  const [activeTab, setActiveTab] = useState<CalculatorTab>('reconstitution');
  
  // Reconstitution calculator state
  const [reconMode, setReconMode] = useState<ReconstitutionMode>('standard');
  const [vialSize, setVialSize] = useState(initialVialSize?.toString() || '');
  const [vialUnit, setVialUnit] = useState(initialVialUnit);
  const [bacWater, setBacWater] = useState(initialBacWater?.toString() || '');
  const [intendedDose, setIntendedDose] = useState(initialDose?.toString() || '');
  const [doseUnit, setDoseUnit] = useState(initialDoseUnit);
  const [syringeSize, setSyringeSize] = useState(100);
  
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

    // Convert to mcg
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
    // Scale by syringe size (100u = 1mL, 50u = 0.5mL, 30u = 0.3mL)
    const iu = mlNeeded * syringeSize;

    if (iu <= 0 || !isFinite(iu)) return null;
    return iu.toFixed(1);
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

    // Convert to mcg
    const vialMcg = vialUnit === 'mg' ? vialNum * 1000 : vialNum;
    let doseMcg: number;
    if (doseUnit === 'mg') {
      doseMcg = doseNum * 1000;
    } else if (doseUnit === 'mcg') {
      doseMcg = doseNum;
    } else {
      return null;
    }

    // Working backwards: 
    // iu = mlNeeded * syringeSize
    // mlNeeded = doseMcg / concentrationMcgPerMl
    // concentrationMcgPerMl = vialMcg / bacWater
    // So: unitsNum = (doseMcg / (vialMcg / bacWater)) * syringeSize
    // unitsNum = (doseMcg * bacWater / vialMcg) * syringeSize
    // bacWater = (unitsNum * vialMcg) / (doseMcg * syringeSize)
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
      toast.success(`${label} copied to clipboard`);
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

  const tabOptions = [
    { value: 'reconstitution', label: 'Reconstitution' },
    { value: 'ml', label: 'mL Calculator' }
  ];

  const modeOptions = [
    { value: 'standard', label: 'Standard' },
    { value: 'reverse', label: 'Reverse' }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" hideClose>
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <Calculator className="w-5 h-5 text-primary" />
            Dose Calculator
          </DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Tab Selector */}
          <SegmentedControl
            value={activeTab}
            onChange={(val) => {
              triggerHaptic();
              setActiveTab(val as CalculatorTab);
            }}
            options={tabOptions}
          />

          {/* Reconstitution Calculator */}
          {activeTab === 'reconstitution' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                <FlaskConical className="w-4 h-4 flex-shrink-0" />
                <span>
                  {reconMode === 'standard' 
                    ? 'Calculate how many units to draw on your syringe'
                    : 'Calculate how much BAC water to add for your preferred units'
                  }
                </span>
              </div>

              {/* Mode Toggle */}
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4" />
                  Calculator Mode
                </Label>
                <SegmentedControl
                  value={reconMode}
                  onChange={(val) => {
                    triggerHaptic();
                    setReconMode(val as ReconstitutionMode);
                  }}
                  options={modeOptions}
                />
              </div>

              {/* Vial Size with Quick Select */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Vial Size</Label>
                <div className="flex gap-2 flex-wrap">
                  {VIAL_SIZES.map((size) => (
                    <button
                      key={size}
                      onClick={() => {
                        triggerHaptic();
                        setVialSize(size.toString());
                      }}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        vialSize === size.toString()
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      {size}mg
                    </button>
                  ))}
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="Custom"
                    value={VIAL_SIZES.includes(Number(vialSize)) ? '' : vialSize}
                    onChange={(e) => setVialSize(e.target.value)}
                    className="w-20 h-8"
                  />
                </div>
              </div>

              {/* Standard Mode Fields */}
              {reconMode === 'standard' && (
                <>
                  {/* BAC Water with Quick Select */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">BAC Water Added (mL)</Label>
                    <div className="flex gap-2 flex-wrap">
                      {BAC_WATER_AMOUNTS.map((amount) => (
                        <button
                          key={amount}
                          onClick={() => {
                            triggerHaptic();
                            setBacWater(amount.toString());
                          }}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                            bacWater === amount.toString()
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted hover:bg-muted/80'
                          }`}
                        >
                          {amount}mL
                        </button>
                      ))}
                      <Input
                        type="number"
                        inputMode="decimal"
                        placeholder="Custom"
                        value={BAC_WATER_AMOUNTS.includes(Number(bacWater)) ? '' : bacWater}
                        onChange={(e) => setBacWater(e.target.value)}
                        className="w-20 h-8"
                      />
                    </div>
                  </div>

                  {/* Desired Dose */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Desired Dose</Label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        placeholder="e.g., 250"
                        value={intendedDose}
                        onChange={(e) => setIntendedDose(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Unit</Label>
                      <SegmentedControl
                        value={doseUnit}
                        onChange={(val) => setDoseUnit(val)}
                        options={[
                          { value: 'mg', label: 'mg' },
                          { value: 'mcg', label: 'mcg' }
                        ]}
                      />
                    </div>
                  </div>

                  {/* Syringe Size Selector */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Syringe className="w-4 h-4" />
                      Syringe Size
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

                  {/* Standard Result */}
                  {calculatedIU && (
                    <div 
                      className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:bg-primary/15 transition-colors"
                      onClick={() => handleCopyResult(calculatedIU, 'Units value')}
                    >
                      <div>
                        <p className="text-sm text-muted-foreground">Draw on syringe</p>
                        <p className="text-2xl font-bold text-primary">{calculatedIU} units</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          on a {syringeSize}-unit syringe
                        </p>
                      </div>
                      <Copy className="w-5 h-5 text-primary" />
                    </div>
                  )}
                </>
              )}

              {/* Reverse Mode Fields */}
              {reconMode === 'reverse' && (
                <>
                  {/* Desired Dose */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Desired Dose</Label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        placeholder="e.g., 250"
                        value={intendedDose}
                        onChange={(e) => setIntendedDose(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Unit</Label>
                      <SegmentedControl
                        value={doseUnit}
                        onChange={(val) => setDoseUnit(val)}
                        options={[
                          { value: 'mg', label: 'mg' },
                          { value: 'mcg', label: 'mcg' }
                        ]}
                      />
                    </div>
                  </div>

                  {/* Preferred Units to Draw */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Preferred Units to Draw</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      placeholder="e.g., 10"
                      value={preferredUnits}
                      onChange={(e) => setPreferredUnits(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      How many units you want to draw for each dose
                    </p>
                  </div>

                  {/* Syringe Size Selector */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Syringe className="w-4 h-4" />
                      Syringe Size
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

                  {/* Reverse Result */}
                  {calculatedReverseBAC && (
                    <div 
                      className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:bg-primary/15 transition-colors"
                      onClick={() => handleCopyResult(calculatedReverseBAC, 'BAC water amount')}
                    >
                      <div>
                        <p className="text-sm text-muted-foreground">Add BAC water</p>
                        <p className="text-2xl font-bold text-primary">{calculatedReverseBAC} mL</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          to draw {preferredUnits} units per {intendedDose}{doseUnit} dose
                        </p>
                      </div>
                      <Copy className="w-5 h-5 text-primary" />
                    </div>
                  )}
                </>
              )}

              {/* Add to Stack Button */}
              {(calculatedIU || calculatedReverseBAC) && (
                <Button 
                  onClick={handleAddToStack}
                  variant="outline"
                  className="w-full flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add this compound to your stack
                </Button>
              )}
            </div>
          )}

          {/* mL Calculator */}
          {activeTab === 'ml' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                <Droplets className="w-4 h-4 flex-shrink-0" />
                <span>Calculate mL to draw for oil-based compounds</span>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Concentration (mg/mL)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="e.g., 250"
                  value={concentration}
                  onChange={(e) => setConcentration(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Enter the mg/mL shown on your vial label
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Desired Dose (mg)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="e.g., 200"
                  value={mgDose}
                  onChange={(e) => setMgDose(e.target.value)}
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

                  {/* Add to Stack Button */}
                  <Button 
                    onClick={handleAddToStack}
                    variant="outline"
                    className="w-full flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add this compound to your stack
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
