import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Palette, Ruler, Target } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/components/ThemeProvider";

export const DisplaySettings = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const [weightUnit, setWeightUnit] = useState<"lbs" | "kg">("lbs");
  const [heightUnit, setHeightUnit] = useState<"imperial" | "metric">("imperial");
  const [heightFeet, setHeightFeet] = useState("");
  const [heightInches, setHeightInches] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [goalWeight, setGoalWeight] = useState("");

  // Load saved preferences
  useEffect(() => {
    const savedWeightUnit = localStorage.getItem('weightUnit');
    const savedHeightUnit = localStorage.getItem('heightUnit');
    const savedHeightFeet = localStorage.getItem('heightFeet');
    const savedHeightInches = localStorage.getItem('heightInches');
    const savedHeightCm = localStorage.getItem('heightCm');
    const savedGoalWeight = localStorage.getItem('goalWeight');
    
    if (savedWeightUnit) setWeightUnit(savedWeightUnit as "lbs" | "kg");
    if (savedHeightUnit) setHeightUnit(savedHeightUnit as "imperial" | "metric");
    if (savedHeightFeet) setHeightFeet(savedHeightFeet);
    if (savedHeightInches) setHeightInches(savedHeightInches);
    if (savedHeightCm) setHeightCm(savedHeightCm);
    if (savedGoalWeight) setGoalWeight(savedGoalWeight);
  }, []);

  const handleWeightUnitChange = (unit: "lbs" | "kg") => {
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
    localStorage.setItem('weightUnit', unit);
  };

  const handleHeightUnitChange = (unit: "imperial" | "metric") => {
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
    localStorage.setItem('heightUnit', unit);
  };

  const handleHeightFeetChange = (value: string) => {
    setHeightFeet(value);
    localStorage.setItem('heightFeet', value);
  };

  const handleHeightInchesChange = (value: string) => {
    setHeightInches(value);
    localStorage.setItem('heightInches', value);
  };

  const handleHeightCmChange = (value: string) => {
    setHeightCm(value);
    localStorage.setItem('heightCm', value);
  };

  const handleGoalWeightChange = (value: string) => {
    setGoalWeight(value);
    localStorage.setItem('goalWeight', value);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-card/95 backdrop-blur-sm px-4 py-4 mt-5">
        <button onClick={() => navigate("/settings")} className="rounded-lg p-2 hover:bg-muted transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold">Display</h1>
      </header>

      <div className="p-4 space-y-6 max-w-2xl mx-auto">
        {/* Theme Section */}
        <div className="space-y-4 p-4 rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <Palette className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold">Theme</h2>
              <p className="text-sm text-muted-foreground">Choose your preferred theme</p>
            </div>
          </div>
          <div className="space-y-2">
            <button
              onClick={() => setTheme("light")}
              className={`w-full rounded-lg border p-4 text-left transition-all ${
                theme === "light" ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
              }`}
            >
              <div className="font-semibold">Light</div>
              <div className="text-xs text-muted-foreground">Bright and clean</div>
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={`w-full rounded-lg border p-4 text-left transition-all ${
                theme === "dark" ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
              }`}
            >
              <div className="font-semibold">Dark</div>
              <div className="text-xs text-muted-foreground">Easy on the eyes</div>
            </button>
            <button
              onClick={() => setTheme("system")}
              className={`w-full rounded-lg border p-4 text-left transition-all ${
                theme === "system" ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
              }`}
            >
              <div className="font-semibold">System</div>
              <div className="text-xs text-muted-foreground">Match device settings</div>
            </button>
          </div>
        </div>

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
          <div className="space-y-2">
            <Label className="text-sm font-medium">Weight Unit</Label>
            <div className="flex gap-2">
              <button
                onClick={() => handleWeightUnitChange("lbs")}
                className={`flex-1 rounded-lg border p-3 text-center transition-all ${
                  weightUnit === "lbs" ? "border-primary bg-primary/10 font-semibold" : "border-border hover:bg-muted"
                }`}
              >
                Pounds (lbs)
              </button>
              <button
                onClick={() => handleWeightUnitChange("kg")}
                className={`flex-1 rounded-lg border p-3 text-center transition-all ${
                  weightUnit === "kg" ? "border-primary bg-primary/10 font-semibold" : "border-border hover:bg-muted"
                }`}
              >
                Kilograms (kg)
              </button>
            </div>
          </div>

          {/* Height Unit */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Height Unit</Label>
            <div className="flex gap-2">
              <button
                onClick={() => handleHeightUnitChange("imperial")}
                className={`flex-1 rounded-lg border p-3 text-center transition-all ${
                  heightUnit === "imperial" ? "border-primary bg-primary/10 font-semibold" : "border-border hover:bg-muted"
                }`}
              >
                Imperial (ft/in)
              </button>
              <button
                onClick={() => handleHeightUnitChange("metric")}
                className={`flex-1 rounded-lg border p-3 text-center transition-all ${
                  heightUnit === "metric" ? "border-primary bg-primary/10 font-semibold" : "border-border hover:bg-muted"
                }`}
              >
                Metric (cm)
              </button>
            </div>
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
