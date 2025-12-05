import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const [weight, setWeight] = useState("");

  useEffect(() => {
    if (type === "height" && currentValue) {
      const totalInches = currentValue;
      setFeet(Math.floor(totalInches / 12).toString());
      setInches((totalInches % 12).toString());
    } else if (type === "goal" && currentValue) {
      setWeight(currentValue.toString());
    }
  }, [currentValue, type, open]);

  const handleSave = () => {
    if (type === "height") {
      const totalInches = (parseInt(feet) || 0) * 12 + (parseInt(inches) || 0);
      if (totalInches > 0) {
        onSave(totalInches);
        onOpenChange(false);
      }
    } else {
      const goalWeight = parseFloat(weight);
      if (goalWeight > 0) {
        onSave(goalWeight);
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
        </DialogHeader>

        <div className="space-y-4 py-4">
          {type === "height" ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Your height is used to calculate BMI
              </p>
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
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Track progress toward your target weight
              </p>
              <div className="space-y-2">
                <Label htmlFor="goal">Goal Weight (lbs)</Label>
                <Input
                  id="goal"
                  type="number"
                  inputMode="decimal"
                  placeholder="180"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  min="50"
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