import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Ruler, Target } from "lucide-react";
import { Label } from "@/components/ui/label";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Input } from "@/components/ui/input";
import { persistentStorage } from "@/utils/persistentStorage";
import { supabase } from "@/integrations/supabase/client";
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import { trackPreferenceSet } from "@/utils/analytics";

export const DisplaySettings = () => {
  const navigate = useNavigate();

  const [weightUnit, setWeightUnit] = useState<"lbs" | "kg">("lbs");
  const [heightUnit, setHeightUnit] = useState<"imperial" | "metric">("imperial");
  const [heightFeet, setHeightFeet] = useState("");
  const [heightInches, setHeightInches] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [goalWeight, setGoalWeight] = useState("");
  const [currentWeight, setCurrentWeight] = useState("");

  // Load saved preferences - first from persistent storage, then sync from profile if needed
  useEffect(() => {
    const loadSettings = async () => {
      // First try persistent storage
      const savedWeightUnit = await persistentStorage.get('weightUnit');
      const savedHeightUnit = await persistentStorage.get('heightUnit');
      const savedHeightFeet = await persistentStorage.get('heightFeet');
      const savedHeightInches = await persistentStorage.get('heightInches');
      const savedHeightCm = await persistentStorage.get('heightCm');
      const savedGoalWeight = await persistentStorage.get('goalWeight');
      const savedCurrentWeight = await persistentStorage.get('currentWeight');
      
      if (savedWeightUnit) setWeightUnit(savedWeightUnit as "lbs" | "kg");
      if (savedHeightUnit) setHeightUnit(savedHeightUnit as "imperial" | "metric");
      if (savedHeightFeet) setHeightFeet(savedHeightFeet);
      if (savedHeightInches) setHeightInches(savedHeightInches);
      if (savedHeightCm) setHeightCm(savedHeightCm);
      if (savedGoalWeight) setGoalWeight(savedGoalWeight);
      if (savedCurrentWeight) setCurrentWeight(savedCurrentWeight);
      
      // If no local data, try to sync from profile (for onboarding data)
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
              // Sync profile data to local state and persistent storage
              if (profile.height_unit) {
                const unit = profile.height_unit === 'cm' ? 'metric' : 'imperial';
                setHeightUnit(unit);
                await persistentStorage.set('heightUnit', unit);
              }
              if (profile.current_weight_unit) {
                const unit = profile.current_weight_unit as "lbs" | "kg";
                setWeightUnit(unit);
                await persistentStorage.set('weightUnit', unit);
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

  const handleWeightUnitChange = async (unit: "lbs" | "kg") => {
    triggerHaptic();
    // Convert goal weight when switching units
    if (goalWeight) {
      const currentValue = parseFloat(goalWeight);
      if (!isNaN(currentValue)) {
        if (unit === "kg" && weightUnit === "lbs") {
          setGoalWeight(Math.round(currentValue / 2.20462).toString());
        } else if (unit === "lbs" && weightUnit === "kg") {
          setGoalWeight(Math.round(currentValue * 2.20462).toString());
        }
      }
    }
    setWeightUnit(unit);
    await persistentStorage.set('weightUnit', unit);
    trackPreferenceSet('weightUnit', unit);
  };

  const handleHeightUnitChange = async (unit: "imperial" | "metric") => {
    triggerHaptic();
    // Convert height when switching units
    if (unit === "metric" && heightUnit === "imperial" && (heightFeet || heightInches)) {
      const totalInches = (parseInt(heightFeet) || 0) * 12 + (parseInt(heightInches) || 0);
      const cm = Math.round(totalInches * 2.54);
      setHeightCm(cm.toString());
    } else if (unit === "imperial" && heightUnit === "metric" && heightCm) {
      const totalInches = Math.round(parseInt(heightCm) / 2.54);
      setHeightFeet(Math.floor(totalInches / 12).toString());
      setHeightInches((totalInches % 12).toString());
    }
    setHeightUnit(unit);
    await persistentStorage.set('heightUnit', unit);
    trackPreferenceSet('heightUnit', unit);
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

  const handleGoalWeightChange = async (value: string) => {
    setGoalWeight(value);
    await persistentStorage.set('goalWeight', value);
  };

  const handleCurrentWeightChange = async (value: string) => {
    setCurrentWeight(value);
    await persistentStorage.set('currentWeight', value);
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
        {/* Body Measurements Section */}
        <div className="space-y-4 p-4 rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <Ruler className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold">Body Measurements</h2>
              <p className="text-sm text-muted-foreground">Your measurement preferences and goals</p>
            </div>
          </div>
          
          {/* Weight Unit */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Weight Unit</Label>
            <SegmentedControl
              options={[
                { value: 'lbs' as const, label: 'lbs', sublabel: 'Pounds' },
                { value: 'kg' as const, label: 'kg', sublabel: 'Kilograms' }
              ]}
              value={weightUnit}
              onChange={handleWeightUnitChange}
              size="lg"
              className="w-full"
            />
          </div>

          {/* Height Unit */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Height Unit</Label>
            <SegmentedControl
              options={[
                { value: 'imperial' as const, label: 'ft/in', sublabel: 'Imperial' },
                { value: 'metric' as const, label: 'cm', sublabel: 'Metric' }
              ]}
              value={heightUnit}
              onChange={handleHeightUnitChange}
              size="lg"
              className="w-full"
            />
          </div>

          {/* Height Input */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Height</Label>
            {heightUnit === "imperial" ? (
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    type="number"
                    placeholder="Feet"
                    value={heightFeet}
                    onChange={(e) => handleHeightFeetChange(e.target.value)}
                    className="text-center"
                  />
                  <p className="text-xs text-muted-foreground text-center mt-1">ft</p>
                </div>
                <div className="flex-1">
                  <Input
                    type="number"
                    placeholder="Inches"
                    value={heightInches}
                    onChange={(e) => handleHeightInchesChange(e.target.value)}
                    className="text-center"
                  />
                  <p className="text-xs text-muted-foreground text-center mt-1">in</p>
                </div>
              </div>
            ) : (
              <div>
                <Input
                  type="number"
                  placeholder="Height in cm"
                  value={heightCm}
                  onChange={(e) => handleHeightCmChange(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">centimeters</p>
              </div>
            )}
          </div>

          {/* Current Weight */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Ruler className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Current Weight</Label>
            </div>
            <Input
              type="number"
              placeholder={`Current weight in ${weightUnit}`}
              value={currentWeight}
              onChange={(e) => handleCurrentWeightChange(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Your starting weight in {weightUnit === "lbs" ? "pounds" : "kilograms"}
            </p>
          </div>

          {/* Goal Weight */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Goal Weight</Label>
            </div>
            <Input
              type="number"
              placeholder={`Goal weight in ${weightUnit}`}
              value={goalWeight}
              onChange={(e) => handleGoalWeightChange(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Your target weight in {weightUnit === "lbs" ? "pounds" : "kilograms"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
