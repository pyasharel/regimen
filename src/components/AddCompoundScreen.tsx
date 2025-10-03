import { useNavigate } from "react-router-dom";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const COMMON_PEPTIDES = [
  "BPC-157", "TB-500", "Semaglutide", "Tirzepatide", "Retatrutide",
  "CJC-1295", "Ipamorelin", "NAD+", "Epitalon", "Thymosin Beta-4",
  "GHK-Cu", "Melanotan II", "PT-141", "DSIP", "Selank", "Semax"
];

export const AddCompoundScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  // Basic info
  const [name, setName] = useState("");
  const [showAutocomplete, setShowAutocomplete] = useState(false);

  // Dose calculator (optional)
  const [showCalculator, setShowCalculator] = useState(false);
  const [vialSize, setVialSize] = useState("");
  const [vialUnit, setVialUnit] = useState("mg");
  const [bacWater, setBacWater] = useState("");
  const [intendedDose, setIntendedDose] = useState("");
  const [doseUnit, setDoseUnit] = useState("mcg");

  // Schedule
  const [frequency, setFrequency] = useState("Daily");
  const [timeOfDay, setTimeOfDay] = useState("Morning");
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  // Calculate IU
  const calculateIU = () => {
    if (!vialSize || !bacWater || !intendedDose) return null;

    const vialMcg = vialUnit === 'mg' ? parseFloat(vialSize) * 1000 : parseFloat(vialSize);
    const doseMcg = doseUnit === 'mg' ? parseFloat(intendedDose) * 1000 : parseFloat(intendedDose);
    const concentration = vialMcg / parseFloat(bacWater);
    const volumeML = doseMcg / concentration;
    return (volumeML * 100).toFixed(1);
  };

  const calculatedIU = showCalculator ? calculateIU() : null;

  const getWarning = () => {
    if (!calculatedIU) return null;
    const iu = parseFloat(calculatedIU);
    if (iu < 2) return "⚠️ Very small dose - consider using less BAC water";
    if (iu > 100) return "⚠️ Exceeds syringe capacity";
    if (iu > 50) return "⚠️ Large dose - please double-check";
    return null;
  };

  const filteredPeptides = COMMON_PEPTIDES.filter(p =>
    p.toLowerCase().includes(name.toLowerCase())
  );

  const handleSave = async () => {
    if (!name || !intendedDose) {
      toast({
        title: "Missing fields",
        description: "Please enter compound name and dose",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      // Insert compound
      const { data: compound, error: compoundError } = await supabase
        .from('compounds')
        .insert({
          name,
          vial_size: vialSize ? parseFloat(vialSize) : null,
          vial_unit: vialUnit,
          bac_water_volume: bacWater ? parseFloat(bacWater) : null,
          intended_dose: parseFloat(intendedDose),
          dose_unit: doseUnit,
          calculated_iu: calculatedIU ? parseFloat(calculatedIU) : null,
          schedule_type: frequency,
          time_of_day: [timeOfDay],
          start_date: startDate
        })
        .select()
        .single();

      if (compoundError) throw compoundError;

      // Generate doses for next 30 days
      const doses = [];
      const start = new Date(startDate);
      for (let i = 0; i < 30; i++) {
        const date = new Date(start);
        date.setDate(date.getDate() + i);
        
        // Check if should generate based on frequency
        if (frequency === 'Weekdays' && (date.getDay() === 0 || date.getDay() === 6)) {
          continue;
        }

        doses.push({
          compound_id: compound.id,
          scheduled_date: date.toISOString().split('T')[0],
          scheduled_time: timeOfDay,
          dose_amount: parseFloat(intendedDose),
          dose_unit: doseUnit,
          calculated_iu: calculatedIU ? parseFloat(calculatedIU) : null
        });
      }

      const { error: dosesError } = await supabase
        .from('doses')
        .insert(doses);

      if (dosesError) throw dosesError;

      toast({
        title: "Compound added!",
        description: `${name} has been added to your stack`
      });

      navigate('/today');
    } catch (error) {
      console.error('Error saving compound:', error);
      toast({
        title: "Error",
        description: "Failed to save compound",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20">
      {/* Header */}
      <header className="border-b border-border px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="rounded-lg p-2 hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold">Add Compound</h1>
        </div>
      </header>

      <div className="flex-1 space-y-6 p-4">
        {/* Basic Info */}
        <div className="space-y-4">
          <div className="space-y-2 relative">
            <Label htmlFor="name">Compound Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setShowAutocomplete(e.target.value.length > 0);
              }}
              onFocus={() => setShowAutocomplete(name.length > 0)}
              placeholder="e.g., BPC-157"
            />
            {showAutocomplete && filteredPeptides.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filteredPeptides.map((peptide) => (
                  <button
                    key={peptide}
                    onClick={() => {
                      setName(peptide);
                      setShowAutocomplete(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-muted transition-colors"
                  >
                    {peptide}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="intendedDose">Intended Dose *</Label>
            <div className="flex gap-2">
              <Input
                id="intendedDose"
                type="number"
                value={intendedDose}
                onChange={(e) => setIntendedDose(e.target.value)}
                placeholder="250"
                className="flex-1"
              />
              <select
                value={doseUnit}
                onChange={(e) => setDoseUnit(e.target.value)}
                className="bg-surface border-border rounded-lg border px-3 text-sm min-w-[80px]"
              >
                <option value="mcg">mcg</option>
                <option value="mg">mg</option>
              </select>
            </div>
          </div>

          {/* Optional Dose Calculator */}
          <button
            onClick={() => setShowCalculator(!showCalculator)}
            className="text-sm text-primary hover:underline"
          >
            {showCalculator ? '- Hide' : '+ Show'} Dose Calculator
          </button>

          {showCalculator && (
            <div className="space-y-4 p-4 bg-surface rounded-lg">
              <div className="space-y-2">
                <Label>Vial Size</Label>
                <div className="flex gap-2">
                  {[5, 10, 15, 20].map((size) => (
                    <button
                      key={size}
                      onClick={() => setVialSize(size.toString())}
                      className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                        vialSize === size.toString()
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-card border border-border hover:bg-muted'
                      }`}
                    >
                      {size}mg
                    </button>
                  ))}
                </div>
                <Input
                  type="number"
                  value={vialSize}
                  onChange={(e) => setVialSize(e.target.value)}
                  placeholder="Custom"
                />
              </div>

              <div className="space-y-2">
                <Label>BAC Water Volume</Label>
                <div className="flex gap-2">
                  {[1, 2, 3, 5].map((vol) => (
                    <button
                      key={vol}
                      onClick={() => setBacWater(vol.toString())}
                      className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                        bacWater === vol.toString()
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-card border border-border hover:bg-muted'
                      }`}
                    >
                      {vol}ml
                    </button>
                  ))}
                </div>
                <Input
                  type="number"
                  value={bacWater}
                  onChange={(e) => setBacWater(e.target.value)}
                  placeholder="Custom"
                />
              </div>

              {calculatedIU && (
                <div className="bg-card border-2 border-secondary rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-primary">{calculatedIU} IU</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    on a 100 IU insulin syringe
                  </div>
                  {getWarning() && (
                    <div className="flex items-center gap-2 mt-3 text-sm text-warning">
                      <AlertCircle className="h-4 w-4" />
                      <span>{getWarning()}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Schedule */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold">Schedule</h2>

          <div className="space-y-2">
            <Label>Frequency</Label>
            <div className="space-y-2">
              {['Daily', 'Weekdays', 'As Needed'].map((freq) => (
                <label key={freq} className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="frequency"
                    checked={frequency === freq}
                    onChange={() => setFrequency(freq)}
                    className="h-4 w-4"
                  />
                  <span>{freq}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Time of Day</Label>
            <div className="flex gap-2">
              <button
                onClick={() => setTimeOfDay('Morning')}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                  timeOfDay === 'Morning'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card border border-border hover:bg-muted'
                }`}
              >
                Morning
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Upgrade for custom times 🔒
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full"
          size="lg"
        >
          {saving ? 'Saving...' : 'Save Compound'}
        </Button>
      </div>
    </div>
  );
};
