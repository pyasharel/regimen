import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, AlertCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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

  // Dosage
  const [intendedDose, setIntendedDose] = useState("");
  const [doseUnit, setDoseUnit] = useState("mcg");

  // IU calculator (optional)
  const [showCalculator, setShowCalculator] = useState(false);
  const [vialSize, setVialSize] = useState("3");
  const [vialUnit, setVialUnit] = useState("mg");
  const [bacWater, setBacWater] = useState("2");

  // Schedule
  const [frequency, setFrequency] = useState("Daily");
  const [customDays, setCustomDays] = useState<number[]>([]);
  const [everyXDays, setEveryXDays] = useState(3);
  const [timeOfDay, setTimeOfDay] = useState("Morning");
  const [customTime, setCustomTime] = useState("09:00");
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [enableReminder, setEnableReminder] = useState(true);

  // Cycle (premium)
  const [enableCycle, setEnableCycle] = useState(false);
  const [cycleMode, setCycleMode] = useState<'continuous' | 'one-time'>('continuous');
  const [cycleWeeksOn, setCycleWeeksOn] = useState(4);
  const [cycleWeeksOff, setCycleWeeksOff] = useState(2);

  // Titration (premium) - array of steps
  const [enableTitration, setEnableTitration] = useState(false);
  const [titrationSteps, setTitrationSteps] = useState<Array<{
    weeks: number;
    targetDose: string;
  }>>([{ weeks: 4, targetDose: "" }]);

  // Active status
  const [isActive, setIsActive] = useState(true);
  
  // Premium feature (for testing, toggle this)
  const [isPremium, setIsPremium] = useState(false);

  // Auto-populate titration starting dose from main dosage
  useEffect(() => {
    if (enableTitration && intendedDose && titrationSteps[0].targetDose === "") {
      // Starting dose defaults to current dosage
      // First step is where they want to go
    }
  }, [enableTitration, intendedDose]);

  // Load existing compound data if editing
  useEffect(() => {
    if (editingCompound) {
      setName(editingCompound.name);
      setIntendedDose(editingCompound.intended_dose.toString());
      setDoseUnit(editingCompound.dose_unit);
      setFrequency(editingCompound.schedule_type);
      setTimeOfDay(editingCompound.time_of_day?.[0] || "Morning");
      if (editingCompound.schedule_type === 'Specific day(s)' || editingCompound.schedule_type === 'Specific day of the week') {
        setCustomDays(editingCompound.schedule_days?.map(Number) || []);
      }
      setStartDate(editingCompound.start_date);
      setIsActive(editingCompound.is_active ?? true);
      
      if (editingCompound.has_cycles) {
        setEnableCycle(true);
        setCycleWeeksOn(editingCompound.cycle_weeks_on || 4);
        if (editingCompound.cycle_weeks_off) {
          setCycleMode('continuous');
          setCycleWeeksOff(editingCompound.cycle_weeks_off);
        } else {
          setCycleMode('one-time');
        }
      }
      
      if (editingCompound.has_titration && editingCompound.titration_config) {
        setEnableTitration(true);
        const config = editingCompound.titration_config as any;
        if (config.steps && Array.isArray(config.steps)) {
          setTitrationSteps(config.steps);
        }
      }
      
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

  // Auto-populate dose when calculator values change - but preserve unit choice
  useEffect(() => {
    if (showCalculator && vialSize && bacWater && calculatedIU) {
      const vialMcg = vialUnit === 'mg' ? parseFloat(vialSize) * 1000 : parseFloat(vialSize);
      const concentration = vialMcg / parseFloat(bacWater);
      const iu = parseFloat(calculatedIU);
      const doseMcg = (iu / 100) * concentration;
      
      // Preserve the user's selected unit
      if (doseUnit === 'mg') {
        setIntendedDose((doseMcg / 1000).toFixed(2));
      } else {
        setIntendedDose(doseMcg.toFixed(0));
      }
    }
  }, [calculatedIU, vialSize, bacWater, vialUnit]);

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

  const generateDoses = (compoundId: string, userId: string) => {
    const doses = [];
    const start = new Date(startDate);
    
    console.log('generateDoses called with:', {
      startDate,
      frequency,
      customDays,
      startDateObj: start,
      startDayOfWeek: start.getDay()
    });
    
    // Don't generate doses for "As Needed"
    if (frequency === 'As Needed') {
      return doses;
    }
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      const dayOfWeek = date.getDay();
      
      // Check if should generate based on frequency
      if (frequency === 'Specific day(s)') {
        // customDays contains numbers, dayOfWeek is a number
        console.log(`Day ${i}: ${date.toISOString().split('T')[0]} (day ${dayOfWeek}) - checking against customDays:`, customDays, 'includes?', customDays.includes(dayOfWeek));
        if (!customDays.includes(dayOfWeek)) {
          continue;
        }
        console.log(`✓ Creating dose for ${date.toISOString().split('T')[0]}`);
      }
      
      if (frequency === 'Every X Days' && i % everyXDays !== 0) {
        continue;
      }

      // Calculate dose based on titration
      let currentDose = parseFloat(intendedDose);
      if (enableTitration && titrationSteps.length > 0) {
        const weekNumber = Math.floor(i / 7);
        let startDose = parseFloat(intendedDose);
        let cumulativeWeeks = 0;
        
        for (const step of titrationSteps) {
          if (weekNumber < cumulativeWeeks + step.weeks) {
            // We're in this step
            const targetDose = parseFloat(step.targetDose);
            const weeksIntoStep = weekNumber - cumulativeWeeks;
            currentDose = startDose + ((targetDose - startDose) / step.weeks) * weeksIntoStep;
            break;
          } else {
            // Move to next step
            cumulativeWeeks += step.weeks;
            startDose = parseFloat(step.targetDose);
            currentDose = startDose;
          }
        }
      }

      doses.push({
        compound_id: compoundId,
        user_id: userId,
        scheduled_date: date.toISOString().split('T')[0],
        scheduled_time: isPremium ? customTime : timeOfDay,
        dose_amount: currentDose,
        dose_unit: doseUnit,
        calculated_iu: calculatedIU ? parseFloat(calculatedIU) : null
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

    // Debug logging
    console.log('Saving compound with schedule:', {
      frequency,
      customDays,
      schedule_days: frequency === 'Specific day(s)' ? customDays : null
    });

    setSaving(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

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
            time_of_day: [isPremium ? customTime : timeOfDay],
            schedule_days: frequency === 'Specific day(s)' ? customDays.map(String) : null,
            start_date: startDate,
            has_cycles: enableCycle,
            cycle_weeks_on: enableCycle ? cycleWeeksOn : null,
            cycle_weeks_off: enableCycle && cycleMode === 'continuous' ? cycleWeeksOff : null,
            has_titration: enableTitration,
            titration_config: enableTitration ? {
              starting_dose: parseFloat(intendedDose),
              steps: titrationSteps.map(step => ({
                weeks: step.weeks,
                targetDose: parseFloat(step.targetDose)
              }))
            } : null,
            is_active: isActive
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
        const doses = generateDoses(editingCompound.id, user.id);
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
            user_id: user.id,
            name,
            vial_size: vialSize ? parseFloat(vialSize) : null,
            vial_unit: vialUnit,
            bac_water_volume: bacWater ? parseFloat(bacWater) : null,
            intended_dose: parseFloat(intendedDose),
            dose_unit: doseUnit,
            calculated_iu: calculatedIU ? parseFloat(calculatedIU) : null,
          schedule_type: frequency,
          time_of_day: [isPremium ? customTime : timeOfDay],
          schedule_days: frequency === 'Specific day(s)' ? customDays.map(String) : null,
            start_date: startDate,
            has_cycles: enableCycle,
            cycle_weeks_on: enableCycle ? cycleWeeksOn : null,
            cycle_weeks_off: enableCycle && cycleMode === 'continuous' ? cycleWeeksOff : null,
            has_titration: enableTitration,
            titration_config: enableTitration ? {
              starting_dose: parseFloat(intendedDose),
              steps: titrationSteps.map(step => ({
                weeks: step.weeks,
                targetDose: parseFloat(step.targetDose)
              }))
            } : null,
            is_active: isActive
          }])
          .select()
          .single();

        if (compoundError) throw compoundError;

        // Generate doses for next 30 days
        const doses = generateDoses(compound.id, user.id);
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

          <div className="space-y-2">
            <Label htmlFor="intendedDose">Dosage *</Label>
            <div className="flex gap-2">
              <Input
                id="intendedDose"
                type="number"
                value={intendedDose}
                onChange={(e) => setIntendedDose(e.target.value)}
                placeholder="Enter dose"
                className="flex-1"
              />
              <div className="flex gap-1 bg-surface rounded-lg border border-border p-1">
                <button
                  onClick={() => {
                    if (doseUnit === 'mg' && intendedDose) {
                      // Converting from mg to mcg - don't modify value
                      setDoseUnit('mcg');
                    } else if (doseUnit === 'mcg' && intendedDose) {
                      // Converting from mcg to mg - don't modify value
                      setDoseUnit('mg');
                    } else {
                      setDoseUnit('mcg');
                    }
                  }}
                  className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                    doseUnit === 'mcg'
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                >
                  mcg
                </button>
                <button
                  onClick={() => {
                    if (doseUnit === 'mcg' && intendedDose) {
                      // Converting from mcg to mg - don't modify value
                      setDoseUnit('mg');
                    } else if (doseUnit === 'mg' && intendedDose) {
                      // Converting from mg to mcg - don't modify value
                      setDoseUnit('mcg');
                    } else {
                      setDoseUnit('mg');
                    }
                  }}
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

          {/* IU Calculator */}
          <button
            onClick={() => setShowCalculator(!showCalculator)}
            className="text-sm text-primary hover:underline"
          >
            {showCalculator ? '- Hide' : '+ Show'} IU Calculator
          </button>

          {showCalculator && (
            <div className="space-y-4 p-4 bg-surface rounded-lg">
              <div className="space-y-2">
                <Label>Peptide Amount</Label>
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
                  <div className="text-3xl font-bold text-primary">{calculatedIU} units</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    on a 100 unit insulin syringe
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
        <div className="space-y-4 bg-surface rounded-lg p-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Schedule</h2>

          <div className="space-y-2">
            <Label>Frequency</Label>
            <select
              value={frequency}
              onChange={(e) => {
                setFrequency(e.target.value);
                if (e.target.value === 'Specific day(s)') setCustomDays([]);
              }}
              className="w-full bg-background border-border rounded-lg border px-3 py-2 text-sm"
            >
              <option value="Daily">Daily</option>
              <option value="Specific day(s)">Specific day(s)</option>
              <option value="Every X Days">Every X Days</option>
              <option value="As Needed">As Needed</option>
            </select>
          </div>

          {frequency === 'Specific day(s)' && (
            <div className="space-y-2">
              <Label>Select Days</Label>
              <div className="grid grid-cols-7 gap-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      if (customDays.includes(idx)) {
                        setCustomDays(customDays.filter(d => d !== idx));
                      } else {
                        setCustomDays([...customDays, idx]);
                      }
                    }}
                    className={`p-2 rounded-lg text-sm font-medium transition-colors ${
                      customDays.includes(idx)
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

          {frequency !== 'As Needed' && (
            <div className="space-y-2">
              <Label>Time</Label>
              {isPremium ? (
                <Input
                  type="time"
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  className="w-full"
                />
               ) : (
                <select
                  value={timeOfDay}
                  onChange={(e) => setTimeOfDay(e.target.value)}
                  className="w-full bg-background border-border rounded-lg border px-3 py-2 text-sm"
                >
                  <option value="Morning">Morning</option>
                  <option value="Evening">Evening</option>
                </select>
              )}
              {!isPremium && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Sparkles className="h-3 w-3" />
                  <span>Upgrade for custom times</span>
                </div>
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

          {/* Reminder Toggle */}
          <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
            <Label htmlFor="reminder" className="mb-0">Set Reminder</Label>
            <Switch
              id="reminder"
              checked={enableReminder}
              onCheckedChange={setEnableReminder}
            />
          </div>
        </div>

        {/* Cycle (Premium) */}
        <div className="space-y-4 bg-surface rounded-lg p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Cycle</h2>
            {!isPremium && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Sparkles className="h-3 w-3" />
                <span>Premium</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
            <Label htmlFor="cycle" className="mb-0">Enable Cycle</Label>
            <Switch
              id="cycle"
              checked={enableCycle}
              onCheckedChange={(checked) => !isPremium || setEnableCycle(checked)}
              disabled={!isPremium}
            />
          </div>

          {enableCycle && isPremium && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setCycleMode('continuous')}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                    cycleMode === 'continuous'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card border border-border hover:bg-muted'
                  }`}
                >
                  Continuous Cycle
                </button>
                <button
                  onClick={() => setCycleMode('one-time')}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                    cycleMode === 'one-time'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card border border-border hover:bg-muted'
                  }`}
                >
                  One-Time Duration
                </button>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  value={cycleWeeksOn}
                  onChange={(e) => setCycleWeeksOn(parseInt(e.target.value) || 1)}
                  className="w-20"
                />
                <span className="text-sm">weeks on</span>
              </div>

              {cycleMode === 'continuous' && (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="1"
                    value={cycleWeeksOff}
                    onChange={(e) => setCycleWeeksOff(parseInt(e.target.value) || 1)}
                    className="w-20"
                  />
                  <span className="text-sm">weeks off</span>
                </div>
              )}

              {cycleMode === 'one-time' && (
                <p className="text-xs text-muted-foreground p-3 bg-muted/50 rounded-lg">
                  After {cycleWeeksOn} week{cycleWeeksOn !== 1 ? 's' : ''}, this compound will automatically become inactive. You can reactivate it manually from My Stack.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Titration (Premium) */}
        <div className="space-y-4 bg-surface rounded-lg p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Titration</h2>
            {!isPremium && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Sparkles className="h-3 w-3" />
                <span>Premium</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
            <Label htmlFor="titration" className="mb-0">Enable Titration</Label>
            <Switch
              id="titration"
              checked={enableTitration}
              onCheckedChange={(checked) => !isPremium || setEnableTitration(checked)}
              disabled={!isPremium}
            />
          </div>

          {enableTitration && isPremium && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  Starting dose: <span className="font-semibold text-foreground">{intendedDose || '0'} {doseUnit}</span>
                </p>
              </div>

              {titrationSteps.map((step, index) => (
                <div key={index} className="space-y-3 p-3 bg-background rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">Step {index + 1}</Label>
                    {titrationSteps.length > 1 && (
                      <button
                        onClick={() => setTitrationSteps(titrationSteps.filter((_, i) => i !== index))}
                        className="text-xs text-destructive hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Titration Period</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        value={step.weeks}
                        onChange={(e) => {
                          const newSteps = [...titrationSteps];
                          newSteps[index].weeks = parseInt(e.target.value) || 1;
                          setTitrationSteps(newSteps);
                        }}
                        className="w-20"
                      />
                      <span className="text-sm">weeks</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Target Dose</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        value={step.targetDose}
                        onChange={(e) => {
                          const newSteps = [...titrationSteps];
                          newSteps[index].targetDose = e.target.value;
                          setTitrationSteps(newSteps);
                        }}
                        placeholder="e.g., 4"
                        className="flex-1"
                      />
                      <span className="flex items-center text-sm text-muted-foreground">{doseUnit}</span>
                    </div>
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={() => setTitrationSteps([...titrationSteps, { weeks: 4, targetDose: "" }])}
                className="w-full"
              >
                + Add Another Step
              </Button>
            </div>
          )}
        </div>

        {/* Active Protocol */}
        <div className="flex items-center justify-between p-4 bg-surface rounded-lg">
          <Label htmlFor="active" className="mb-0 text-base">Active Protocol</Label>
          <Switch
            id="active"
            checked={isActive}
            onCheckedChange={setIsActive}
          />
        </div>

        {/* Premium Testing Toggle (Dev Only) */}
        <div className="p-4 bg-warning/10 border border-warning rounded-lg">
          <div className="flex items-center justify-between">
            <Label htmlFor="premium-test" className="mb-0 text-sm">Premium Mode (Testing)</Label>
            <Switch
              id="premium-test"
              checked={isPremium}
              onCheckedChange={setIsPremium}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Toggle to test premium features</p>
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
