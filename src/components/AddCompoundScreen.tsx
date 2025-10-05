import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const COMMON_PEPTIDES = [
  "BPC-157", "TB-500", "Semaglutide", "Tirzepatide", "Retatrutide",
  "CJC-1295", "Ipamorelin", "NAD+", "Epitalon", "Thymosin Beta-4",
  "GHK-Cu", "Melanotan II", "PT-141", "DSIP", "Selank", "Semax"
];

export const AddCompoundScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  
  // Check if we're editing an existing compound
  const editingCompound = location.state?.editingCompound;
  const isEditing = !!editingCompound;

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
  const [numberOfDoses, setNumberOfDoses] = useState(1);
  const [timeOfDay, setTimeOfDay] = useState("Morning");
  const [timeOfDay2, setTimeOfDay2] = useState("Evening");
  const [customTime, setCustomTime] = useState("09:00");
  const [customTime2, setCustomTime2] = useState("18:00");
  const [biweeklyDays, setBiweeklyDays] = useState<number[]>([]);
  const [everyXDays, setEveryXDays] = useState(3);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [enableReminder, setEnableReminder] = useState(false);
  
  // Premium feature (for demo purposes, set to false for free users)
  const isPremium = false;

  // Load existing compound data if editing
  useEffect(() => {
    if (editingCompound) {
      setName(editingCompound.name);
      setIntendedDose(editingCompound.intended_dose.toString());
      setDoseUnit(editingCompound.dose_unit);
      setFrequency(editingCompound.schedule_type);
      setNumberOfDoses(editingCompound.time_of_day?.length || 1);
      setTimeOfDay(editingCompound.time_of_day[0] || "Morning");
      if (editingCompound.time_of_day[1]) setTimeOfDay2(editingCompound.time_of_day[1]);
      if (editingCompound.schedule_days) setBiweeklyDays(editingCompound.schedule_days);
      setStartDate(editingCompound.start_date);
      if (editingCompound.vial_size) {
        setShowCalculator(true);
        setVialSize(editingCompound.vial_size.toString());
        setVialUnit(editingCompound.vial_unit || "mg");
        setBacWater(editingCompound.bac_water_volume?.toString() || "");
      }
    }
  }, []);

  // Calculate IU and auto-populate dose
  const calculateIU = () => {
    if (!vialSize || !bacWater) return null;

    const vialMcg = vialUnit === 'mg' ? parseFloat(vialSize) * 1000 : parseFloat(vialSize);
    const doseMcg = intendedDose ? (doseUnit === 'mg' ? parseFloat(intendedDose) * 1000 : parseFloat(intendedDose)) : 0;
    const concentration = vialMcg / parseFloat(bacWater);
    const volumeML = doseMcg / concentration;
    return volumeML > 0 ? (volumeML * 100).toFixed(1) : null;
  };

  const calculatedIU = showCalculator ? calculateIU() : null;

  // Auto-populate dose when calculator values change
  useEffect(() => {
    if (showCalculator && vialSize && bacWater && !intendedDose) {
      // Auto-suggest a reasonable dose (e.g., 250mcg)
      setIntendedDose("250");
      setDoseUnit("mcg");
    }
  }, [vialSize, bacWater, showCalculator]);

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

  const generateDoses = (compoundId: string) => {
    const doses = [];
    const start = new Date(startDate);
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      const dayOfWeek = date.getDay();
      
      // Check if should generate based on frequency
      if (frequency === 'Weekdays' && (dayOfWeek === 0 || dayOfWeek === 6)) {
        continue;
      }
      
      if (frequency === 'Bi-weekly' && !biweeklyDays.includes(dayOfWeek)) {
        continue;
      }
      
      if (frequency === 'Every X Days' && i % everyXDays !== 0) {
        continue;
      }

      // Generate dose(s) for this date
      const timesToAdd = numberOfDoses === 2 ? [timeOfDay, timeOfDay2] : [timeOfDay];
      timesToAdd.forEach(time => {
        doses.push({
          compound_id: compoundId,
          scheduled_date: date.toISOString().split('T')[0],
          scheduled_time: time,
          dose_amount: parseFloat(intendedDose),
          dose_unit: doseUnit,
          calculated_iu: calculatedIU ? parseFloat(calculatedIU) : null
        });
      });
    }
    
    return doses;
  };

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
      if (isEditing) {
        // Update existing compound
        const { error: updateError } = await supabase
          .from('compounds')
          .update({
            name,
            vial_size: vialSize ? parseFloat(vialSize) : null,
            vial_unit: vialUnit,
            bac_water_volume: bacWater ? parseFloat(bacWater) : null,
            intended_dose: parseFloat(intendedDose),
            dose_unit: doseUnit,
            calculated_iu: calculatedIU ? parseFloat(calculatedIU) : null,
            schedule_type: frequency,
            time_of_day: numberOfDoses === 2 ? [timeOfDay, timeOfDay2] : [timeOfDay],
            schedule_days: frequency === 'Bi-weekly' ? biweeklyDays.map(String) : null,
            start_date: startDate
          })
          .eq('id', editingCompound.id);

        if (updateError) throw updateError;

        // Delete existing future doses and regenerate
        const { error: deleteError } = await supabase
          .from('doses')
          .delete()
          .eq('compound_id', editingCompound.id)
          .gte('scheduled_date', new Date().toISOString().split('T')[0]);

        if (deleteError) throw deleteError;

        // Generate new doses for next 30 days
        const doses = generateDoses(editingCompound.id);
        const { error: dosesUpdateError } = await supabase
          .from('doses')
          .insert(doses);

        if (dosesUpdateError) throw dosesUpdateError;

        toast({
          title: "Compound updated!",
          description: `${name} has been updated`
        });
      } else {
        // Insert new compound
        const { data: compound, error: compoundError } = await supabase
          .from('compounds')
          .insert([{
            name,
            vial_size: vialSize ? parseFloat(vialSize) : null,
            vial_unit: vialUnit,
            bac_water_volume: bacWater ? parseFloat(bacWater) : null,
            intended_dose: parseFloat(intendedDose),
            dose_unit: doseUnit,
            calculated_iu: calculatedIU ? parseFloat(calculatedIU) : null,
            schedule_type: frequency,
            time_of_day: numberOfDoses === 2 ? [timeOfDay, timeOfDay2] : [timeOfDay],
            schedule_days: frequency === 'Bi-weekly' ? biweeklyDays.map(String) : null,
            start_date: startDate
          }])
          .select()
          .single();

        if (compoundError) throw compoundError;

        // Generate doses for next 30 days
        const doses = generateDoses(compound.id);
        const { error: dosesError } = await supabase
          .from('doses')
          .insert(doses);

        if (dosesError) throw dosesError;

        toast({
          title: "Compound added!",
          description: `${name} has been added to your stack`
        });
      }

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
          <h1 className="text-xl font-bold">{isEditing ? 'Edit Compound' : 'Add Compound'}</h1>
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

          <div className="space-y-2">
            <Label htmlFor="intendedDose">Dosage *</Label>
            <div className="flex gap-2">
              <Input
                id="intendedDose"
                type="number"
                value={intendedDose}
                onChange={(e) => setIntendedDose(e.target.value)}
                placeholder=""
                className="flex-1"
              />
              <div className="flex gap-1 bg-surface rounded-lg border border-border p-1">
                <button
                  onClick={() => setDoseUnit('mcg')}
                  className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                    doseUnit === 'mcg'
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                >
                  mcg
                </button>
                <button
                  onClick={() => setDoseUnit('mg')}
                  className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                    doseUnit === 'mg'
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                >
                  mg
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Schedule */}
        <div className="space-y-4 bg-surface rounded-lg p-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Schedule</h2>

          <div className="space-y-2">
            <Label>Frequency</Label>
            <select
              value={frequency}
              onChange={(e) => {
                setFrequency(e.target.value);
                if (e.target.value === 'Bi-weekly') setBiweeklyDays([]);
              }}
              className="w-full bg-background border-border rounded-lg border px-3 py-2 text-sm"
            >
              <option value="Daily">Daily</option>
              <option value="Bi-weekly">Bi-weekly</option>
              <option value="Weekdays">Weekdays</option>
              <option value="Every X Days">Every X Days</option>
              <option value="As Needed">As Needed</option>
            </select>
          </div>

          {frequency === 'Bi-weekly' && (
            <div className="space-y-2">
              <Label>Select Days (2 days)</Label>
              <div className="grid grid-cols-7 gap-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      if (biweeklyDays.includes(idx)) {
                        setBiweeklyDays(biweeklyDays.filter(d => d !== idx));
                      } else if (biweeklyDays.length < 2) {
                        setBiweeklyDays([...biweeklyDays, idx]);
                      }
                    }}
                    className={`p-2 rounded-lg text-sm font-medium transition-colors ${
                      biweeklyDays.includes(idx)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card border border-border hover:bg-muted'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          )}

          {frequency === 'Every X Days' && (
            <div className="space-y-2">
              <Label>Every</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  value={everyXDays}
                  onChange={(e) => setEveryXDays(parseInt(e.target.value) || 1)}
                  className="w-20"
                />
                <span className="text-sm">days</span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Number of Doses</Label>
            <div className="flex gap-2">
              <button
                onClick={() => setNumberOfDoses(1)}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                  numberOfDoses === 1
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card border border-border hover:bg-muted'
                }`}
              >
                1
              </button>
              <button
                onClick={() => setNumberOfDoses(2)}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                  numberOfDoses === 2
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card border border-border hover:bg-muted'
                }`}
              >
                2
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{numberOfDoses === 2 ? 'First Dose Time' : 'Time'}</Label>
            {isPremium ? (
              <Input
                type="time"
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
                className="w-full"
              />
            ) : (
              <div className="space-y-2">
                <select
                  value={timeOfDay}
                  onChange={(e) => setTimeOfDay(e.target.value)}
                  className="w-full bg-background border-border rounded-lg border px-3 py-2 text-sm"
                >
                  <option value="Morning">Morning</option>
                  <option value="Afternoon">Afternoon</option>
                  <option value="Evening">Evening</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  Upgrade for custom times 🔒
                </p>
              </div>
            )}
          </div>

          {numberOfDoses === 2 && (
            <div className="space-y-2">
              <Label>Second Dose Time</Label>
              {isPremium ? (
                <Input
                  type="time"
                  value={customTime2}
                  onChange={(e) => setCustomTime2(e.target.value)}
                  className="w-full"
                />
              ) : (
                <select
                  value={timeOfDay2}
                  onChange={(e) => setTimeOfDay2(e.target.value)}
                  className="w-full bg-background border-border rounded-lg border px-3 py-2 text-sm"
                >
                  <option value="Morning">Morning</option>
                  <option value="Afternoon">Afternoon</option>
                  <option value="Evening">Evening</option>
                </select>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          {/* Premium Reminder Toggle */}
          {!isPremium && (
            <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-border opacity-60">
              <div className="flex items-center gap-2">
                <Label htmlFor="reminder" className="mb-0">Set Reminder</Label>
                <span className="text-xs text-muted-foreground">🔒 Premium</span>
              </div>
              <div className="w-11 h-6 bg-muted rounded-full"></div>
            </div>
          )}

          {isPremium && (
            <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
              <Label htmlFor="reminder" className="mb-0">Set Reminder</Label>
              <input
                id="reminder"
                type="checkbox"
                checked={enableReminder}
                onChange={(e) => setEnableReminder(e.target.checked)}
                className="w-11 h-6"
              />
            </div>
          )}

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
          {saving ? 'Saving...' : isEditing ? 'Update Compound' : 'Save Compound'}
        </Button>
      </div>
    </div>
  );
};
