import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const COMMON_PEPTIDES = [
  "BPC-157", "TB-500", "Semaglutide", "Tirzepatide", "Retatrutide",
  "CJC-1295", "Ipamorelin", "NAD+", "Epitalon", "Thymosin Beta-4",
  "GHK-Cu", "Melanotan II", "PT-141", "DSIP", "Selank", "Semax"
];

const VIAL_SIZES = [5, 10, 15, 20];
const BAC_WATER_SIZES = [1, 2, 3, 5];

export const AddCompoundScreen = () => {
  const navigate = useNavigate();
  const [compoundName, setCompoundName] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [nickname, setNickname] = useState("");
  const [vialSize, setVialSize] = useState<number>(10);
  const [vialUnit, setVialUnit] = useState<"mg" | "mcg">("mg");
  const [bacWater, setBacWater] = useState<number>(2);
  const [dose, setDose] = useState<string>("");
  const [doseUnit, setDoseUnit] = useState<"mg" | "mcg">("mcg");
  const [frequency, setFrequency] = useState<string>("daily");
  const [timeOfDay, setTimeOfDay] = useState<string>("morning");

  const calculateIU = () => {
    if (!dose || !vialSize || !bacWater) return null;
    
    const vialMcg = vialUnit === "mg" ? vialSize * 1000 : vialSize;
    const doseMcg = doseUnit === "mg" ? parseFloat(dose) * 1000 : parseFloat(dose);
    const concentration = vialMcg / bacWater;
    const volumeML = doseMcg / concentration;
    const iu = volumeML * 100;
    
    return iu.toFixed(1);
  };

  const calculatedIU = calculateIU();

  const getWarning = () => {
    if (!calculatedIU) return null;
    const iu = parseFloat(calculatedIU);
    
    if (iu < 2) return "⚠️ Very small dose - consider using less BAC water";
    if (iu > 100) return "⚠️ Exceeds syringe capacity";
    if (iu >= 50) return "⚠️ Large dose - please double-check your calculation";
    return null;
  };

  const warning = getWarning();

  const handleSave = () => {
    if (!compoundName || !dose) {
      toast.error("Please fill in required fields");
      return;
    }
    
    toast.success("Compound added successfully!");
    navigate("/today");
  };

  const filteredPeptides = COMMON_PEPTIDES.filter(p => 
    p.toLowerCase().includes(compoundName.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/95 backdrop-blur-sm px-4 py-4">
        <button onClick={() => navigate("/today")} className="rounded-lg p-2 hover:bg-muted transition-colors">
          <X className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold">Add Compound</h1>
        <div className="w-9" /> {/* Spacer */}
      </header>

      <div className="mx-auto max-w-2xl space-y-6 p-6">
        {/* Basic Info */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Basic Information</h2>
          
          <div className="space-y-2">
            <Label htmlFor="compound">Compound Name *</Label>
            <div className="relative">
              <Input
                id="compound"
                value={compoundName}
                onChange={(e) => {
                  setCompoundName(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Type to search..."
                className="bg-input border-border"
              />
              {showSuggestions && compoundName && filteredPeptides.length > 0 && (
                <div className="absolute z-20 mt-1 w-full rounded-xl border border-border bg-popover shadow-xl max-h-48 overflow-auto">
                  {filteredPeptides.map((peptide) => (
                    <button
                      key={peptide}
                      onClick={() => {
                        setCompoundName(peptide);
                        setShowSuggestions(false);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-muted transition-colors"
                    >
                      {peptide}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nickname">Nickname (Optional)</Label>
            <Input
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="e.g., Morning BPC"
              className="bg-input border-border"
            />
          </div>
        </section>

        {/* Dose Calculator */}
        <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">Dose Calculator</h2>
          
          {/* Vial Size */}
          <div className="space-y-2">
            <Label>Vial Size</Label>
            <div className="flex gap-2">
              {VIAL_SIZES.map((size) => (
                <button
                  key={size}
                  onClick={() => setVialSize(size)}
                  className={`flex-1 rounded-xl px-4 py-2 font-medium transition-all ${
                    vialSize === size
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "bg-muted hover:bg-muted/80"
                  }`}
                >
                  {size}mg
                </button>
              ))}
            </div>
          </div>

          {/* BAC Water */}
          <div className="space-y-2">
            <Label>BAC Water Volume</Label>
            <div className="flex gap-2">
              {BAC_WATER_SIZES.map((size) => (
                <button
                  key={size}
                  onClick={() => setBacWater(size)}
                  className={`flex-1 rounded-xl px-4 py-2 font-medium transition-all ${
                    bacWater === size
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "bg-muted hover:bg-muted/80"
                  }`}
                >
                  {size}ml
                </button>
              ))}
            </div>
          </div>

          {/* Intended Dose */}
          <div className="space-y-2">
            <Label htmlFor="dose">Intended Dose *</Label>
            <div className="flex gap-2">
              <Input
                id="dose"
                type="number"
                value={dose}
                onChange={(e) => setDose(e.target.value)}
                placeholder="250"
                className="flex-1 bg-input border-border"
              />
              <select
                value={doseUnit}
                onChange={(e) => setDoseUnit(e.target.value as "mg" | "mcg")}
                className="rounded-xl border border-border bg-input px-4 py-2"
              >
                <option value="mcg">mcg</option>
                <option value="mg">mg</option>
              </select>
            </div>
          </div>

          {/* Calculation Result */}
          {calculatedIU && (
            <div className="rounded-xl border-2 border-secondary bg-muted p-4">
              <div className="text-center">
                <div className="text-4xl font-bold text-primary">{calculatedIU} IU</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  on a 100 IU insulin syringe
                </div>
              </div>
              {warning && (
                <div className="mt-3 flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>{warning}</span>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Schedule */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Schedule</h2>
          
          <div className="space-y-2">
            <Label>Frequency</Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "daily", label: "Daily" },
                { value: "weekdays", label: "Weekdays" },
                { value: "as-needed", label: "As Needed" },
                { value: "custom", label: "Every X Days 🔒", premium: true },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => !option.premium && setFrequency(option.value)}
                  disabled={option.premium}
                  className={`rounded-xl px-4 py-3 font-medium transition-all ${
                    frequency === option.value
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : option.premium
                      ? "bg-muted/50 text-muted-foreground cursor-not-allowed"
                      : "bg-muted hover:bg-muted/80"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Time of Day</Label>
            <div className="rounded-xl border border-border bg-muted/50 p-4">
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  id="morning"
                  checked={timeOfDay === "morning"}
                  onChange={() => setTimeOfDay("morning")}
                  className="h-4 w-4 accent-primary"
                />
                <Label htmlFor="morning" className="cursor-pointer">
                  Morning (8:00 AM)
                </Label>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Upgrade for custom times 🔒
              </p>
            </div>
          </div>
        </section>

        {/* Save Buttons */}
        <div className="space-y-3 pt-4">
          <Button onClick={handleSave} className="w-full" size="lg">
            Save Compound
          </Button>
          <Button onClick={handleSave} variant="secondary" className="w-full" size="lg">
            Save & Add Another
          </Button>
        </div>
      </div>
    </div>
  );
};
