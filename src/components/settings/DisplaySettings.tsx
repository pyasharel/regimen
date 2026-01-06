import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Scale, Ruler } from "lucide-react";
import { Label } from "@/components/ui/label";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Input } from "@/components/ui/input";
import { persistentStorage } from "@/utils/persistentStorage";
import { supabase } from "@/integrations/supabase/client";
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import { trackPreferenceSet } from "@/utils/analytics";

type UnitSystem = 'imperial' | 'metric';

export const DisplaySettings = () => {
  const navigate = useNavigate();

  const [unitSystem, setUnitSystem] = useState<UnitSystem>("imperial");
  const [heightFeet, setHeightFeet] = useState("");
  const [heightInches, setHeightInches] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [currentWeight, setCurrentWeight] = useState("");
  const [goalWeight, setGoalWeight] = useState("");

  // Derived values based on unit system
  const weightUnit = unitSystem === 'imperial' ? 'lbs' : 'kg';
  const heightUnit = unitSystem;

  // Load saved preferences
  useEffect(() => {
    const loadSettings = async () => {
      // Try to load unit system first, fall back to weight unit
      const savedUnitSystem = await persistentStorage.get('unitSystem');
      const savedWeightUnit = await persistentStorage.get('weightUnit');
      const savedHeightUnit = await persistentStorage.get('heightUnit');
      const savedHeightFeet = await persistentStorage.get('heightFeet');
      const savedHeightInches = await persistentStorage.get('heightInches');
      const savedHeightCm = await persistentStorage.get('heightCm');
      const savedGoalWeight = await persistentStorage.get('goalWeight');
      const savedCurrentWeight = await persistentStorage.get('currentWeight');
      
      // Determine unit system from saved values
      if (savedUnitSystem) {
        setUnitSystem(savedUnitSystem as UnitSystem);
      } else if (savedWeightUnit === 'kg' || savedHeightUnit === 'metric') {
        setUnitSystem('metric');
      }
      
      if (savedHeightFeet) setHeightFeet(savedHeightFeet);
      if (savedHeightInches) setHeightInches(savedHeightInches);
      if (savedHeightCm) setHeightCm(savedHeightCm);
      if (savedGoalWeight) setGoalWeight(savedGoalWeight);
      if (savedCurrentWeight) setCurrentWeight(savedCurrentWeight);
      
      // If no local data, try to sync from profile
      const hasLocalData = savedHeightFeet || savedHeightInches || savedHeightCm || savedGoalWeight || savedCurrentWeight;
      if (!hasLocalData) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('height_feet, height_inches, height_cm, height_unit, goal_weight, current_weight, current_weight_unit')
              .eq('user_id', user.id)
              .maybeSingle();
            
            if (profile) {
              // Determine unit system from profile
              if (profile.height_unit === 'cm' || profile.current_weight_unit === 'kg') {
                setUnitSystem('metric');
                await persistentStorage.set('unitSystem', 'metric');
              }
              
              if (profile.height_feet) {
                const val = profile.height_feet.toString();
                setHeightFeet(val);
                await persistentStorage.set('heightFeet', val);
              }
              if (profile.height_inches) {
                const val = profile.height_inches.toString();
                setHeightInches(val);
                await persistentStorage.set('heightInches', val);
              }
              if (profile.height_cm) {
                const val = profile.height_cm.toString();
                setHeightCm(val);
                await persistentStorage.set('heightCm', val);
              }
              if (profile.goal_weight) {
                const val = profile.goal_weight.toString();
                setGoalWeight(val);
                await persistentStorage.set('goalWeight', val);
              }
              if (profile.current_weight) {
                const val = profile.current_weight.toString();
                setCurrentWeight(val);
                await persistentStorage.set('currentWeight', val);
              }
            }
          }
        } catch (err) {
          console.error('Error syncing profile data:', err);
        }
      }
    };
    
    loadSettings();
  }, []);

  const triggerHaptic = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        await Haptics.impact({ style: ImpactStyle.Light });
      } else if ('vibrate' in navigator) {
        navigator.vibrate(30);
      }
    } catch (err) {
      console.log('Haptic failed:', err);
    }
  };

  const handleUnitSystemChange = async (newSystem: UnitSystem) => {
    triggerHaptic();
    const oldSystem = unitSystem;
    
    // Convert height when switching
    if (newSystem === 'metric' && oldSystem === 'imperial' && (heightFeet || heightInches)) {
      const totalInches = (parseInt(heightFeet) || 0) * 12 + (parseInt(heightInches) || 0);
      const cm = Math.round(totalInches * 2.54);
      setHeightCm(cm.toString());
      await persistentStorage.set('heightCm', cm.toString());
    } else if (newSystem === 'imperial' && oldSystem === 'metric' && heightCm) {
      const totalInches = Math.round(parseInt(heightCm) / 2.54);
      const feet = Math.floor(totalInches / 12).toString();
      const inches = (totalInches % 12).toString();
      setHeightFeet(feet);
      setHeightInches(inches);
      await persistentStorage.set('heightFeet', feet);
      await persistentStorage.set('heightInches', inches);
    }
    
    // Convert weights when switching
    if (currentWeight) {
      const currentValue = parseFloat(currentWeight);
      if (!isNaN(currentValue)) {
        let newValue: string;
        if (newSystem === 'metric' && oldSystem === 'imperial') {
          newValue = Math.round(currentValue / 2.20462).toString();
        } else if (newSystem === 'imperial' && oldSystem === 'metric') {
          newValue = Math.round(currentValue * 2.20462).toString();
        } else {
          newValue = currentWeight;
        }
        setCurrentWeight(newValue);
        await persistentStorage.set('currentWeight', newValue);
      }
    }
    
    if (goalWeight) {
      const currentValue = parseFloat(goalWeight);
      if (!isNaN(currentValue)) {
        let newValue: string;
        if (newSystem === 'metric' && oldSystem === 'imperial') {
          newValue = Math.round(currentValue / 2.20462).toString();
        } else if (newSystem === 'imperial' && oldSystem === 'metric') {
          newValue = Math.round(currentValue * 2.20462).toString();
        } else {
          newValue = goalWeight;
        }
        setGoalWeight(newValue);
        await persistentStorage.set('goalWeight', newValue);
      }
    }
    
    setUnitSystem(newSystem);
    
    // Save all related unit preferences for compatibility
    await persistentStorage.set('unitSystem', newSystem);
    await persistentStorage.set('weightUnit', newSystem === 'imperial' ? 'lbs' : 'kg');
    await persistentStorage.set('heightUnit', newSystem);
    
    trackPreferenceSet('unitSystem', newSystem);
  };

  const handleHeightFeetChange = async (value: string) => {
    setHeightFeet(value);
    await persistentStorage.set('heightFeet', value);
  };

  const handleHeightInchesChange = async (value: string) => {
    setHeightInches(value);
    await persistentStorage.set('heightInches', value);
  };

  const handleHeightCmChange = async (value: string) => {
    setHeightCm(value);
    await persistentStorage.set('heightCm', value);
  };

  const handleCurrentWeightChange = async (value: string) => {
    setCurrentWeight(value);
    await persistentStorage.set('currentWeight', value);
  };

  const handleGoalWeightChange = async (value: string) => {
    setGoalWeight(value);
    await persistentStorage.set('goalWeight', value);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm safe-top">
        <div className="flex items-center gap-3 px-4 py-4">
          <button
            onClick={() => navigate("/settings")}
            className="rounded-lg p-2 hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold">Display</h1>
        </div>
      </header>

      <div className="p-4 space-y-6 max-w-2xl mx-auto">
        {/* Unit System Toggle - Prominent at top */}
        <div className="p-4 rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Scale className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">Unit System</h2>
              <p className="text-sm text-muted-foreground">Choose your preferred measurement units</p>
            </div>
          </div>
          
          <SegmentedControl
            options={[
              { value: 'imperial' as const, label: 'Imperial', sublabel: 'lbs, ft/in' },
              { value: 'metric' as const, label: 'Metric', sublabel: 'kg, cm' }
            ]}
            value={unitSystem}
            onChange={handleUnitSystemChange}
            size="lg"
            className="w-full"
          />
        </div>

        {/* Body Measurements - Clean card with prominent inputs */}
        <div className="p-4 rounded-xl border border-border bg-card shadow-[var(--shadow-card)] space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Ruler className="h-5 w-5 text-primary" />
            </div>
            <h2 className="font-semibold">Body Measurements</h2>
          </div>

          {/* Height */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">Height</Label>
            {unitSystem === "imperial" ? (
              <div className="flex gap-3">
                <div className="flex-1">
                  <div className="relative">
                    <Input
                      type="number"
                      inputMode="numeric"
                      placeholder="5"
                      value={heightFeet}
                      onChange={(e) => handleHeightFeetChange(e.target.value)}
                      className="text-lg font-semibold pr-10 h-12"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">ft</span>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="relative">
                    <Input
                      type="number"
                      inputMode="numeric"
                      placeholder="10"
                      value={heightInches}
                      onChange={(e) => handleHeightInchesChange(e.target.value)}
                      className="text-lg font-semibold pr-10 h-12"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">in</span>
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
                  onChange={(e) => handleHeightCmChange(e.target.value)}
                  className="text-lg font-semibold pr-12 h-12"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">cm</span>
              </div>
            )}
          </div>

          {/* Current Weight */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">Current Weight</Label>
            <div className="relative">
              <Input
                type="number"
                inputMode="decimal"
                placeholder={unitSystem === 'imperial' ? "180" : "82"}
                value={currentWeight}
                onChange={(e) => handleCurrentWeightChange(e.target.value)}
                className="text-lg font-semibold pr-12 h-12"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{weightUnit}</span>
            </div>
          </div>

          {/* Goal Weight */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">Goal Weight</Label>
            <div className="relative">
              <Input
                type="number"
                inputMode="decimal"
                placeholder={unitSystem === 'imperial' ? "165" : "75"}
                value={goalWeight}
                onChange={(e) => handleGoalWeightChange(e.target.value)}
                className="text-lg font-semibold pr-12 h-12"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{weightUnit}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};