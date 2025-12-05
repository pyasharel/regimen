import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface BodySettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "height" | "goal";
  currentValue?: number | null;
  onSave: (value: number) => void;
}

export const BodySettingsModal = ({
  open,
  onOpenChange,
  type,
  currentValue,
  onSave
}: BodySettingsModalProps) => {
  const [feet, setFeet] = useState("");
  const [inches, setInches] = useState("");
  const [cm, setCm] = useState("");
  const [weight, setWeight] = useState("");
  const [heightUnit, setHeightUnit] = useState<"imperial" | "metric">("imperial");
  const [weightUnit, setWeightUnit] = useState<"lbs" | "kg">("lbs");

  useEffect(() => {
    if (type === "height" && currentValue) {
      const totalInches = currentValue;
      setFeet(Math.floor(totalInches / 12).toString());
      setInches((totalInches % 12).toString());
      setCm(Math.round(totalInches * 2.54).toString());
    } else if (type === "goal" && currentValue) {
      setWeight(currentValue.toString());
    }
  }, [currentValue, type, open]);

  const handleSave = () => {
    if (type === "height") {
      let totalInches: number;
      if (heightUnit === "imperial") {
        totalInches = (parseInt(feet) || 0) * 12 + (parseInt(inches) || 0);
      } else {
        totalInches = Math.round((parseFloat(cm) || 0) / 2.54);
      }
      if (totalInches > 0) {
        onSave(totalInches);
        onOpenChange(false);
      }
    } else {
      let goalWeightLbs: number;
      if (weightUnit === "lbs") {
        goalWeightLbs = parseFloat(weight);
      } else {
        goalWeightLbs = parseFloat(weight) * 2.20462;
      }
      if (goalWeightLbs > 0) {
        onSave(goalWeightLbs);
        onOpenChange(false);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {type === "height" ? "Set Your Height" : "Set Goal Weight"}
          </DialogTitle>
          <DialogDescription>
            {type === "height" 
              ? "Your height is used to calculate BMI" 
              : "Track progress toward your target weight"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {type === "height" ? (
            <div className="space-y-4">
              {/* Unit Toggle */}
              <div className="flex gap-1 bg-secondary/50 p-1 rounded-lg">
                <button
                  onClick={() => setHeightUnit("imperial")}
                  className={cn(
                    "flex-1 py-1.5 rounded-md text-xs font-medium transition-all",
                    heightUnit === "imperial"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  ft / in
                </button>
                <button
                  onClick={() => setHeightUnit("metric")}
                  className={cn(
                    "flex-1 py-1.5 rounded-md text-xs font-medium transition-all",
                    heightUnit === "metric"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  cm
                </button>
              </div>

              {heightUnit === "imperial" ? (
                <div className="flex gap-3">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="feet">Feet</Label>
                    <Input
                      id="feet"
                      type="number"
                      inputMode="numeric"
                      placeholder="5"
                      value={feet}
                      onChange={(e) => setFeet(e.target.value)}
                      min="3"
                      max="8"
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="inches">Inches</Label>
                    <Input
                      id="inches"
                      type="number"
                      inputMode="numeric"
                      placeholder="10"
                      value={inches}
                      onChange={(e) => setInches(e.target.value)}
                      min="0"
                      max="11"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="cm">Centimeters</Label>
                  <Input
                    id="cm"
                    type="number"
                    inputMode="numeric"
                    placeholder="175"
                    value={cm}
                    onChange={(e) => setCm(e.target.value)}
                    min="100"
                    max="250"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Unit Toggle */}
              <div className="flex gap-1 bg-secondary/50 p-1 rounded-lg">
                <button
                  onClick={() => setWeightUnit("lbs")}
                  className={cn(
                    "flex-1 py-1.5 rounded-md text-xs font-medium transition-all",
                    weightUnit === "lbs"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  lbs
                </button>
                <button
                  onClick={() => setWeightUnit("kg")}
                  className={cn(
                    "flex-1 py-1.5 rounded-md text-xs font-medium transition-all",
                    weightUnit === "kg"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  kg
                </button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="goal">Goal Weight ({weightUnit})</Label>
                <Input
                  id="goal"
                  type="number"
                  inputMode="decimal"
                  placeholder={weightUnit === "lbs" ? "180" : "82"}
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  min="20"
                  max="500"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleSave}>
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
