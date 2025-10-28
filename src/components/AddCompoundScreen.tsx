import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, AlertCircle, AlertTriangle, Calendar as CalendarIcon } from "lucide-react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { SubscriptionPaywall } from "@/components/SubscriptionPaywall";
import { PreviewModeTimer } from "@/components/subscription/PreviewModeTimer";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TimePicker } from "@/components/ui/time-picker";
import { IOSTimePicker } from "@/components/ui/ios-time-picker";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import { requestNotificationPermissions, scheduleAllUpcomingDoses } from "@/utils/notificationScheduler";
import { scheduleCycleReminders } from "@/utils/cycleReminderScheduler";

const COMMON_PEPTIDES = [
  // Research Peptides - Healing & Recovery
  "AOD-9604",
  "BPC-157", "BPC-157 + KPV Blend", "Bremelanotide (PT-141)",
  "CJC-1295 with DAC", "CJC-1295 without DAC", "Cerebrolysin",
  "DSIP", "Dihexa",
  "Follistatin", "FTPP (Adipotide)",
  "GHK-Cu", "GHRP-2", "GHRP-6", "Gonadorelin", "GRF (1-29)",
  "HCG", "Hexarelin", "HMG",
  "IGF-1 LR3",
  "Ipamorelin", "Ibutamoren (MK-677)",
  "KPV",
  "MOTS-c", "Melanotan II",
  "NAD+", "N-Acetyl Semax", "N-Acetyl Selank",
  "P21", "PEG-MGF", "Pinealon",
  "Selank", "Semaglutide", "Semax", "Sermorelin", "SLUPP", "SS-31 (Elamipretide)",
  "TB-500", "TB4-FRAG", "Tesamorelin", "Tesofensine",
  "Thymosin Alpha-1", "Thymosin Beta-4", "Thymulin",
  
  // Khavinson Bioregulators (Popular Ones)
  "Epitalon", "Pinealon", "Thymalin", "Cortagen", "Testagen", 
  "Cartalax", "Vilon", "Endoluten", "Cerluten", "Ventfort",
  "Sigumir", "Chonluten", "Chelohart", "Libidon", "Vesugen",
  
  // Mitochondrial & Longevity
  "5-Amino-1MQ", "Glutathione", "NAD+", "NMN", "Urolithin A",
  
  // GLP-1 Agonists (Weight Loss)
  "Semaglutide (Ozempic/Wegovy)", "Tirzepatide (Mounjaro/Zepbound)",
  "Retatrutide", "CagriSema", "Dulaglutide (Trulicity)",
  "Liraglutide (Victoza/Saxenda)", "Rybelsus",
  
  // Testosterone - Men's TRT
  "Testosterone Cypionate", "Testosterone Enanthate", "Testosterone Propionate",
  "Testosterone Gel",
  
  // Anabolic Steroids
  "Nandrolone Decanoate (Deca)", "Nandrolone Phenylpropionate (NPP)",
  "Trenbolone Acetate", "Trenbolone Enanthate",
  "Boldenone Undecylenate (Equipoise)",
  "Drostanolone Propionate (Masteron)", "Drostanolone Enanthate",
  "Methenolone Enanthate (Primobolan)",
  "Oxandrolone (Anavar)", "Stanozolol (Winstrol)",
  "Oxymetholone (Anadrol)", "Methandrostenolone (Dianabol)",
  
  // Women's HRT - Estrogen
  "Estradiol", "Estradiol Valerate", "Estradiol Cypionate",
  "Estradiol Patch", "Estradiol Gel", "Estradiol Cream",
  "Premarin", "Climara", "Vivelle-Dot", "Estrace",
  
  // Women's HRT - Progesterone
  "Progesterone (Micronized)", "Prometrium", 
  "Medroxyprogesterone (Provera)", "Norethindrone",
  
  // Women's HRT - Testosterone
  "Testosterone Cream", "Testosterone Pellets",
  
  // HGH & Growth Hormone
  "Somatropin (HGH)", "Genotropin", "Humatrope", "Norditropin", "Saizen",
  
  // Post-Cycle Therapy (PCT) & Ancillaries
  "Anastrozole (Arimidex)", "Letrozole (Femara)", "Exemestane (Aromasin)",
  "Clomiphene Citrate (Clomid)", "Tamoxifen (Nolvadex)",
  "Cabergoline (Dostinex)", "Pramipexole",
  "Finasteride", "Dutasteride",
  
  // Hair Loss Treatments
  "Minoxidil (Oral)", "Minoxidil (Topical)",
  
  // Performance & Cognitive Enhancement
  "Modafinil", "Armodafinil",
  
  // Injectable Vitamins & Supplements
  "L-Carnitine", "B12 (Methylcobalamin)", "B12 (Cyanocobalamin)", 
  "B-Complex Injectable",
  
  // Specialty Compounds
  "Foxdri",
  
  // Blends and Stacks
  "Wolverine Stack", "GHK-Cu + BPC-157 Blend"
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

  // Calculator state
  const [showCalculator, setShowCalculator] = useState(false);
  const [activeCalculator, setActiveCalculator] = useState<'iu' | 'ml' | null>(null);
  const [vialSize, setVialSize] = useState("");
  const [vialUnit, setVialUnit] = useState("mg");
  const [bacWater, setBacWater] = useState("");
  const [isCustomVialSize, setIsCustomVialSize] = useState(false);
  const [isCustomBacWater, setIsCustomBacWater] = useState(false);

  // mL calculator (for oils/injections)
  const [concentration, setConcentration] = useState("");

  // Schedule
  const [frequency, setFrequency] = useState("Daily");
  const [customDays, setCustomDays] = useState<number[]>([]);
  const [everyXDays, setEveryXDays] = useState(3);
  const [timeOfDay, setTimeOfDay] = useState("Morning");
  const [customTime, setCustomTime] = useState("08:00");
  const [customTime2, setCustomTime2] = useState("20:00");
  const [numberOfDoses, setNumberOfDoses] = useState(1);
  // Set start date to today in local timezone
  const today = new Date();
  const localDateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const [startDate, setStartDate] = useState(localDateString);
  const [endDate, setEndDate] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [enableReminder, setEnableReminder] = useState(true);

  // Cycle (premium)
  const [enableCycle, setEnableCycle] = useState(false);
  const [cycleMode, setCycleMode] = useState<'continuous' | 'one-time'>('one-time');
  const [cycleWeeksOn, setCycleWeeksOn] = useState(4);
  const [cycleWeeksOff, setCycleWeeksOff] = useState(2);
  const [cycleReminders, setCycleReminders] = useState(true);
  const [cycleTimeUnit, setCycleTimeUnit] = useState<'weeks' | 'months'>('weeks');

  // Active status
  const [isActive, setIsActive] = useState(true);
  
  // Subscription checks
  const { 
    canAddCompound, 
    isSubscribed, 
    markPreviewCompoundAdded,
    previewModeCompoundAdded 
  } = useSubscription();
  
  const [showPaywall, setShowPaywall] = useState(false);
  const [canProceed, setCanProceed] = useState(false);
  const [showPreviewTimer, setShowPreviewTimer] = useState(false);

  // Check if user can add compound (preview mode or subscribed)
  useEffect(() => {
    if (isEditing) {
      // Editing requires subscription
      if (!isSubscribed) {
        setShowPaywall(true);
        setCanProceed(false);
      } else {
        setCanProceed(true);
      }
    } else {
      // Adding new compound
      const checkAccess = async () => {
        const allowed = await canAddCompound();
        if (!allowed) {
          setShowPaywall(true);
          setCanProceed(false);
        } else {
          setCanProceed(true);
        }
      };
      checkAccess();
    }
  }, [isEditing, isSubscribed]);

  // Load existing compound data if editing
  useEffect(() => {
    if (editingCompound) {
      setName(editingCompound.name);
      setIntendedDose(editingCompound.intended_dose.toString());
      setDoseUnit(editingCompound.dose_unit);
      
      // Handle schedule type - extract number from "Every X Days" format
      const scheduleType = editingCompound.schedule_type;
      const everyXDaysMatch = scheduleType.match(/Every (\d+) Days/);
      if (everyXDaysMatch) {
        setFrequency('Every X Days');
        setEveryXDays(parseInt(everyXDaysMatch[1]));
      } else {
        setFrequency(scheduleType);
      }
      
      // Load the saved times - handle array of times
      const times = editingCompound.time_of_day || ['08:00'];
      setNumberOfDoses(times.length);
      setCustomTime(times[0] || '08:00');
      setCustomTime2(times[1] || '20:00');
      
      if (editingCompound.schedule_type === 'Specific day(s)' || editingCompound.schedule_type === 'Specific day of the week') {
        setCustomDays(editingCompound.schedule_days?.map(Number) || []);
      }
      setStartDate(editingCompound.start_date);
      setEndDate(editingCompound.end_date || "");
      setNotes(editingCompound.notes || "");
      setIsActive(editingCompound.is_active ?? true);
      
      if (editingCompound.has_cycles) {
        setEnableCycle(true);
        const weeksOn = editingCompound.cycle_weeks_on || 4;
        // Auto-detect if it's in months (if divisible by 4 and >= 4)
        const shouldUseMonths = weeksOn >= 4 && weeksOn % 4 === 0;
        if (shouldUseMonths) {
          setCycleTimeUnit('months');
          setCycleWeeksOn(weeksOn / 4);
        } else {
          setCycleTimeUnit('weeks');
          setCycleWeeksOn(weeksOn);
        }
        
        if (editingCompound.cycle_weeks_off) {
          setCycleMode('continuous');
          const weeksOff = editingCompound.cycle_weeks_off;
          // Use months for off period if on period is in months
          if (shouldUseMonths && weeksOff >= 4 && weeksOff % 4 === 0) {
            setCycleWeeksOff(weeksOff / 4);
          } else {
            setCycleWeeksOff(weeksOff);
          }
        } else {
          setCycleMode('one-time');
        }
      }
      
      if (editingCompound.vial_size) {
        setActiveCalculator('iu');
        setVialSize(editingCompound.vial_size.toString());
        setVialUnit(editingCompound.vial_unit || "mg");
        setBacWater(editingCompound.bac_water_volume?.toString() || "");
      }
    }
  }, []);

  // Calculate IU (syringe units on 100-unit insulin syringe)
  // This converts your dose to the number of units on a standard insulin syringe
  const calculateIU = () => {
    // Validate all inputs are present and numeric
    if (!vialSize || !bacWater || !intendedDose) return null;
    
    const vialNum = parseFloat(vialSize);
    const bacWaterNum = parseFloat(bacWater);
    const doseNum = parseFloat(intendedDose);
    
    // Validate all numbers are valid and positive
    if (isNaN(vialNum) || isNaN(bacWaterNum) || isNaN(doseNum) || 
        vialNum <= 0 || bacWaterNum <= 0 || doseNum <= 0) {
      return null;
    }

    // Convert everything to mcg for consistent calculation
    const vialMcg = vialUnit === 'mg' ? vialNum * 1000 : vialNum;
    
    // Convert dose to mcg based on unit
    let doseMcg: number;
    if (doseUnit === 'mg') {
      doseMcg = doseNum * 1000;
    } else if (doseUnit === 'mcg') {
      doseMcg = doseNum;
    } else if (doseUnit === 'iu') {
      // If user selected IU as dose unit, they're working backwards
      // This shouldn't happen in normal flow, but handle gracefully
      return null;
    } else {
      // Other units (mL, pill, etc.) don't make sense for IU calculation
      return null;
    }
    
    // CRITICAL FIX #2: Validate dose doesn't exceed vial capacity
    if (doseMcg > vialMcg) {
      return null;
    }
    
    // Calculate concentration: total mcg divided by total mL
    const concentrationMcgPerML = vialMcg / bacWaterNum;
    
    // Validate concentration is reasonable
    if (concentrationMcgPerML <= 0 || !isFinite(concentrationMcgPerML)) {
      return null;
    }
    
    // Calculate volume needed in mL
    const volumeML = doseMcg / concentrationMcgPerML;
    
    // Validate volume is reasonable
    if (volumeML <= 0 || !isFinite(volumeML)) {
      return null;
    }
    
    // Convert mL to units on a 100-unit insulin syringe (1mL = 100 units)
    const syringeUnits = volumeML * 100;
    
    // Round to 1 decimal place for precision
    return syringeUnits > 0 && isFinite(syringeUnits) 
      ? Math.round(syringeUnits * 10) / 10 
      : null;
  };

  // Only calculate IU when calculator is active and inputs are valid
  const calculatedIU = activeCalculator === 'iu' ? calculateIU() : null;
  
  // Convert calculatedIU to string for display, preserving decimal if present
  // FIX #1: Ensure we always show .0 for whole numbers (e.g., "0.0" not "0")
  const displayIU = calculatedIU !== null ? calculatedIU.toFixed(1) : null;

  // Calculate mL needed based on concentration for oil-based compounds
  const calculateML = () => {
    if (!concentration || !intendedDose) return null;
    
    const concentrationNum = parseFloat(concentration);
    const doseNum = parseFloat(intendedDose);
    
    // Validate inputs
    if (isNaN(concentrationNum) || isNaN(doseNum) || 
        concentrationNum <= 0 || doseNum <= 0) {
      return null;
    }
    
    // Formula: mL needed = dose (mg) / concentration (mg/mL)
    const mlNeeded = doseNum / concentrationNum;
    
    // Validate result
    if (mlNeeded <= 0 || !isFinite(mlNeeded)) {
      return null;
    }
    
    // Round to 2 decimal places and remove trailing zeros
    return parseFloat(mlNeeded.toFixed(2)).toString();
  };

  const calculatedML = activeCalculator === 'ml' && doseUnit === 'mg' ? calculateML() : null;

  // Don't auto-populate dose - let user enter their intended dose
  // The calculator will show them the IU amount based on their dose

  const getWarning = () => {
    if (!displayIU) return null;
    const iu = parseFloat(displayIU);
    
    // FIX #2: Check if dose exceeds vial capacity (critical error)
    if (!vialSize || !intendedDose) return null;
    const vialMcg = parseFloat(vialSize) * (vialUnit === 'mg' ? 1000 : 1);
    let doseMcg = parseFloat(intendedDose);
    if (doseUnit === 'mg') doseMcg = doseMcg * 1000;
    
    if (doseMcg > vialMcg) {
      return "❌ Dose exceeds total peptide in vial";
    }
    
    // Validate the calculated units
    if (isNaN(iu)) return "❌ Invalid calculation";
    
    // Special handling for extremely small doses (likely unit confusion)
    if (iu < 0.5 && iu >= 0) {
      const doseNum = parseFloat(intendedDose);
      return `Unusually small dose (${iu.toFixed(1)} units) - did you mean ${doseNum} mg?`;
    }
    
    if (iu < 1) return "Very small dose - consider using more BAC water or smaller vial size";
    if (iu > 100) return "Exceeds 100-unit syringe capacity - use less BAC water or smaller vial";
    if (iu > 80) return "Large dose - close to syringe limit";
    if (iu > 50) return "Large dose - please double-check your inputs";
    if (iu < 5 && iu >= 1) return "⚠️ Small dose - ensure accurate measurement";
    
    return null;
  };
  
  // Validation for mL calculator
  const getMLWarning = () => {
    if (!calculatedML) return null;
    const ml = parseFloat(calculatedML);
    
    if (isNaN(ml) || ml <= 0) return "❌ Invalid calculation";
    if (ml > 3) return "⚠️ Large volume - verify your concentration";
    if (ml < 0.1) return "⚠️ Very small volume - difficult to measure accurately";
    
    return null;
  };

  const filteredPeptides = COMMON_PEPTIDES.filter(p =>
    p.toLowerCase().includes(name.toLowerCase())
  ).sort((a, b) => {
    // Prioritize matches at the beginning of the string
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();
    const searchLower = name.toLowerCase();
    const aStartsWith = aLower.startsWith(searchLower);
    const bStartsWith = bLower.startsWith(searchLower);
    
    if (aStartsWith && !bStartsWith) return -1;
    if (!aStartsWith && bStartsWith) return 1;
    return a.localeCompare(b);
  });

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
    
    // Start from today or start date (whichever is later) to ensure future doses exist
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const effectiveStart = start > today ? start : today;
    
    // Calculate end boundary (60 days from effective start or user-specified end date, whichever is sooner)
    const maxDays = 60;
    let daysToGenerate = maxDays;
    
    if (endDate) {
      const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
      const end = new Date(endYear, endMonth - 1, endDay);
      const daysDiff = Math.floor((end.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24));
      daysToGenerate = Math.min(maxDays, Math.max(0, daysDiff + 1));
    }
    
    for (let i = 0; i < daysToGenerate; i++) {
      const date = new Date(effectiveStart);
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

      // Check cycle logic - skip if in "off" period
      if (enableCycle && cycleMode === 'continuous') {
        // Calculate days since original start date (not effective start)
        const daysSinceStart = Math.floor((date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        // Convert to days: if cycleTimeUnit is months, multiply by ~30 days, else by 7
        const weeksOnInDays = cycleTimeUnit === 'months' ? Math.round(cycleWeeksOn * 30) : Math.round(cycleWeeksOn * 7);
        const weeksOffInDays = cycleTimeUnit === 'months' ? Math.round(cycleWeeksOff * 30) : Math.round(cycleWeeksOff * 7);
        const cycleLength = weeksOnInDays + weeksOffInDays;
        const positionInCycle = daysSinceStart % cycleLength;
        
        // Skip if we're in the "off" period
        if (positionInCycle >= weeksOnInDays) {
          continue;
        }
      } else if (enableCycle && cycleMode === 'one-time') {
        // For one-time cycles, only generate for the "on" weeks
        const onPeriodDays = cycleTimeUnit === 'months' ? Math.round(cycleWeeksOn * 30) : Math.round(cycleWeeksOn * 7);
        if (i >= onPeriodDays) {
          break; // Stop generating after on period ends
        }
      }

      let currentDose = parseFloat(intendedDose);

      // Generate doses based on number of doses per day
      const timesToGenerate = numberOfDoses === 2 
        ? (isSubscribed ? [customTime, customTime2] : ['08:00', '20:00'])
        : (isSubscribed ? [customTime] : ['08:00']);

      timesToGenerate.forEach(time => {
        doses.push({
          compound_id: compoundId,
          user_id: userId,
          scheduled_date: formatDate(date),
          scheduled_time: time,
          dose_amount: currentDose,
          dose_unit: doseUnit,
          calculated_iu: displayIU ? parseFloat(displayIU) : null,
          calculated_ml: calculatedML ? parseFloat(calculatedML) : null,
          concentration: concentration ? parseFloat(concentration) : null
        });
      });
    }
    
    return doses;
  };

  const triggerHaptic = async (intensity: 'light' | 'medium' = 'medium') => {
    try {
      if (Capacitor.isNativePlatform()) {
        await Haptics.impact({ style: intensity === 'light' ? ImpactStyle.Light : ImpactStyle.Medium });
      } else if ('vibrate' in navigator) {
        navigator.vibrate(intensity === 'light' ? 30 : 50);
      }
    } catch (err) {
      console.log('Haptic failed:', err);
    }
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
            calculated_iu: displayIU ? parseFloat(displayIU) : null,
            calculated_ml: calculatedML ? parseFloat(calculatedML) : null,
            concentration: concentration ? parseFloat(concentration) : null,
          schedule_type: frequency === 'Every X Days' ? `Every ${everyXDays} Days` : frequency,
          time_of_day: numberOfDoses === 2 
            ? (isSubscribed ? [customTime, customTime2] : ['08:00', '20:00'])
            : (isSubscribed ? [customTime] : ['08:00']),
          schedule_days: frequency === 'Specific day(s)' ? customDays.map(String) : null,
            start_date: startDate,
            end_date: endDate || null,
            notes: notes || null,
        has_cycles: enableCycle,
        cycle_weeks_on: enableCycle ? (cycleTimeUnit === 'months' ? cycleWeeksOn * 4 : cycleWeeksOn) : null,
        cycle_weeks_off: enableCycle && cycleMode === 'continuous' ? (cycleTimeUnit === 'months' ? cycleWeeksOff * 4 : cycleWeeksOff) : null,
        cycle_reminders_enabled: enableCycle ? cycleReminders : false,
            is_active: isActive
          })
          .eq('id', editingCompound.id);

        if (updateError) throw updateError;

        // Delete only FUTURE doses (preserve taken/skipped doses)
        const today = new Date();
        const todayStr = formatDate(today);
        const { error: deleteError } = await supabase
          .from('doses')
          .delete()
          .eq('compound_id', editingCompound.id)
          .gte('scheduled_date', todayStr)
          .eq('taken', false)
          .eq('skipped', false);

        if (deleteError) throw deleteError;

        // Generate new doses from today forward
        const doses = generateDoses(editingCompound.id, user.id);
        const { error: dosesUpdateError } = await supabase
          .from('doses')
          .insert(doses);

        if (dosesUpdateError) throw dosesUpdateError;

        // Success haptic and navigate immediately
        triggerHaptic('medium');
        navigate("/stack");

        // Reschedule notifications in background (non-blocking)
        supabase
          .from('doses')
          .select('*, compounds(name)')
          .eq('user_id', user.id)
          .eq('taken', false)
          .then(({ data: allDoses }) => {
            if (allDoses) {
              const dosesWithCompoundName = allDoses.map(dose => ({
                ...dose,
                compound_name: dose.compounds?.name || 'Medication'
              }));
            scheduleAllUpcomingDoses(dosesWithCompoundName, isSubscribed);
            }
          });

        // Schedule cycle reminders if enabled
        if (enableCycle && cycleReminders) {
          const cycleRemindersEnabled = localStorage.getItem('cycleReminders') !== 'false';
          if (cycleRemindersEnabled) {
            scheduleCycleReminders({
              id: editingCompound.id,
              name,
              start_date: startDate,
              cycle_weeks_on: cycleTimeUnit === 'months' ? cycleWeeksOn * 4 : cycleWeeksOn,
              cycle_weeks_off: cycleMode === 'continuous' ? (cycleTimeUnit === 'months' ? cycleWeeksOff * 4 : cycleWeeksOff) : null,
              has_cycles: true,
              cycle_reminders_enabled: true
            });
          }
        }
        return;
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
          calculated_iu: displayIU ? parseFloat(displayIU) : null,
            calculated_ml: calculatedML ? parseFloat(calculatedML) : null,
            concentration: concentration ? parseFloat(concentration) : null,
            schedule_type: frequency === 'Every X Days' ? `Every ${everyXDays} Days` : frequency,
            time_of_day: numberOfDoses === 2 
              ? (isSubscribed ? [customTime, customTime2] : ['08:00', '20:00'])
              : (isSubscribed ? [customTime] : ['08:00']),
            schedule_days: frequency === 'Specific day(s)' ? customDays.map(String) : null,
            start_date: startDate,
            end_date: endDate || null,
            notes: notes || null,
            has_cycles: enableCycle,
            cycle_weeks_on: enableCycle ? (cycleTimeUnit === 'months' ? cycleWeeksOn * 4 : cycleWeeksOn) : null,
            cycle_weeks_off: enableCycle && cycleMode === 'continuous' ? (cycleTimeUnit === 'months' ? cycleWeeksOff * 4 : cycleWeeksOff) : null,
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

        // Schedule cycle reminders if enabled
        if (enableCycle) {
          const cycleRemindersEnabled = localStorage.getItem('cycleReminders') !== 'false';
          if (cycleRemindersEnabled) {
          scheduleCycleReminders({
              id: compound.id,
              name,
              start_date: startDate,
              cycle_weeks_on: cycleTimeUnit === 'months' ? cycleWeeksOn * 4 : cycleWeeksOn,
              cycle_weeks_off: cycleMode === 'continuous' ? (cycleTimeUnit === 'months' ? cycleWeeksOff * 4 : cycleWeeksOff) : null,
              has_cycles: true,
              cycle_reminders_enabled: true
            });
          }
        }
      }

      // Success haptic and navigate immediately
      triggerHaptic('medium');
      navigate('/today');

      // Schedule notifications in background (non-blocking)
      supabase
        .from('doses')
        .select('*, compounds(name)')
        .eq('user_id', user.id)
        .eq('taken', false)
        .then(({ data: allDoses }) => {
          if (allDoses) {
            const dosesWithCompoundName = allDoses.map(dose => ({
              ...dose,
              compound_name: dose.compounds?.name || 'Medication'
            }));
            scheduleAllUpcomingDoses(dosesWithCompoundName, isSubscribed);
          }
        });
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
    <div className="flex min-h-screen flex-col bg-background safe-top" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
      {/* Header */}
      <header className="border-b border-border px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/stack")}
            className="rounded-lg p-2 hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold">{isEditing ? 'Edit Compound' : 'Add Compound'}</h1>
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
                // FIX #3: Clear calculator values when compound name changes
                if (e.target.value !== name) {
                  setVialSize("");
                  setBacWater("");
                  setConcentration("");
                  setIsCustomVialSize(false);
                  setIsCustomBacWater(false);
                }
              }}
              placeholder="Compound name"
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
            <Label htmlFor="intendedDose">Dose Amount <span className="text-destructive">*</span></Label>
            <div className="flex gap-3">
              <Input
                id="intendedDose"
                type="number"
                value={intendedDose}
                onChange={(e) => setIntendedDose(e.target.value)}
                placeholder="Enter amount"
                className="text-lg h-12 flex-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <select
                id="unit"
                value={doseUnit}
                onChange={(e) => setDoseUnit(e.target.value)}
                className="w-[120px] h-12 bg-input border-border rounded-lg border px-3 text-sm font-medium"
              >
                <option value="mcg">mcg</option>
                <option value="mg">mg</option>
                <option value="iu">IU</option>
                <option value="mL">mL</option>
                <option value="pill">pill</option>
                <option value="drop">drop</option>
                <option value="spray">spray</option>
              </select>
            </div>
          </div>

          {/* Calculator buttons - shown based on dose unit */}
          {/* FIX #4: Hide IU calculator when dose unit is already 'iu' */}
          {doseUnit === 'mcg' && (
            <button
              onClick={() => {
                setActiveCalculator(activeCalculator === 'iu' ? null : 'iu');
              }}
              className="text-sm text-primary hover:underline"
            >
              {activeCalculator === 'iu' ? '- Hide' : '+ Show'} IU Calculator
            </button>
          )}

          {doseUnit === 'mg' && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setActiveCalculator(activeCalculator === 'iu' ? null : 'iu');
                }}
                className="text-sm text-primary hover:underline"
              >
                {activeCalculator === 'iu' ? '- Hide' : '+ Show'} IU Calculator
              </button>
              <span className="text-muted-foreground">|</span>
              <button
                onClick={() => {
                  setActiveCalculator(activeCalculator === 'ml' ? null : 'ml');
                }}
                className="text-sm text-primary hover:underline"
              >
                {activeCalculator === 'ml' ? '- Hide' : '+ Show'} mL Calculator
              </button>
            </div>
          )}

          {activeCalculator === 'iu' && (doseUnit === 'mcg' || doseUnit === 'mg') && (
            <div className="space-y-4 p-4 bg-surface rounded-lg">
              <div className="space-y-2">
                <Label>Peptide Amount (mg)</Label>
                <div className="grid grid-cols-5 gap-2">
                  {[5, 10, 15, 20].map((size) => (
                    <button
                      key={size}
                      onClick={() => {
                        setVialSize(size.toString());
                        setIsCustomVialSize(false);
                      }}
                      className={`rounded-lg py-2 text-sm font-medium transition-colors ${
                        vialSize === size.toString() && !isCustomVialSize
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-card border border-border hover:bg-muted'
                      }`}
                    >
                      {size}mg
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      setVialSize('');
                      setIsCustomVialSize(true);
                      setTimeout(() => {
                        const input = document.getElementById('custom-vial-size') as HTMLInputElement;
                        input?.focus();
                      }, 0);
                    }}
                    className={`rounded-lg py-2 text-sm font-medium transition-colors ${
                      isCustomVialSize && vialSize
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card border border-border hover:bg-muted'
                    }`}
                  >
                    <Input
                      id="custom-vial-size"
                      type="text"
                      inputMode="decimal"
                      value={!isCustomVialSize && [5, 10, 15, 20].map(String).includes(vialSize) ? '' : vialSize}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                          setVialSize(value);
                          setIsCustomVialSize(true);
                        }
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setVialSize('');
                        setIsCustomVialSize(true);
                      }}
                      placeholder="Custom"
                      className="h-full border-0 bg-transparent p-0 text-center text-base font-medium placeholder:text-current [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus-visible:ring-0"
                    />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>BAC Water Volume (ml)</Label>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 5].map((vol) => (
                    <button
                      key={vol}
                      onClick={() => {
                        setBacWater(vol.toString());
                        setIsCustomBacWater(false);
                      }}
                      className={`rounded-lg py-2 text-sm font-medium transition-colors ${
                        bacWater === vol.toString() && !isCustomBacWater
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-card border border-border hover:bg-muted'
                      }`}
                    >
                      {vol}ml
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      setBacWater('');
                      setIsCustomBacWater(true);
                      setTimeout(() => {
                        const input = document.getElementById('custom-bac-water') as HTMLInputElement;
                        input?.focus();
                      }, 0);
                    }}
                    className={`rounded-lg py-2 text-sm font-medium transition-colors ${
                      isCustomBacWater && bacWater
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card border border-border hover:bg-muted'
                    }`}
                  >
                    <Input
                      id="custom-bac-water"
                      type="text"
                      inputMode="decimal"
                      value={!isCustomBacWater && [1, 2, 3, 5].map(String).includes(bacWater) ? '' : bacWater}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                          setBacWater(value);
                          setIsCustomBacWater(true);
                        }
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setBacWater('');
                        setIsCustomBacWater(true);
                      }}
                      placeholder="Custom"
                      className="h-full border-0 bg-transparent p-0 text-center text-base font-medium placeholder:text-current [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus-visible:ring-0"
                    />
                  </button>
                </div>
              </div>


              {displayIU && (
                <>
                  <div className={cn(
                    "border-2 rounded-lg p-4 text-center",
                    getWarning()?.startsWith("❌") 
                      ? "bg-destructive/10 border-destructive" 
                      : "bg-card border-secondary"
                  )}>
                    <div className="text-3xl font-bold text-primary">{displayIU} units</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      on a 100-unit insulin syringe
                    </div>
                    {getWarning() && (
                      <div className="flex items-center justify-center gap-2 text-sm text-yellow-400/90 mt-3 bg-yellow-400/10 rounded-lg p-2.5 border border-yellow-400/20">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span className="text-center">{getWarning()}</span>
                      </div>
                    )}
                    
                    {/* Show the calculation breakdown for transparency */}
                    <div className="mt-4 pt-4 border-t border-border/50 text-xs text-muted-foreground space-y-1">
                      <div>Concentration: {((parseFloat(vialSize) * (vialUnit === 'mg' ? 1000 : 1)) / parseFloat(bacWater)).toFixed(0)} mcg/mL</div>
                      <div>Volume: {parseFloat((parseFloat(displayIU) / 100).toFixed(3))} mL</div>
                    </div>
                  </div>
                  
                  {/* Medical disclaimer - only shown when calculation is displayed */}
                  <div className="text-center text-muted-foreground/60 text-xs mt-4 flex items-center justify-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Always verify your calculations before use</span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* mL Calculator - for oil-based compounds */}
          {activeCalculator === 'ml' && doseUnit === 'mg' && (
            <div className="space-y-4 p-4 bg-surface rounded-lg">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <Label className="sm:mb-0">Concentration (mg/mL)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={concentration}
                  onChange={(e) => setConcentration(e.target.value)}
                  placeholder="e.g., 200"
                  className="text-lg h-12 w-full sm:w-64"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Enter the mg/mL shown on your vial label
              </p>

              {calculatedML && (
                <>
                  <div className={cn(
                    "border-2 rounded-lg p-4 text-center",
                    getMLWarning()?.startsWith("❌") 
                      ? "bg-destructive/10 border-destructive" 
                      : "bg-card border-secondary"
                  )}>
                    <div className="text-3xl font-bold text-primary">{calculatedML} mL</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Volume to inject
                    </div>
                    {getMLWarning() && (
                      <div className="flex items-center justify-center gap-2 text-sm text-yellow-400/90 mt-3 bg-yellow-400/10 rounded-lg p-2.5 border border-yellow-400/20">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span className="text-center">{getMLWarning()}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Medical disclaimer */}
                  <div className="text-center text-muted-foreground/60 text-xs mt-4 flex items-center justify-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Always verify your calculations before use</span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Schedule */}
        <div className="space-y-4 bg-background rounded-lg p-4 border border-border">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Schedule</h2>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <Label className="sm:mb-0">Frequency <span className="text-destructive">*</span></Label>
            <select
              value={frequency}
              onChange={(e) => {
                setFrequency(e.target.value);
                if (e.target.value === 'Specific day(s)') setCustomDays([]);
              }}
              className="w-full sm:w-64 h-11 bg-input border-border rounded-lg border px-3 text-sm"
            >
              <option value="Daily">Daily</option>
              <option value="Specific day(s)">Specific days</option>
              <option value="Every X Days">Every X days</option>
              <option value="As Needed">As needed</option>
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
                  type="text"
                  inputMode="numeric"
                  value={everyXDays === 0 ? '' : everyXDays}
                  onChange={(e) => {
                    const val = e.target.value;
                    // Allow empty for clearing (temporary state)
                    if (val === '') {
                      setEveryXDays(0);
                      return;
                    }
                    // Only allow digits
                    if (/^\d+$/.test(val)) {
                      const num = parseInt(val);
                      if (num >= 1 && num <= 999) {
                        setEveryXDays(num);
                      }
                    }
                  }}
                  onBlur={() => {
                    // If still empty/0 on blur, set to 1
                    if (everyXDays === 0) {
                      setEveryXDays(1);
                    }
                  }}
                  placeholder="3"
                  className="w-20 text-center"
                />
                <span className="text-sm">days</span>
              </div>
            </div>
          )}

          {frequency !== 'As Needed' && (
            <>
              {/* Number of Doses - Compact single row */}
              <div className="flex items-center justify-between py-2">
                <Label className="mb-0 text-sm">Doses Per Day</Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setNumberOfDoses(1)}
                    className={`w-12 h-9 rounded-lg text-sm font-medium transition-colors ${
                      numberOfDoses === 1
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card border border-border hover:bg-muted'
                    }`}
                  >
                    1
                  </button>
                  <button
                    type="button"
                    onClick={() => setNumberOfDoses(2)}
                    className={`w-12 h-9 rounded-lg text-sm font-medium transition-colors ${
                      numberOfDoses === 2
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card border border-border hover:bg-muted'
                    }`}
                  >
                    2
                  </button>
                </div>
              </div>

              {/* Time(s) - Compact layout */}
              {isSubscribed ? (
                <>
                  {numberOfDoses === 1 ? (
                    <div className="flex items-center justify-between py-2">
                      <Label className="mb-0 text-sm flex items-center h-9">Time</Label>
                      <IOSTimePicker
                        value={customTime}
                        onChange={setCustomTime}
                        className="w-40"
                      />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between py-2">
                        <Label className="mb-0 text-sm flex items-center h-9">First Dose</Label>
                        <IOSTimePicker
                          value={customTime}
                          onChange={setCustomTime}
                          className="w-40"
                        />
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <Label className="mb-0 text-sm flex items-center h-9">Second Dose</Label>
                        <IOSTimePicker
                          value={customTime2}
                          onChange={setCustomTime2}
                          className="w-40"
                        />
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-between py-2">
                  <Label className="mb-0 text-sm flex items-center h-9">Time</Label>
                  <div className="flex flex-col items-end gap-1">
                    <div className="h-9 px-3 bg-muted border-border rounded-lg border text-xs flex items-center text-muted-foreground">
                      {numberOfDoses === 1 ? '8:00 AM' : '8:00 AM & 8:00 PM'}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPaywall(true)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                    >
                      🔒 <span className="underline">Custom times</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <Label className="sm:mb-0">Start Date <span className="text-destructive">*</span></Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full sm:w-64 justify-start text-left font-normal",
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
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Batch number, COA link, storage location, etc."
              className="text-sm resize-y min-h-[80px]"
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
              {!isSubscribed && (
                <button
                  type="button"
                  onClick={() => setShowPaywall(true)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                >
                  🔒 <span className="underline">Subscribe</span>
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
              onCheckedChange={(checked) => {
                if (!isSubscribed) {
                  setShowPaywall(true);
                } else {
                  setEnableCycle(checked);
                }
              }}
              disabled={!isSubscribed}
            />
          </div>

          {enableCycle && isSubscribed && (
            <div className="space-y-4">
              <div className="flex gap-2">
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
                <button
                  onClick={() => setCycleMode('continuous')}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                    cycleMode === 'continuous'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card border border-border hover:bg-muted'
                  }`}
                >
                  On/Off Cycle
                </button>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={cycleWeeksOn}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val) && val >= 0.5) {
                      setCycleWeeksOn(val);
                    }
                  }}
                  className="w-20"
                />
                <select
                  value={cycleTimeUnit}
                  onChange={(e) => setCycleTimeUnit(e.target.value as 'weeks' | 'months')}
                  className="h-9 bg-input border-border rounded-lg border px-2 text-sm"
                >
                  <option value="weeks">weeks</option>
                  <option value="months">months</option>
                </select>
                <span className="text-sm">on</span>
              </div>

              {cycleMode === 'continuous' && (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={cycleWeeksOff}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val) && val >= 0.5) {
                        setCycleWeeksOff(val);
                      }
                    }}
                    className="w-20"
                  />
                  <select
                    value={cycleTimeUnit}
                    onChange={(e) => setCycleTimeUnit(e.target.value as 'weeks' | 'months')}
                    className="h-9 bg-input border-border rounded-lg border px-2 text-sm"
                  >
                    <option value="weeks">weeks</option>
                    <option value="months">months</option>
                  </select>
                  <span className="text-sm">off</span>
                </div>
              )}
              
              {/* Cycle Reminders Toggle - Moved after duration inputs */}
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                <div className="flex-1">
                  <Label htmlFor="cycle-reminders" className="mb-0 text-sm font-medium">Cycle Change Reminders</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Get notified before cycle transitions</p>
                </div>
                <Switch
                  id="cycle-reminders"
                  checked={cycleReminders}
                  onCheckedChange={setCycleReminders}
                />
              </div>

              {cycleMode === 'one-time' && (
                <p className="text-xs text-muted-foreground p-3 bg-muted/50 rounded-lg">
                  After {cycleWeeksOn} {cycleTimeUnit === 'months' ? (cycleWeeksOn !== 1 ? 'months' : 'month') : (cycleWeeksOn !== 1 ? 'weeks' : 'week')}, this compound will automatically become inactive. You can reactivate it manually from My Stack.
                </p>
              )}
            </div>
          )}
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

      {!canProceed && !isSubscribed && (
        <div className="min-h-screen flex items-center justify-center p-4">
          <SubscriptionPaywall 
            open={showPaywall}
            onOpenChange={(open) => {
              setShowPaywall(open);
              if (!open) {
                navigate(-1);
              }
            }}
            message={isEditing ? "Subscribe to edit your compounds and access all features" : "Subscribe to add unlimited compounds and unlock all features"}
          />
        </div>
      )}
      
      {showPreviewTimer && !isSubscribed && (
        <PreviewModeTimer onTimerStart={() => console.log('Preview timer started')} />
      )}
      
      <SubscriptionPaywall 
        open={showPaywall && canProceed}
        onOpenChange={setShowPaywall}
        message="Subscribe to unlock all features"
      />
    </div>
  );
};
