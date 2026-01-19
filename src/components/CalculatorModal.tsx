import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Calculator, Droplets, FlaskConical, Copy } from "lucide-react";
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

type CalculatorTab = 'reconstitution' | 'volume';

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
  const [activeTab, setActiveTab] = useState<CalculatorTab>('reconstitution');
  
  // Reconstitution calculator state
  const [vialSize, setVialSize] = useState(initialVialSize?.toString() || '');
  const [vialUnit, setVialUnit] = useState(initialVialUnit);
  const [bacWater, setBacWater] = useState(initialBacWater?.toString() || '');
  const [intendedDose, setIntendedDose] = useState(initialDose?.toString() || '');
  const [doseUnit, setDoseUnit] = useState(initialDoseUnit);
  
  // Volume calculator state
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

  // Calculate IU for reconstitution
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
    const iu = mlNeeded * 100;

    if (iu <= 0 || !isFinite(iu)) return null;
    return iu.toFixed(1);
  };

  // Calculate mL for volume calculator
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

  const calculatedIU = calculateIU();
  const calculatedML = calculateML();

  const tabOptions = [
    { value: 'reconstitution', label: 'Reconstitution (IU)' },
    { value: 'volume', label: 'Volume (mL)' }
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

        <div className="space-y-6 pt-2">
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
                <span>Calculate how many units to draw on a 100-unit insulin syringe</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Vial Size</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="e.g., 5"
                    value={vialSize}
                    onChange={(e) => setVialSize(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Unit</Label>
                  <SegmentedControl
                    value={vialUnit}
                    onChange={(val) => setVialUnit(val)}
                    options={[
                      { value: 'mg', label: 'mg' },
                      { value: 'mcg', label: 'mcg' }
                    ]}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">BAC Water Added (mL)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="e.g., 2"
                  value={bacWater}
                  onChange={(e) => setBacWater(e.target.value)}
                />
              </div>

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

              {/* Result */}
              {calculatedIU && (
                <div 
                  className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:bg-primary/15 transition-colors"
                  onClick={() => handleCopyResult(calculatedIU, 'IU value')}
                >
                  <div>
                    <p className="text-sm text-muted-foreground">Draw on syringe</p>
                    <p className="text-2xl font-bold text-primary">{calculatedIU} IU</p>
                  </div>
                  <Copy className="w-5 h-5 text-primary" />
                </div>
              )}
            </div>
          )}

          {/* Volume Calculator */}
          {activeTab === 'volume' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                <Droplets className="w-4 h-4 flex-shrink-0" />
                <span>Calculate mL to draw for oil-based compounds (mg/mL concentration)</span>
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
              )}
            </div>
          )}

          <Button 
            onClick={() => onOpenChange(false)} 
            variant="outline" 
            className="w-full"
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
