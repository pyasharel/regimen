import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, AlertCircle, Crown, Calendar as CalendarIcon } from "lucide-react";
import { PremiumModal } from "@/components/PremiumModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const COMMON_PEPTIDES = [
  // Peptides
  "AOD-9604",
  "BPC-157", "BPC-157 + KPV Blend", "Bremelanotide",
  "CagriSema", "CJC-1295 with DAC", "CJC-1295 without DAC", "Cerebrolysin",
  "DSIP", "Dihexa", "Dulaglutide",
  "Epithalon",
  "Follistatin", "FTPP (Adipotide)",
  "GHK-Cu", "GHRP-2", "GHRP-6", "GLOW", "Gonadorelin", "GRF (1-29)",
  "HCG", "Hexarelin", "HMG",
  "Ibutamoren (MK-677)", "IGF-1 DES", "IGF-1 LR3", "Ipamorelin", 
  "Ipamorelin + CJC-1295 Blend", "Ipamorelin + Sermorelin Blend",
  "Kisspeptin", "KLOW", "KPV",
  "Larazotide", "Liraglutide", "LL-37",
  "Melanotan I", "Melanotan II", "MGF", "MOD-GRF (1-29)", "Mounjaro", "MOTS-c",
  "NA-Selank", "NA-Semax",
  "Ozempic",
  "P21", "PEG-MGF", "Pinealon", "PT-141",
  "Retatrutide",
  "Saxenda", "Selank", "Semaglutide", "Semax", "Sermorelin", "SLUPP",
  "TB-500", "TB4-FRAG", "Tesamorelin", "Tesofensine",
  "Thymosin Alpha-1", "Thymosin Beta-4", "Thymulin", "Tirzepatide", "Trulicity",
  // Bioregulators
  "Cortagen", "Pinealon", "Thymulin",
  // Testosterone variants
  "Testosterone Cypionate", "Testosterone Enanthate", "Testosterone Propionate",
  // Other steroids
  "Nandrolone", "Oxandrolone",
  // Blends and stacks
  "Wolverine Stack",
  // GLP-1s
  "Victoza", "Wegovy", "Zepbound"
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
  // Set start date to today in local timezone
  const today = new Date();
  const localDateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const [startDate, setStartDate] = useState(localDateString);
  const [endDate, setEndDate] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [enableReminder, setEnableReminder] = useState(true);

  // Cycle (premium)
  const [enableCycle, setEnableCycle] = useState(false);
  const [cycleMode, setCycleMode] = useState<'continuous' | 'one-time'>('continuous');
  const [cycleWeeksOn, setCycleWeeksOn] = useState(4);
  const [cycleWeeksOff, setCycleWeeksOff] = useState(2);

  // Active status
  const [isActive, setIsActive] = useState(true);
  
  // Premium feature - check from Settings
  const [isPremium, setIsPremium] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  // Check premium status from localStorage (set in Settings)
  useEffect(() => {
    const checkPremium = () => {
      const premiumStatus = localStorage.getItem('testPremiumMode') === 'true';
      setIsPremium(premiumStatus);
    };
    
    checkPremium();
    // Listen for changes to premium status
    window.addEventListener('storage', checkPremium);
    return () => window.removeEventListener('storage', checkPremium);
  }, []);

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
      setEndDate(editingCompound.end_date || "");
      setNotes(editingCompound.notes || "");
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

  // Helper to format date without timezone issues
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const generateDoses = (compoundId: string, userId: string) => {
    const doses = [];
    // Parse date in local timezone
    const [year, month, day] = startDate.split('-').map(Number);
    const start = new Date(year, month - 1, day);
    
    // Don't generate doses for "As Needed"
    if (frequency === 'As Needed') {
      return doses;
    }
    
    // Calculate end boundary (60 days or user-specified end date, whichever is sooner)
    const maxDays = 60;
    let daysToGenerate = maxDays;
    
    if (endDate) {
      const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
      const end = new Date(endYear, endMonth - 1, endDay);
      const daysDiff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      daysToGenerate = Math.min(maxDays, Math.max(0, daysDiff + 1));
    }
    
    for (let i = 0; i < daysToGenerate; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      const dayOfWeek = date.getDay(); // 0=Sunday, 1=Monday, etc.
      
      // Check if should generate based on frequency
      if (frequency === 'Specific day(s)') {
        if (!customDays.includes(dayOfWeek)) {
          continue;
        }
      }
      
      if (frequency === 'Every X Days' && i % everyXDays !== 0) {
        continue;
      }

      let currentDose = parseFloat(intendedDose);

      doses.push({
        compound_id: compoundId,
        user_id: userId,
        scheduled_date: formatDate(date),
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
            end_date: endDate || null,
            notes: notes || null,
            has_cycles: enableCycle,
            cycle_weeks_on: enableCycle ? cycleWeeksOn : null,
            cycle_weeks_off: enableCycle && cycleMode === 'continuous' ? cycleWeeksOff : null,
            is_active: isActive
          })
          .eq('id', editingCompound.id);

        if (updateError) throw updateError;

        // Delete ALL existing doses for this compound and regenerate
        const { error: deleteError } = await supabase
          .from('doses')
          .delete()
          .eq('compound_id', editingCompound.id);

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
            end_date: endDate || null,
            notes: notes || null,
            has_cycles: enableCycle,
            cycle_weeks_on: enableCycle ? cycleWeeksOn : null,
            cycle_weeks_off: enableCycle && cycleMode === 'continuous' ? cycleWeeksOff : null,
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/stack")}
              className="rounded-lg p-2 hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-bold">{isEditing ? 'Edit Compound' : 'Add Compound'}</h1>
          </div>
          <h2 className="text-lg font-bold bg-gradient-to-r from-[#FF6F61] to-[#8B5CF6] bg-clip-text text-transparent">
            REGIMEN
          </h2>
        </div>
      </header>

      <div className="flex-1 space-y-6 p-4 max-w-2xl mx-auto">
        {/* Basic Info */}
        <div className="space-y-4">
          <div className="space-y-2 relative">
            <Label htmlFor="name">Compound Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setShowAutocomplete(e.target.value.length > 0);
              }}
              placeholder="Compound or medication name"
              onFocus={() => setShowAutocomplete(name.length > 0)}
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
            <Label htmlFor="intendedDose">Dose Amount</Label>
            <div className="flex gap-3">
              <Input
                id="intendedDose"
                type="number"
                value={intendedDose}
                onChange={(e) => setIntendedDose(e.target.value)}
                placeholder="Amount per dose"
                className="text-lg h-12 flex-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <select
                id="unit"
                value={doseUnit}
                onChange={(e) => setDoseUnit(e.target.value)}
                className="w-[120px] h-12 bg-background border-border rounded-lg border px-3 text-sm font-medium"
              >
                <option value="mcg">mcg</option>
                <option value="mg">mg</option>
                <option value="IU">IU</option>
                <option value="ml">ml</option>
                <option value="pill">pill</option>
                <option value="capsule">capsule</option>
                <option value="drop">drop</option>
                <option value="spray">spray</option>
              </select>
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
                <div className="grid grid-cols-5 gap-2">
                  {[5, 10, 15, 20].map((size) => (
                    <button
                      key={size}
                      onClick={() => setVialSize(size.toString())}
                      className={`rounded-lg py-2 text-sm font-medium transition-colors ${
                        vialSize === size.toString()
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-card border border-border hover:bg-muted'
                      }`}
                    >
                      {size}mg
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      const input = document.getElementById('custom-vial-size') as HTMLInputElement;
                      input?.focus();
                    }}
                    className={`rounded-lg py-2 text-sm font-medium transition-colors ${
                      ![5, 10, 15, 20].includes(Number(vialSize))
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card border border-border hover:bg-muted'
                    }`}
                  >
                    <Input
                      id="custom-vial-size"
                      type="number"
                      value={![5, 10, 15, 20].includes(Number(vialSize)) ? vialSize : ''}
                      onChange={(e) => setVialSize(e.target.value)}
                      placeholder="Custom"
                      className="h-full border-0 bg-transparent p-0 text-center text-sm font-medium placeholder:text-current [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus-visible:ring-0"
                    />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>BAC Water Volume</Label>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 5].map((vol) => (
                    <button
                      key={vol}
                      onClick={() => setBacWater(vol.toString())}
                      className={`rounded-lg py-2 text-sm font-medium transition-colors ${
                        bacWater === vol.toString()
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-card border border-border hover:bg-muted'
                      }`}
                    >
                      {vol}ml
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      const input = document.getElementById('custom-bac-water') as HTMLInputElement;
                      input?.focus();
                    }}
                    className={`rounded-lg py-2 text-sm font-medium transition-colors ${
                      ![1, 2, 3, 5].includes(Number(bacWater))
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card border border-border hover:bg-muted'
                    }`}
                  >
                    <Input
                      id="custom-bac-water"
                      type="number"
                      value={![1, 2, 3, 5].includes(Number(bacWater)) ? bacWater : ''}
                      onChange={(e) => setBacWater(e.target.value)}
                      placeholder="Custom"
                      className="h-full border-0 bg-transparent p-0 text-center text-sm font-medium placeholder:text-current [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus-visible:ring-0"
                    />
                  </button>
                </div>
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
        <div className="space-y-4 bg-background rounded-lg p-4 border border-border">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Schedule</h2>

          <div className="space-y-2">
            <Label>Frequency</Label>
            <select
              value={frequency}
              onChange={(e) => {
                setFrequency(e.target.value);
                if (e.target.value === 'Specific day(s)') setCustomDays([]);
              }}
              className="w-full h-11 bg-background border-border rounded-lg border px-3 text-sm"
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
                  className="w-full h-11 bg-background border-border rounded-lg border px-3 text-sm"
                >
                  <option value="Morning">Morning</option>
                  <option value="Evening">Evening</option>
                </select>
              )}
              {!isPremium && (
                <button
                  type="button"
                  onClick={() => setShowPremiumModal(true)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                >
                  <Crown className="h-3 w-3" />
                  <span className="underline">Upgrade for custom times</span>
                </button>
              )}
            </div>
          )}

          <div className="space-y-3">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Start Date (optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(new Date(startDate + 'T00:00:00'), "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate ? new Date(startDate + 'T00:00:00') : undefined}
                      onSelect={(date) => {
                        if (date) {
                          const year = date.getFullYear();
                          const month = String(date.getMonth() + 1).padStart(2, '0');
                          const day = String(date.getDate()).padStart(2, '0');
                          setStartDate(`${year}-${month}-${day}`);
                        }
                      }}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">
                  End Date <span className="font-normal">(optional)</span>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(new Date(endDate + 'T00:00:00'), "PPP") : <span>Leave blank for ongoing</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate ? new Date(endDate + 'T00:00:00') : undefined}
                      onSelect={(date) => {
                        if (date) {
                          const year = date.getFullYear();
                          const month = String(date.getMonth() + 1).padStart(2, '0');
                          const day = String(date.getDate()).padStart(2, '0');
                          setEndDate(`${year}-${month}-${day}`);
                        } else {
                          setEndDate("");
                        }
                      }}
                      disabled={(date) => startDate ? date < new Date(startDate + 'T00:00:00') : false}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input
              id="notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes about this compound"
              className="text-sm"
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
        <div className="space-y-4 bg-background rounded-lg p-4 border border-border max-w-2xl">
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Cycle</h2>
              {!isPremium && (
                <button
                  type="button"
                  onClick={() => setShowPremiumModal(true)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                >
                  <Crown className="h-3 w-3" />
                  <span className="underline">Premium</span>
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Advanced: Automatically pause and resume this compound on a schedule</p>
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
        <div className="space-y-4 bg-background rounded-lg p-4 border border-border">
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Titration</h2>
              {!isPremium && (
                <button
                  type="button"
                  onClick={() => setShowPremiumModal(true)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                >
                  <Crown className="h-3 w-3" />
                  <span className="underline">Premium</span>
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Advanced: Gradually increase dosage over time</p>
          </div>

          {/* TITRATION - COMMENTED OUT FOR MVP */}
          {/* <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
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
          )} */}
        </div>

        {/* Active Protocol */}
        <div className="flex items-center justify-between p-4 bg-background rounded-lg border border-border">
          <Label htmlFor="active" className="mb-0 text-base">Active Protocol</Label>
          <Switch
            id="active"
            checked={isActive}
            onCheckedChange={setIsActive}
          />
        </div>

      </div>

      {/* Save Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border">
        <div className="p-4 max-w-2xl mx-auto">
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

      <PremiumModal open={showPremiumModal} onOpenChange={setShowPremiumModal} />
    </div>
  );
};
