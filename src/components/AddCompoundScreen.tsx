import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, AlertCircle, AlertTriangle, Calendar as CalendarIcon, Trash2, Calculator } from "lucide-react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { usePaywall } from "@/contexts/PaywallContext";
import { PreviewModeTimer } from "@/components/subscription/PreviewModeTimer";
import { NotificationPermissionDialog } from "@/components/NotificationPermissionDialog";
import { trackCompoundAdded, trackCompoundEdited, trackCompoundDeleted, trackCycleEnabled, trackCalculatorUsed, trackFirstCompoundAdded } from "@/utils/analytics";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TimePicker } from "@/components/ui/time-picker";
import { IOSTimePicker } from "@/components/ui/ios-time-picker";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSwipeBack } from "@/hooks/useSwipeBack";
import { format } from "date-fns";
import { createLocalDate, safeFormatDate } from "@/utils/dateUtils";
import { cn } from "@/lib/utils";
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { requestNotificationPermissions, scheduleAllUpcomingDoses } from "@/utils/notificationScheduler";
import { scheduleCycleReminders } from "@/utils/cycleReminderScheduler";
import { cancelCompoundNudges, scheduleAddMoreEncouragement, cancelAddMoreEncouragement } from "@/utils/engagementNotifications";
import { SegmentedControl } from "@/components/ui/segmented-control";

// Oil-based compounds that commonly use weekly dosing protocols
const OIL_BASED_COMPOUNDS = [
  // Testosterone variants
  "Testosterone Cypionate", "Testosterone Enanthate", "Testosterone Propionate",
  "Test Cyp", "Test C", "Test E", "Test Prop", "Test P",
  // Nandrolone
  "Nandrolone Decanoate", "Deca", "Deca-Durabolin", "Nandrolone Phenylpropionate", "NPP",
  // Trenbolone
  "Trenbolone Acetate", "Trenbolone Enanthate", "Tren A", "Tren E", "Tren",
  // Boldenone
  "Boldenone Undecylenate", "Equipoise", "EQ", "Bold",
  // Masteron
  "Masteron", "Masteron Propionate", "Masteron Enanthate", "Drostanolone", "Drostanolone Propionate", "Drostanolone Enanthate",
  // Primobolan
  "Primobolan", "Primobolan Depot", "Methenolone Enanthate", "Methenolone Acetate", "Primo",
  // Other injectables
  "Sustanon", "Sustanon 250", "Omnadren"
];

const COMMON_PEPTIDES = [
  // Research Peptides - Healing & Recovery
  "AOD-9604", "ARA-290",
  "BPC-157", "BPC-157 + KPV Blend", "Bremelanotide", "PT-141",
  "CJC-1295 with DAC", "CJC-1295 without DAC",
  "DSIP", "Dihexa",
  "GHK-Cu", "GHRP-2", "GHRP-6", "Gonadorelin", "GRF 1-29",
  "HCG", "Hexarelin", "HMG",
  "IGF-1 LR3",
  "Ipamorelin", "Ibutamoren", "MK-677",
  "Kisspeptin", "KPV",
  "MOTS-c", "Melanotan II",
  "NAD+", "N-Acetyl Semax", "N-Acetyl Selank",
  "PEG-MGF",
  "Selank", "Semaglutide", "Semax", "Sermorelin", "SS-31", "Elamipretide",
  "TB-500", "TB4-FRAG", "Tesamorelin", "Tesofensine",
  "Thymosin Alpha-1", "Thymosin Beta-4", "Thymulin",
  
  // Select Bioregulators (Popular Ones)
  "Epitalon", "Thymalin",
  
  // Mitochondrial & Longevity
  "5-Amino-1MQ", "Glutathione", "NMN",
  
  // GLP-1 Agonists (Weight Loss)
  "Semaglutide", "Ozempic", "Wegovy",
  "Tirzepatide", "Mounjaro", "Zepbound",
  "Retatrutide", "CagriSema", "Mazdutide", "Survodutide",
  "Dulaglutide", "Trulicity",
  "Liraglutide", "Saxenda", 
  "Rybelsus",
  
  // Testosterone - Men's TRT
  "Testosterone Cypionate", "Testosterone Enanthate", "Testosterone Propionate",
  "Testosterone Gel",
  
  // Anabolic Steroids
  "Nandrolone Decanoate", "Deca", "Nandrolone Phenylpropionate", "NPP",
  "Trenbolone Acetate", "Trenbolone Enanthate",
  "Boldenone Undecylenate", "Equipoise",
  "Masteron Propionate", "Masteron Enanthate", "Drostanolone Propionate", "Drostanolone Enanthate",
  "Primobolan", "Primobolan Depot", "Methenolone Enanthate", "Methenolone Acetate",
  "Oxandrolone", "Anavar", "Stanozolol", "Winstrol",
  "Oxymetholone", "Anadrol", "Methandrostenolone", "Dianabol",
  "Proviron", "Mesterolone", "Halotestin", "Fluoxymesterone", 
  "Superdrol", "Methasterone", "Turinabol", "Chlorodehydromethyltestosterone",
  
  // Women's HRT - Estrogen
  "Estradiol", "Estradiol Valerate", "Estradiol Cypionate",
  "Estradiol Patch", "Estradiol Gel", "Estradiol Cream",
  
  // Women's HRT - Progesterone
  "Progesterone", "Micronized Progesterone", "Prometrium", 
  "Medroxyprogesterone", "Provera", "Norethindrone",
  
  // Women's HRT - Testosterone
  "Testosterone Cream", "Testosterone Pellets",
  
  // HGH & Growth Hormone
  "Somatropin", "HGH", "Genotropin", "Humatrope", "Norditropin",
  
  // Post-Cycle Therapy (PCT) & Ancillaries
  "Anastrozole", "Arimidex", "Letrozole", "Femara", "Exemestane", "Aromasin",
  "Clomiphene Citrate", "Clomid", "Tamoxifen", "Nolvadex",
  "Cabergoline", "Dostinex", "Pramipexole",
  "Finasteride", "Dutasteride",
  
  // Hair Loss Treatments
  "Minoxidil Oral", "Minoxidil Topical",
  
  // Performance & Cognitive Enhancement
  "Modafinil", "Armodafinil",
  
  // Injectable Vitamins & Supplements
  "L-Carnitine", "B12", "Methylcobalamin",
  "B-Complex Injectable",
  
  // Health & Metabolic
  "Metformin", "Berberine",
  "DHEA", "Pregnenolone",
  "Levothyroxine", "Synthroid", "Liothyronine", "Cytomel", "Armour Thyroid",
  "Low-dose Aspirin",
  "Atorvastatin", "Rosuvastatin",
  "Lisinopril", "Losartan", "Amlodipine", "Telmisartan",
  
  // Sexual Health / ED Medications
  "Cialis", "Tadalafil", "Viagra", "Sildenafil",
  
  // Blends and Stacks
  "Wolverine Stack", "GHK-Cu + BPC-157 Blend", "GLOW", "KLOW", "CJC-1295 / Ipamorelin",
  
  // SARMs (Selective Androgen Receptor Modulators)
  "LGD-4033", "Ligandrol", "RAD-140", "Testolone",
  "Ostarine", "MK-2866", "Enobosarm",
  "YK-11", "Andarine", "S4",
  
  // Fat Loss & Endurance
  "Clenbuterol", "Salbutamol", "Albuterol",
  "Cardarine", "GW-501516", "Stenabolic", "SR9009", "AICAR",
  
  // PCT - additional
  "Enclomiphene"
];

export const AddCompoundScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const swipeBack = useSwipeBack();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  
  // Check if we're editing an existing compound
  const editingCompound = location.state?.editingCompound;
  const prefillData = location.state?.prefillData;
  const isEditing = !!editingCompound;

  // Basic info
  const [name, setName] = useState("");
  const [showAutocomplete, setShowAutocomplete] = useState(false);

  // Dosage
  const [intendedDose, setIntendedDose] = useState("");
  const [doseUnit, setDoseUnit] = useState("mg");

  // Calculator state
  const [showCalculator, setShowCalculator] = useState(false);
  const [activeCalculator, setActiveCalculator] = useState<'iu' | 'ml' | 'iu-ml' | null>(null);
  const [vialSize, setVialSize] = useState("");
  const [vialUnit, setVialUnit] = useState("mg");
  const [bacWater, setBacWater] = useState("");
  const [isCustomVialSize, setIsCustomVialSize] = useState(false);
  const [isCustomBacWater, setIsCustomBacWater] = useState(false);

  // mL calculator (for oils/injections - mg/mL)
  const [concentration, setConcentration] = useState("");
  
  // IU/mL calculator (for pre-mixed IU-based compounds like HGH)
  const [iuConcentration, setIuConcentration] = useState("");

  // Weekly dose mode for oil-based compounds
  const [doseInputMode, setDoseInputMode] = useState<'per-injection' | 'weekly'>('per-injection');

  // Schedule
  const [frequency, setFrequency] = useState("Daily");
  const [customDays, setCustomDays] = useState<number[]>([]);
  const [everyXDays, setEveryXDays] = useState(3);
  const [timeOfDay, setTimeOfDay] = useState("Morning");
  const [customTime, setCustomTime] = useState("08:00");
  const [customTime2, setCustomTime2] = useState("20:00");
  const [numberOfDoses, setNumberOfDoses] = useState(1);
  
  // Twice Weekly: per-day times (keyed by day index)
  const [twiceWeeklyDay1, setTwiceWeeklyDay1] = useState<number>(1); // Monday
  const [twiceWeeklyDay2, setTwiceWeeklyDay2] = useState<number>(4); // Thursday
  const [twiceWeeklyTime1, setTwiceWeeklyTime1] = useState("08:00");
  const [twiceWeeklyTime2, setTwiceWeeklyTime2] = useState("20:00");
  
  // Weekly: single day selection
  const [weeklyDay, setWeeklyDay] = useState<number>(1); // Monday
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
  const [cycleOnTimeUnit, setCycleOnTimeUnit] = useState<'days' | 'weeks' | 'months'>('weeks');
  const [cycleOffTimeUnit, setCycleOffTimeUnit] = useState<'days' | 'weeks' | 'months'>('weeks');

  // Active status
  const [isActive, setIsActive] = useState(true);
  
  // Subscription checks
  const { 
    canAddCompound, 
    canEditCompound,
    isSubscribed,
    subscriptionStatus,
    markPreviewCompoundAdded,
    previewModeCompoundAdded,
    refreshFreeCompound,
    getCompoundCount,
  } = useSubscription();
  
  const { openPaywall } = usePaywall();
  
  const [canProceed, setCanProceed] = useState(false);
  const [showPreviewTimer, setShowPreviewTimer] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Past doses dialog state
  const [showPastDosesDialog, setShowPastDosesDialog] = useState(false);
  const [pendingCompoundId, setPendingCompoundId] = useState<string | null>(null);
  const [markingPastDoses, setMarkingPastDoses] = useState(false);
  
  // Notification permission dialog state (for first compound)
  const [showNotificationDialog, setShowNotificationDialog] = useState(false);
  const [savedCompoundName, setSavedCompoundName] = useState<string>("");

  // Check if user can add/edit compound and trigger preview timer
  // Use refs to prevent re-running checks
  const accessCheckedRef = useRef(false);
  
  // Reset refs on mount to ensure fresh check each time screen opens
  useEffect(() => {
    accessCheckedRef.current = false;
    setCanProceed(false);
  }, []);
  
  useEffect(() => {
    // If we've already checked access during THIS mount, don't re-check
    if (accessCheckedRef.current) {
      return;
    }
    
    if (isEditing) {
      // For editing: Use the centralized canEditCompound function
      const checkEditPermission = async () => {
        const allowed = await canEditCompound();
        console.log('[AddCompound] Can edit compound:', allowed, 'isSubscribed:', isSubscribed);
        
        if (!allowed) {
          accessCheckedRef.current = true;
          openPaywall({ 
            message: "Subscribe to edit your compounds and access all features",
            onDismiss: () => navigate(-1)
          });
          setCanProceed(false);
          setShowPreviewTimer(false);
        } else {
          setCanProceed(true);
          accessCheckedRef.current = true;
          // Start preview timer if not subscribed
          if (!isSubscribed && !previewModeCompoundAdded) {
            console.log('[AddCompound] Starting preview timer for edit');
            setShowPreviewTimer(true);
          }
        }
      };
      checkEditPermission();
    } else {
      // Adding new compound
      const checkAccess = async () => {
        const allowed = await canAddCompound();
        console.log('[AddCompound] Can add compound:', allowed, 'isSubscribed:', isSubscribed);
        
        if (!allowed) {
          accessCheckedRef.current = true; // Mark as checked to prevent re-triggers
          openPaywall({ 
            message: "Subscribe to add unlimited compounds and unlock all features",
            onDismiss: () => navigate(-1)
          });
          setCanProceed(false);
          setShowPreviewTimer(false);
        } else {
          setCanProceed(true);
          accessCheckedRef.current = true;
          // Start preview timer if not subscribed and haven't added preview compound yet
          if (!isSubscribed && !previewModeCompoundAdded) {
            console.log('[AddCompound] 🎯 Starting preview timer for new compound');
            setShowPreviewTimer(true);
          }
        }
      };
      checkAccess();
    }
  }, [isEditing, isSubscribed]);

  // Load existing compound data if editing
  useEffect(() => {
    if (editingCompound) {
      setName(editingCompound.name);
      // Round to avoid floating point display issues (e.g., 199.99999 showing as 199)
      const doseValue = Number(editingCompound.intended_dose);
      setIntendedDose(Number.isInteger(doseValue) ? doseValue.toString() : doseValue.toFixed(2).replace(/\.?0+$/, ''));
      setDoseUnit(editingCompound.dose_unit);
      
      // Handle schedule type - map lowercase (from onboarding) to display format
      let scheduleType = editingCompound.schedule_type;
      
      // Map lowercase schedule types from onboarding to display format
      const scheduleTypeMap: Record<string, string> = {
        'daily': 'Daily',
        'weekly': 'Weekly',
        'specific_days': 'Specific day(s)',
        'interval': 'Every X Days'
      };
      
      if (scheduleTypeMap[scheduleType]) {
        scheduleType = scheduleTypeMap[scheduleType];
      }
      
      const everyXDaysMatch = scheduleType.match(/Every (\d+) Days/);
      if (everyXDaysMatch) {
        setFrequency('Every X Days');
        setEveryXDays(parseInt(everyXDaysMatch[1]));
      } else {
        setFrequency(scheduleType);
      }
      
      // Load the saved times - handle array of times
      const times = editingCompound.time_of_day || ['08:00'];
      const days = editingCompound.schedule_days || [];
      
      // Handle Weekly and Twice Weekly schedule types
      if (scheduleType === 'Weekly') {
        // Weekly: single day, single time
        setCustomTime(times[0] || '08:00');
        if (days.length > 0) {
          const dayValue = typeof days[0] === 'string' ? parseInt(days[0]) : days[0];
          if (!isNaN(dayValue)) setWeeklyDay(dayValue);
        }
      } else if (scheduleType === 'Twice Weekly') {
        // Twice Weekly: two days with paired times
        setTwiceWeeklyTime1(times[0] || '08:00');
        setTwiceWeeklyTime2(times[1] || '20:00');
        if (days.length >= 2) {
          const day1 = typeof days[0] === 'string' ? parseInt(days[0]) : days[0];
          const day2 = typeof days[1] === 'string' ? parseInt(days[1]) : days[1];
          if (!isNaN(day1)) setTwiceWeeklyDay1(day1);
          if (!isNaN(day2)) setTwiceWeeklyDay2(day2);
        }
      } else {
        // Other schedule types: use numberOfDoses for times
        setNumberOfDoses(times.length);
        setCustomTime(times[0] || '08:00');
        setCustomTime2(times[1] || '20:00');
      }
      
      // Handle specific days - map full day names (from onboarding) to indices
      if (scheduleType === 'Specific day(s)' || scheduleType === 'Specific day of the week' ||
          editingCompound.schedule_type === 'specific_days') {
        const dayNameToIndex: Record<string, number> = {
          'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
          'Thursday': 4, 'Friday': 5, 'Saturday': 6
        };
        const parsedDays = days.map((d: string | number) => {
          // Handle full day names (from onboarding)
          if (typeof d === 'string' && dayNameToIndex[d] !== undefined) {
            return dayNameToIndex[d];
          }
          // Handle numeric strings or numbers
          return typeof d === 'string' ? parseInt(d) : d;
        }).filter((n: number) => !isNaN(n)) || [];
        setCustomDays(parsedDays);
      }
      setStartDate(editingCompound.start_date);
      setEndDate(editingCompound.end_date || "");
      setNotes(editingCompound.notes || "");
      setIsActive(editingCompound.is_active ?? true);
      
      if (editingCompound.has_cycles) {
        setEnableCycle(true);
        // Values are stored as DAYS in the database
        const daysOn = editingCompound.cycle_weeks_on || 7;
        const daysOff = editingCompound.cycle_weeks_off || 0;
        
        // Infer the best display unit from stored days
        const inferUnit = (days: number): { value: number; unit: 'days' | 'weeks' | 'months' } => {
          if (days >= 30 && days % 30 === 0) {
            return { value: days / 30, unit: 'months' };
          } else if (days >= 7 && days % 7 === 0) {
            return { value: days / 7, unit: 'weeks' };
          } else {
            return { value: days, unit: 'days' };
          }
        };
        
        const onPeriod = inferUnit(daysOn);
        setCycleOnTimeUnit(onPeriod.unit);
        setCycleWeeksOn(onPeriod.value);
        
        if (daysOff > 0) {
          setCycleMode('continuous');
          const offPeriod = inferUnit(daysOff);
          setCycleOffTimeUnit(offPeriod.unit);
          setCycleWeeksOff(offPeriod.value);
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
    
    // Handle prefillData from calculator modal
    if (prefillData && !editingCompound) {
      console.log('[AddCompound] Prefilling from calculator:', prefillData);
      
      if (prefillData.intendedDose) {
        setIntendedDose(prefillData.intendedDose.toString());
      }
      if (prefillData.doseUnit) {
        setDoseUnit(prefillData.doseUnit);
      }
      
      // Peptide calculator data (reconstitution)
      if (prefillData.vialSize) {
        setActiveCalculator('iu');
        setVialSize(prefillData.vialSize.toString());
        setVialUnit(prefillData.vialUnit || 'mg');
        if (prefillData.bacWater) {
          setBacWater(prefillData.bacWater.toString());
        }
      }
      
      // Oil-based calculator data (mL)
      if (prefillData.concentration) {
        setActiveCalculator('ml');
        setConcentration(prefillData.concentration.toString());
        setDoseUnit('mg');
      }
    }
  }, []);

  // Auto-show mL calculator when switching to weekly mode for oil-based compounds
  useEffect(() => {
    if (doseInputMode === 'weekly' && isOilBasedCompound(name) && doseUnit === 'mg') {
      setActiveCalculator('ml');
    }
  }, [doseInputMode]);

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

  // Calculate mL needed for IU-based compounds (like HGH)
  // Formula: mL = Dose (IU) / Concentration (IU/mL)
  const calculateIUtoML = () => {
    if (!iuConcentration || !intendedDose) return null;
    
    const concentrationNum = parseFloat(iuConcentration);
    const doseNum = parseFloat(intendedDose);
    
    // Validate inputs
    if (isNaN(concentrationNum) || isNaN(doseNum) || 
        concentrationNum <= 0 || doseNum <= 0) {
      return null;
    }
    
    // Formula: mL needed = dose (IU) / concentration (IU/mL)
    const mlNeeded = doseNum / concentrationNum;
    
    // Validate result
    if (mlNeeded <= 0 || !isFinite(mlNeeded)) {
      return null;
    }
    
    // Round to 2 decimal places
    return parseFloat(mlNeeded.toFixed(2)).toString();
  };

  const calculatedIUtoML = activeCalculator === 'iu-ml' && doseUnit === 'iu' ? calculateIUtoML() : null;

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
  
  // Validation for IU to mL calculator
  const getIUtoMLWarning = () => {
    if (!calculatedIUtoML) return null;
    const ml = parseFloat(calculatedIUtoML);
    
    if (isNaN(ml) || ml <= 0) return "❌ Invalid calculation";
    if (ml > 1) return "⚠️ Large volume - verify your concentration";
    if (ml < 0.05) return "⚠️ Very small volume - difficult to measure accurately";
    
    return null;
  };

  const getMLWarning = () => {
    if (!calculatedML) return null;
    const ml = parseFloat(calculatedML);
    
    if (isNaN(ml) || ml <= 0) return "❌ Invalid calculation";
    if (ml > 3) return "⚠️ Large volume - verify your concentration";
    if (ml < 0.1) return "⚠️ Very small volume - difficult to measure accurately";
    
    return null;
  };

  // Check if compound is oil-based (for weekly dose calculator)
  const isOilBasedCompound = (compoundName: string): boolean => {
    const nameLower = compoundName.toLowerCase().trim();
    
    // Don't match empty or very short strings
    if (!nameLower || nameLower.length < 3) return false;
    
    return OIL_BASED_COMPOUNDS.some(oil => 
      nameLower.includes(oil.toLowerCase()) || 
      oil.toLowerCase().includes(nameLower)
    );
  };

  // Calculate injections per week based on schedule
  const calculateInjectionsPerWeek = (): number | null => {
    if (frequency === 'As Needed') return null;
    if (frequency === 'Daily') return 7 * numberOfDoses;
    if (frequency === 'Weekly') return 1; // 1 injection per week
    if (frequency === 'Twice Weekly') return 2; // 2 injections per week
    if (frequency === 'Specific day(s)') {
      return (customDays.length || 0) * numberOfDoses;
    }
    if (frequency === 'Every X Days') {
      return (7 / everyXDays) * numberOfDoses;
    }
    return numberOfDoses;
  };

  // Get the schedule_type for database storage
  const getScheduleTypeForSave = (): string => {
    if (frequency === 'Every X Days') return `Every ${everyXDays} Days`;
    // Weekly and Twice Weekly store as their frequency name (new schedule types)
    return frequency;
  };

  // Get the time_of_day array for database storage
  const getTimeOfDayForSave = (): string[] => {
    if (frequency === 'Weekly') {
      return [customTime];
    }
    if (frequency === 'Twice Weekly') {
      // For Twice Weekly, times are paired by array index with schedule_days
      return [twiceWeeklyTime1, twiceWeeklyTime2];
    }
    if (numberOfDoses === 2) {
      return [customTime, customTime2];
    }
    return [customTime];
  };

  // Get the schedule_days array for database storage
  const getScheduleDaysForSave = (): string[] | null => {
    if (frequency === 'Weekly') {
      return [String(weeklyDay)];
    }
    if (frequency === 'Twice Weekly') {
      // Days are paired by array index with time_of_day
      return [String(twiceWeeklyDay1), String(twiceWeeklyDay2)];
    }
    if (frequency === 'Specific day(s)') {
      return customDays.map(String);
    }
    return null;
  };

  // Calculate per-dose values from weekly total (reads from intendedDose when in weekly mode)
  const calculateFromWeekly = (): { mgPerInjection: number; mlPerInjection: number; injectionsPerWeek: number } | null => {
    const weekly = parseFloat(intendedDose); // In weekly mode, intendedDose IS the weekly dose
    const conc = parseFloat(concentration);
    const injectionsPerWeek = calculateInjectionsPerWeek();
    
    if (!weekly || !conc || !injectionsPerWeek || injectionsPerWeek <= 0) return null;
    
    const mgPerInjection = weekly / injectionsPerWeek;
    const mlPerInjection = mgPerInjection / conc;
    
    // Validate results
    if (!isFinite(mgPerInjection) || !isFinite(mlPerInjection) || mgPerInjection <= 0 || mlPerInjection <= 0) {
      return null;
    }
    
    return {
      mgPerInjection: Math.round(mgPerInjection), // Round to whole number
      mlPerInjection: Math.round(mlPerInjection * 100) / 100, // Round to nearest 0.01 for insulin syringe precision
      injectionsPerWeek
    };
  };

  // Format injections per week for display
  const formatInjectionsPerWeek = (count: number): string => {
    if (Number.isInteger(count)) return `${count}x/week`;
    return `~${count.toFixed(1)}x/week`;
  };

  // Get schedule description for weekly calculator
  const getScheduleDescription = (): string => {
    if (frequency === 'Daily') return `Daily (${formatInjectionsPerWeek(7 * numberOfDoses)})`;
    if (frequency === 'Weekly') return `Weekly (1x/week)`;
    if (frequency === 'Twice Weekly') return `Twice weekly (2x/week)`;
    if (frequency === 'Specific day(s)') {
      const dayCount = customDays.length;
      if (dayCount === 0) return 'No days selected';
      return `${dayCount} day${dayCount > 1 ? 's' : ''}/week (${formatInjectionsPerWeek(dayCount * numberOfDoses)})`;
    }
    if (frequency === 'Every X Days') {
      return `Every ${everyXDays} days (${formatInjectionsPerWeek((7 / everyXDays) * numberOfDoses)})`;
    }
    return 'Set schedule below';
  };

  // Warning for weekly calculation results
  const getWeeklyCalcWarning = () => {
    const result = calculateFromWeekly();
    if (!result) return null;
    
    if (result.mlPerInjection > 2) return "⚠️ Large injection volume";
    if (result.mlPerInjection < 0.1) return "⚠️ Very small volume - verify measurement";
    return null;
  };

  // Get the final intended dose for saving (converts weekly to per-injection if needed)
  const getFinalIntendedDose = (): number => {
    if (doseInputMode === 'weekly' && isOilBasedCompound(name) && doseUnit === 'mg') {
      const result = calculateFromWeekly();
      if (result) {
        return result.mgPerInjection;
      }
    }
    return parseFloat(intendedDose);
  };

  // Get the final calculated mL for saving (uses per-injection value in weekly mode)
  const getFinalCalculatedML = (): number | null => {
    if (doseInputMode === 'weekly' && isOilBasedCompound(name) && doseUnit === 'mg') {
      const result = calculateFromWeekly();
      if (result) {
        return result.mlPerInjection;
      }
    }
    // Fall back to standard calculatedML for per-injection mode
    if (calculatedML) {
      return parseFloat(calculatedML);
    }
    return null;
  };

  const filteredPeptides = Array.from(new Set(COMMON_PEPTIDES))
    .filter(p => p.toLowerCase().includes(name.toLowerCase()))
    .sort((a, b) => {
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

  const generateDoses = (compoundId: string, userId: string, includesPast: boolean = false) => {
    const doses = [];
    // Parse date in local timezone
    const start = createLocalDate(startDate);
    if (!start) {
      console.error('Invalid start date');
      return doses;
    }
    
    // Don't generate doses for "As Needed"
    if (frequency === 'As Needed') {
      return doses;
    }
    
    // For editing with past start dates, include past doses if requested
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const effectiveStart = includesPast ? start : (start > today ? start : today);
    
    // Calculate end boundary (60 days from today or user-specified end date, whichever is sooner)
    const maxDays = 60;
    let daysToGenerate: number;
    
    if (includesPast && start < today) {
      // For past dates, calculate days from start to today + 60 days forward
      const totalDays = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + maxDays;
      daysToGenerate = totalDays;
    } else {
      daysToGenerate = maxDays;
    }
    
    if (endDate) {
      const end = createLocalDate(endDate);
      if (end) {
        const daysDiff = Math.floor((end.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24));
        daysToGenerate = Math.min(daysToGenerate, Math.max(0, daysDiff + 1));
      }
    }
    
    for (let i = 0; i < daysToGenerate; i++) {
      const date = new Date(effectiveStart);
      date.setDate(date.getDate() + i);
      const dayOfWeek = date.getDay(); // 0=Sunday, 1=Monday, etc.
      
      // Calculate days since ORIGINAL start date (not effective start) for schedule calculations
      const daysSinceOriginalStart = Math.floor((date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      
      // Check if should generate based on frequency
      if (frequency === 'Weekly') {
        // Weekly: generate only on the selected day
        if (dayOfWeek !== weeklyDay) {
          continue;
        }
      } else if (frequency === 'Twice Weekly') {
        // Twice Weekly: generate only on the two selected days
        if (dayOfWeek !== twiceWeeklyDay1 && dayOfWeek !== twiceWeeklyDay2) {
          continue;
        }
      } else if (frequency === 'Specific day(s)') {
        if (!customDays.includes(dayOfWeek)) {
          continue;
        }
      }
      
      // For "Every X Days", use days since ORIGINAL start to maintain schedule continuity
      if (frequency === 'Every X Days' && daysSinceOriginalStart % everyXDays !== 0) {
        continue;
      }

      // Check cycle logic - skip if in "off" period
      // Note: cycleWeeksOn/Off are in UI units, need to convert to days for calculation
      if (enableCycle && cycleMode === 'continuous') {
        // Calculate days since original start date (not effective start)
        const daysSinceStart = Math.floor((date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        // Convert UI values to days: days=1, weeks=7, months=30 (separate units for on/off)
        const onUnitMultiplier = cycleOnTimeUnit === 'days' ? 1 : cycleOnTimeUnit === 'months' ? 30 : 7;
        const offUnitMultiplier = cycleOffTimeUnit === 'days' ? 1 : cycleOffTimeUnit === 'months' ? 30 : 7;
        const onPeriodDays = Math.round(cycleWeeksOn * onUnitMultiplier);
        const offPeriodDays = Math.round(cycleWeeksOff * offUnitMultiplier);
        const cycleLength = onPeriodDays + offPeriodDays;
        const positionInCycle = daysSinceStart % cycleLength;
        
        // Skip if we're in the "off" period
        if (positionInCycle >= onPeriodDays) {
          continue;
        }
      } else if (enableCycle && cycleMode === 'one-time') {
        // For one-time cycles, only generate for the "on" period
        const onUnitMultiplier = cycleOnTimeUnit === 'days' ? 1 : cycleOnTimeUnit === 'months' ? 30 : 7;
        const onPeriodDays = Math.round(cycleWeeksOn * onUnitMultiplier);
        const daysSinceStart = Math.floor((date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceStart >= onPeriodDays) {
          continue;
        }
      }

      let currentDose = getFinalIntendedDose();

      // Generate doses based on frequency type
      let timesToGenerate: string[] = [];
      
      if (frequency === 'Twice Weekly') {
        // For Twice Weekly, use the day-specific time
        if (dayOfWeek === twiceWeeklyDay1) {
          timesToGenerate = [twiceWeeklyTime1];
        } else if (dayOfWeek === twiceWeeklyDay2) {
          timesToGenerate = [twiceWeeklyTime2];
        }
      } else if (frequency === 'Weekly') {
        timesToGenerate = [customTime];
      } else if (numberOfDoses === 2) {
        timesToGenerate = [customTime, customTime2];
      } else {
        timesToGenerate = [customTime];
      }

      timesToGenerate.forEach(time => {
        doses.push({
          compound_id: compoundId,
          user_id: userId,
          scheduled_date: formatDate(date),
          scheduled_time: time,
          dose_amount: currentDose,
          dose_unit: doseUnit,
          calculated_iu: displayIU ? parseFloat(displayIU) : null,
          calculated_ml: getFinalCalculatedML(),
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

  const handleDelete = async () => {
    if (!editingCompound) return;
    
    setDeleting(true);
    try {
      // Soft delete - set is_active to false
      // This preserves dose history for the user's records
      const { error: compoundError } = await supabase
        .from('compounds')
        .update({ is_active: false })
        .eq('id', editingCompound.id);

      if (compoundError) throw compoundError;

      // Delete future untaken doses to prevent orphans showing on Today screen
      const todayStr = new Date().toISOString().split('T')[0];
      await supabase
        .from('doses')
        .delete()
        .eq('compound_id', editingCompound.id)
        .eq('taken', false)
        .eq('skipped', false)
        .gte('scheduled_date', todayStr);

      triggerHaptic('medium');
      trackCompoundDeleted(name);
      toast({
        title: "Compound removed",
        description: `${name} has been removed from your stack. Dose history preserved.`
      });
      navigate('/stack');
    } catch (error) {
      console.error('Error removing compound:', error);
      toast({
        title: "Error",
        description: "Failed to remove compound",
        variant: "destructive"
      });
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  // Helper function to schedule notifications in background
  const scheduleNotificationsInBackground = (userId: string) => {
    supabase
      .from('doses')
      .select('*, compounds(name, is_active, has_cycles, cycle_weeks_on, cycle_weeks_off, start_date)')
      .eq('user_id', userId)
      .eq('taken', false)
      .then(({ data: allDoses }) => {
        if (allDoses) {
          const activeDoses = allDoses.filter(dose => {
            if (dose.compounds?.is_active === false) return false;
            if (dose.compounds?.has_cycles && dose.compounds?.cycle_weeks_on) {
              const startDateObj = new Date(dose.compounds.start_date + 'T00:00:00');
              const doseDate = new Date(dose.scheduled_date + 'T00:00:00');
              const daysSinceStart = Math.floor((doseDate.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24));
              // Values are stored as DAYS in the database
              const daysOn = dose.compounds.cycle_weeks_on;
              if (dose.compounds.cycle_weeks_off) {
                const daysOff = dose.compounds.cycle_weeks_off;
                const cycleLength = daysOn + daysOff;
                const positionInCycle = daysSinceStart % cycleLength;
                if (positionInCycle >= daysOn) return false;
              } else if (daysSinceStart >= daysOn) return false;
            }
            return true;
          });
          const dosesWithCompoundName = activeDoses.map(dose => ({
            ...dose,
            compound_name: dose.compounds?.name || 'Medication'
          }));
          scheduleAllUpcomingDoses(dosesWithCompoundName, isSubscribed);
          // Note: No freeCompoundId filtering here — user just added/edited a compound,
          // and the newly saved compound is always active. On next app resume, 
          // useAppStateSync will apply the proper gating.
        }
      });
  };

  // Check if this is user's first compound (for notification prompt)
  const checkIsFirstCompound = async (userId: string): Promise<boolean> => {
    const { count } = await supabase
      .from('compounds')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_active', true);
    return count === 1; // Just saved the first one
  };

  // Check if notification permission was already asked
  const checkNotificationPermissionAsked = async (userId: string): Promise<boolean> => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('notification_permission_asked')
      .eq('user_id', userId)
      .single();
    return profile?.notification_permission_asked === true;
  };

  // Handle notification permission response
  const handleNotificationResponse = async (accepted: boolean) => {
    setShowNotificationDialog(false);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Mark permission as asked
      await supabase
        .from('profiles')
        .update({ notification_permission_asked: true })
        .eq('user_id', user.id);

      if (accepted && Capacitor.isNativePlatform()) {
        const permission = await LocalNotifications.requestPermissions();
        if (permission.display === 'granted') {
          toast({
            title: "Notifications enabled",
            description: "You'll get reminders for your doses",
          });
          // Schedule notifications now
          scheduleNotificationsInBackground(user.id);
        }
      }
    } catch (error) {
      console.error('[Notification] Error:', error);
    }

    navigate('/today');
  };

  // Handle marking all past doses as taken
  const handleMarkPastDosesTaken = async () => {
    if (!pendingCompoundId) return;
    
    setMarkingPastDoses(true);
    try {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      
      // First, fetch all past doses for this compound
      const { data: pastDoses, error: fetchError } = await supabase
        .from('doses')
        .select('id, scheduled_date, scheduled_time')
        .eq('compound_id', pendingCompoundId)
        .lt('scheduled_date', todayStr);
      
      if (fetchError) throw fetchError;
      
      // Update each dose with taken_at set to its scheduled date/time
      if (pastDoses && pastDoses.length > 0) {
        for (const dose of pastDoses) {
          // Convert scheduled time to hours/minutes
          let hours = 8, minutes = 0;
          const scheduledTime = dose.scheduled_time;
          if (scheduledTime === 'Morning') { hours = 8; minutes = 0; }
          else if (scheduledTime === 'Afternoon') { hours = 14; minutes = 0; }
          else if (scheduledTime === 'Evening') { hours = 18; minutes = 0; }
          else {
            const timeMatch = scheduledTime.match(/^(\d{1,2}):(\d{2})$/);
            if (timeMatch) {
              hours = parseInt(timeMatch[1]);
              minutes = parseInt(timeMatch[2]);
            }
          }
          
          // Create taken_at timestamp from scheduled date and time
          const takenDate = new Date(dose.scheduled_date + 'T00:00:00');
          takenDate.setHours(hours, minutes, 0, 0);
          const takenAtTimestamp = takenDate.toISOString();
          
          const { error: updateError } = await supabase
            .from('doses')
            .update({ taken: true, taken_at: takenAtTimestamp })
            .eq('id', dose.id);
          
          if (updateError) throw updateError;
        }
      }
      
      toast({
        title: "Past doses marked",
        description: "All previous doses have been marked as taken",
      });
    } catch (error) {
      console.error('Error marking past doses:', error);
      toast({
        title: "Error",
        description: "Failed to mark past doses as taken",
        variant: "destructive"
      });
    } finally {
      setMarkingPastDoses(false);
      setShowPastDosesDialog(false);
      setPendingCompoundId(null);
      
      // Get user and schedule notifications
      const { data: { user } } = await supabase.auth.getUser();
      if (user) scheduleNotificationsInBackground(user.id);
      
      navigate('/today');
    }
  };

  // Handle skipping past doses marking
  const handleSkipPastDoses = async () => {
    setShowPastDosesDialog(false);
    setPendingCompoundId(null);
    
    // Get user and schedule notifications
    const { data: { user } } = await supabase.auth.getUser();
    if (user) scheduleNotificationsInBackground(user.id);
    
    navigate('/today');
  };

  const handleSave = async () => {
    // Immediately block double-taps to prevent duplicate entries
    if (saving) return;
    setSaving(true);

    if (!name || !intendedDose) {
      toast({
        title: "Missing fields",
        description: "Please enter compound name and dose",
        variant: "destructive"
      });
      setSaving(false); // Reset on validation failure
      return;
    }

    // Debug logging
    console.log('Saving compound with schedule:', {
      frequency,
      customDays,
      schedule_days: frequency === 'Specific day(s)' || frequency === 'Weekly' || frequency === 'Twice Weekly' ? customDays : null
    });
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
            intended_dose: getFinalIntendedDose(),
            dose_unit: doseUnit,
            calculated_iu: displayIU ? parseFloat(displayIU) : null,
            calculated_ml: getFinalCalculatedML(),
            concentration: concentration ? parseFloat(concentration) : null,
            schedule_type: getScheduleTypeForSave(),
            time_of_day: getTimeOfDayForSave(),
            schedule_days: getScheduleDaysForSave(),
            start_date: startDate,
            end_date: endDate || null,
            notes: notes || null,
        has_cycles: enableCycle,
        // Store cycle duration in DAYS for consistent handling (separate units for on/off)
        cycle_weeks_on: enableCycle ? (cycleOnTimeUnit === 'days' ? cycleWeeksOn : cycleOnTimeUnit === 'months' ? cycleWeeksOn * 30 : cycleWeeksOn * 7) : null,
        cycle_weeks_off: enableCycle && cycleMode === 'continuous' ? (cycleOffTimeUnit === 'days' ? cycleWeeksOff : cycleOffTimeUnit === 'months' ? cycleWeeksOff * 30 : cycleWeeksOff * 7) : null,
        cycle_reminders_enabled: enableCycle ? cycleReminders : false,
            is_active: isActive
          })
          .eq('id', editingCompound.id);

        if (updateError) throw updateError;

        // Check if start date was moved earlier
        const originalStartDate = createLocalDate(editingCompound.start_date);
        const newStartDate = createLocalDate(startDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startDateMovedEarlier = originalStartDate && newStartDate && newStartDate < originalStartDate;

        // Delete only FUTURE untaken doses (preserve taken/skipped doses)
        const todayStr = formatDate(today);
        const { error: deleteError } = await supabase
          .from('doses')
          .delete()
          .eq('compound_id', editingCompound.id)
          .gte('scheduled_date', todayStr)
          .eq('taken', false)
          .eq('skipped', false);

        if (deleteError) throw deleteError;

        // If start date moved earlier, also delete any untaken past doses from the new start date
        // (so we can regenerate them with correct schedule)
        if (startDateMovedEarlier && newStartDate) {
          const newStartStr = formatDate(newStartDate);
          const { error: pastDeleteError } = await supabase
            .from('doses')
            .delete()
            .eq('compound_id', editingCompound.id)
            .gte('scheduled_date', newStartStr)
            .lt('scheduled_date', todayStr)
            .eq('taken', false)
            .eq('skipped', false);
          
          if (pastDeleteError) throw pastDeleteError;
        }

        // Generate new doses - include past dates if start date was moved earlier
        const includePast = startDateMovedEarlier && newStartDate && newStartDate < today;
        const doses = generateDoses(editingCompound.id, user.id, includePast);
        
        // Check if we have new past doses that were just created
        const hasPastDoses = includePast && doses.some(d => d.scheduled_date < todayStr);
        
        if (doses.length > 0) {
          const { error: dosesUpdateError } = await supabase
            .from('doses')
            .insert(doses);

          if (dosesUpdateError) throw dosesUpdateError;
        }

        // Success haptic
        triggerHaptic('medium');
        trackCompoundEdited(name);
        
        // If we created new past doses, show the bulk-mark dialog
        if (hasPastDoses) {
          setPendingCompoundId(editingCompound.id);
          setShowPastDosesDialog(true);
          return; // Don't navigate yet - dialog will handle it
        }
        
        navigate("/stack");

        // Reschedule notifications in background (non-blocking) - only for active compounds
        supabase
          .from('doses')
          .select('*, compounds(name, is_active, has_cycles, cycle_weeks_on, cycle_weeks_off, start_date)')
          .eq('user_id', user.id)
          .eq('taken', false)
          .then(({ data: allDoses }) => {
            if (allDoses) {
              // Filter active compounds and non-off-cycle doses
              const activeDoses = allDoses.filter(dose => {
                if (dose.compounds?.is_active === false) return false;
                if (dose.compounds?.has_cycles && dose.compounds?.cycle_weeks_on) {
                  const startDateObj = new Date(dose.compounds.start_date + 'T00:00:00');
                  const doseDate = new Date(dose.scheduled_date + 'T00:00:00');
                  const daysSinceStart = Math.floor((doseDate.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24));
                  // Values are stored as DAYS in the database
                  const daysOn = dose.compounds.cycle_weeks_on;
                  if (dose.compounds.cycle_weeks_off) {
                    const daysOff = dose.compounds.cycle_weeks_off;
                    const cycleLength = daysOn + daysOff;
                    const positionInCycle = daysSinceStart % cycleLength;
                    if (positionInCycle >= daysOn) return false;
                  } else if (daysSinceStart >= daysOn) return false;
                }
                return true;
              });
              const dosesWithCompoundName = activeDoses.map(dose => ({
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
              // Pass days directly (already converted, using separate units)
              cycle_weeks_on: cycleOnTimeUnit === 'days' ? cycleWeeksOn : cycleOnTimeUnit === 'months' ? cycleWeeksOn * 30 : cycleWeeksOn * 7,
              cycle_weeks_off: cycleMode === 'continuous' ? (cycleOffTimeUnit === 'days' ? cycleWeeksOff : cycleOffTimeUnit === 'months' ? cycleWeeksOff * 30 : cycleWeeksOff * 7) : null,
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
            intended_dose: getFinalIntendedDose(),
            dose_unit: doseUnit,
          calculated_iu: displayIU ? parseFloat(displayIU) : null,
            calculated_ml: getFinalCalculatedML(),
            concentration: concentration ? parseFloat(concentration) : null,
            schedule_type: getScheduleTypeForSave(),
            time_of_day: getTimeOfDayForSave(),
            schedule_days: getScheduleDaysForSave(),
            start_date: startDate,
            end_date: endDate || null,
            notes: notes || null,
            has_cycles: enableCycle,
            // Store cycle duration in DAYS for consistent handling (separate units for on/off)
            cycle_weeks_on: enableCycle ? (cycleOnTimeUnit === 'days' ? cycleWeeksOn : cycleOnTimeUnit === 'months' ? cycleWeeksOn * 30 : cycleWeeksOn * 7) : null,
            cycle_weeks_off: enableCycle && cycleMode === 'continuous' ? (cycleOffTimeUnit === 'days' ? cycleWeeksOff : cycleOffTimeUnit === 'months' ? cycleWeeksOff * 30 : cycleWeeksOff * 7) : null,
            is_active: isActive
          }])
          .select()
          .single();

        if (compoundError) throw compoundError;

        // Generate doses - include past dates if start date is in the past
        const startDateObj = createLocalDate(startDate);
        const todayObj = new Date();
        todayObj.setHours(0, 0, 0, 0);
        const shouldIncludePast = startDateObj && startDateObj < todayObj;
        const doses = generateDoses(compound.id, user.id, shouldIncludePast);
        const { error: dosesError } = await supabase
          .from('doses')
          .insert(doses);

        if (dosesError) throw dosesError;

        // Mark preview compound as added for non-subscribers
        if (!isSubscribed) {
          console.log('[AddCompound] ✅ Marking preview compound as added');
          await markPreviewCompoundAdded();
        }

        // Refresh free compound ID so lock state updates immediately
        refreshFreeCompound();

        // Cancel "add your first compound" nudge notifications
        cancelCompoundNudges();

        // If trial user just added their first compound, schedule "add more" encouragement
        // If they already have 1+ and are adding a 2nd, cancel the encouragement
        if (subscriptionStatus === 'trialing') {
          const count = await getCompoundCount();
          if (count === 1) {
            // Just added their first compound on trial
            scheduleAddMoreEncouragement();
          } else if (count >= 2) {
            // Adding 2nd+ compound - cancel encouragement
            cancelAddMoreEncouragement();
          }
        }

        // Schedule cycle reminders if enabled
        if (enableCycle) {
          // Track cycle enabled analytics (convert to weeks for consistency in analytics)
          const weeksOnValue = cycleOnTimeUnit === 'months' ? cycleWeeksOn * 4 : cycleOnTimeUnit === 'days' ? cycleWeeksOn / 7 : cycleWeeksOn;
          const weeksOffValue = cycleMode === 'continuous' ? (cycleOffTimeUnit === 'months' ? cycleWeeksOff * 4 : cycleOffTimeUnit === 'days' ? cycleWeeksOff / 7 : cycleWeeksOff) : null;
          trackCycleEnabled(name, weeksOnValue, weeksOffValue);
          
          const cycleRemindersEnabled = localStorage.getItem('cycleReminders') !== 'false';
          if (cycleRemindersEnabled) {
          scheduleCycleReminders({
              id: compound.id,
              name,
              start_date: startDate,
              cycle_weeks_on: weeksOnValue,
              cycle_weeks_off: weeksOffValue,
              has_cycles: true,
              cycle_reminders_enabled: true
            });
          }
        }
        
        // If there are past doses, show dialog to ask user if they want to mark them as taken
        if (shouldIncludePast) {
          setPendingCompoundId(compound.id);
          setShowPastDosesDialog(true);
          triggerHaptic('medium');
          trackCompoundAdded(name, frequency === 'Every X Days' ? `Every ${everyXDays} Days` : frequency);
          if (activeCalculator === 'iu') trackCalculatorUsed('iu');
          if (activeCalculator === 'ml') trackCalculatorUsed('ml');
          // Don't navigate yet - wait for dialog response
          return;
        }
      }

      // Success haptic
      triggerHaptic('medium');
      trackCompoundAdded(name, frequency === 'Every X Days' ? `Every ${everyXDays} Days` : frequency);
      
      // Track calculator usage if used
      if (activeCalculator === 'iu') trackCalculatorUsed('iu');
      if (activeCalculator === 'ml') trackCalculatorUsed('ml');
      
      // Track first compound added (fires ONCE per user lifetime)
      const firstCompoundKey = 'regimen_first_compound_tracked';
      if (!localStorage.getItem(firstCompoundKey) && !isEditing) {
        try {
          // Get profile for signup timestamp
          const { data: profile } = await supabase
            .from('profiles')
            .select('created_at')
            .eq('user_id', user.id)
            .single();
          
          if (profile?.created_at) {
            const signupTime = new Date(profile.created_at).getTime();
            const now = Date.now();
            const hoursSinceSignup = Math.round((now - signupTime) / (1000 * 60 * 60));
            
            // Fire analytics event
            trackFirstCompoundAdded({ timeSinceSignupHours: hoursSinceSignup, userId: user.id });
            
            // Update profile with timestamp
            await supabase
              .from('profiles')
              .update({ first_compound_added_at: new Date().toISOString() })
              .eq('user_id', user.id);
            
            // Set flag to prevent duplicate events
            localStorage.setItem(firstCompoundKey, 'true');
            console.log('[AddCompound] Tracked first compound added');
          }
        } catch (err) {
          console.error('[AddCompound] Error tracking first compound:', err);
        }
      }
      
      // Check if this is first compound and notification permission wasn't asked
      const isFirstCompound = await checkIsFirstCompound(user.id);
      const permissionAsked = await checkNotificationPermissionAsked(user.id);
      
      if (isFirstCompound && !permissionAsked && !isEditing) {
        // Show notification permission dialog
        setSavedCompoundName(name);
        setShowNotificationDialog(true);
        return; // Dialog will handle navigation
      }
      
      navigate('/today');

      // Schedule notifications in background (non-blocking) - only for active compounds
      scheduleNotificationsInBackground(user.id);
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
    <div className="flex h-screen flex-col bg-background">
      
      {/* Header */}
      <header className="border-b border-border px-4 flex-shrink-0" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/stack")}
              className="rounded-lg p-2 hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-bold">{isEditing ? 'Edit Compound' : 'Add Compound'}</h1>
          </div>
          {/* Spacer to balance header */}
          <div className="w-9" />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto pb-32">
        <div className="space-y-6 p-4 max-w-2xl mx-auto">
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
                      triggerHaptic('light');
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

          {/* Mode Toggle - only for oil-based compounds with mg unit */}
          {isOilBasedCompound(name) && doseUnit === 'mg' && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Enter your dose as</Label>
              <SegmentedControl
                options={[
                  { value: 'per-injection' as const, label: 'Per Injection' },
                  { value: 'weekly' as const, label: 'Weekly Total' }
                ]}
                value={doseInputMode}
                onChange={(val) => setDoseInputMode(val as 'per-injection' | 'weekly')}
                className="w-full"
                size="sm"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="intendedDose">
              {doseInputMode === 'weekly' && isOilBasedCompound(name) && doseUnit === 'mg' 
                ? 'Weekly Dose' 
                : 'Dose Amount'} <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-3">
              <Input
                id="intendedDose"
                type="number"
                value={intendedDose}
                onChange={(e) => setIntendedDose(e.target.value)}
                placeholder={doseInputMode === 'weekly' && isOilBasedCompound(name) ? "e.g., 200" : "Enter amount"}
                className="text-lg h-12 flex-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <select
                id="unit"
                value={doseUnit}
                onChange={(e) => {
                  setDoseUnit(e.target.value);
                  // Reset to per-injection mode when switching away from mg
                  if (e.target.value !== 'mg') {
                    setDoseInputMode('per-injection');
                  }
                }}
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
            {doseInputMode === 'weekly' && isOilBasedCompound(name) && doseUnit === 'mg' && (
              <p className="text-xs text-muted-foreground">
                Enter your total weekly dose (e.g., 200mg/week)
              </p>
            )}
          </div>

          {/* Calculator Cards - styled and prominent */}
          {/* Reconstitution Calculator for mcg doses */}
          {doseUnit === 'mcg' && (
            <button
              onClick={() => {
                triggerHaptic('light');
                setActiveCalculator(activeCalculator === 'iu' ? null : 'iu');
              }}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left",
                activeCalculator === 'iu' 
                  ? "bg-primary/10 border-primary/30" 
                  : "bg-muted/50 border-border hover:bg-muted"
              )}
            >
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Calculator className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm">Reconstitution Calculator</div>
                <div className="text-xs text-muted-foreground">Calculate units to draw on your syringe</div>
              </div>
              <span className="text-primary text-sm font-medium">
                {activeCalculator === 'iu' ? '−' : '+'}
              </span>
            </button>
          )}

          {doseUnit === 'mg' && (
            <>
              {/* Reconstitution Calculator for non-oil-based mg compounds */}
              {!isOilBasedCompound(name) && (
                <button
                  onClick={() => {
                    triggerHaptic('light');
                    setActiveCalculator(activeCalculator === 'iu' ? null : 'iu');
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left",
                    activeCalculator === 'iu' 
                      ? "bg-primary/10 border-primary/30" 
                      : "bg-muted/50 border-border hover:bg-muted"
                  )}
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Calculator className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">Reconstitution Calculator</div>
                    <div className="text-xs text-muted-foreground">Calculate units to draw on your syringe</div>
                  </div>
                  <span className="text-primary text-sm font-medium">
                    {activeCalculator === 'iu' ? '−' : '+'}
                  </span>
                </button>
              )}
              
              {/* mL Calculator for oil-based compounds */}
              {isOilBasedCompound(name) && (
                <button
                  onClick={() => {
                    triggerHaptic('light');
                    setActiveCalculator(activeCalculator === 'ml' ? null : 'ml');
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left",
                    activeCalculator === 'ml' 
                      ? "bg-primary/10 border-primary/30" 
                      : "bg-muted/50 border-border hover:bg-muted"
                  )}
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Calculator className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">mL Calculator</div>
                    <div className="text-xs text-muted-foreground">Calculate volume to inject from concentration</div>
                  </div>
                  <span className="text-primary text-sm font-medium">
                    {activeCalculator === 'ml' ? '−' : '+'}
                  </span>
                </button>
              )}
            </>
          )}

          {/* IU/mL Calculator for IU-based compounds like HGH */}
          {doseUnit === 'iu' && (
            <button
              onClick={() => {
                triggerHaptic('light');
                setActiveCalculator(activeCalculator === 'iu-ml' ? null : 'iu-ml');
              }}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left",
                activeCalculator === 'iu-ml' 
                  ? "bg-primary/10 border-primary/30" 
                  : "bg-muted/50 border-border hover:bg-muted"
              )}
            >
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Calculator className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm">mL Calculator</div>
                <div className="text-xs text-muted-foreground">Calculate volume from IU concentration</div>
              </div>
              <span className="text-primary text-sm font-medium">
                {activeCalculator === 'iu-ml' ? '−' : '+'}
              </span>
            </button>
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
                      className="h-full border-0 bg-transparent p-0 text-center text-xs font-medium placeholder:text-current [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus-visible:ring-0"
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
                      className="h-full border-0 bg-transparent p-0 text-center text-xs font-medium placeholder:text-current [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus-visible:ring-0"
                    />
                  </button>
                </div>
              </div>


              {/* Show result or helpful error message */}
              {vialSize && bacWater && intendedDose ? (
                displayIU ? (
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
                ) : (
                  <div className="border-2 border-destructive/50 rounded-lg p-4 bg-destructive/10">
                    <div className="flex items-start gap-2 text-destructive">
                      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <div className="space-y-1 text-sm">
                        <div className="font-semibold">Cannot calculate</div>
                        <div>Your dose ({intendedDose}{doseUnit}) exceeds the total peptide in the vial ({vialSize}{vialUnit}). Please check your inputs.</div>
                      </div>
                    </div>
                  </div>
                )
              ) : (
                <div className="text-sm text-muted-foreground text-center py-2">
                  Enter all values above to see calculation
                </div>
              )}
            </div>
          )}

          {/* mL Calculator - for oil-based compounds */}
          {activeCalculator === 'ml' && doseUnit === 'mg' && (
            <div className="space-y-4 p-4 bg-surface rounded-lg">
              {/* Concentration Input - always shown */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <Label className="sm:mb-0">Concentration (mg/mL)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={concentration}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || /^\d*\.?\d*$/.test(val)) {
                      setConcentration(val);
                    }
                  }}
                  placeholder="e.g., 200"
                  className="text-lg h-12 w-full sm:w-64 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Enter the mg/mL shown on your vial label
              </p>

              {/* Per-Injection Mode: Show simple mL calculation */}
              {doseInputMode === 'per-injection' && calculatedML && (
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

              {/* Weekly Mode: Show per-injection breakdown */}
              {doseInputMode === 'weekly' && isOilBasedCompound(name) && (
                <>
                  {(() => {
                    const injectionsPerWeek = calculateInjectionsPerWeek();
                    const result = calculateFromWeekly();
                    
                    // No schedule set yet or As Needed selected
                    if (!injectionsPerWeek) {
                      return (
                        <div className="border border-border rounded-lg p-4 bg-muted/30 text-center">
                          <p className="text-sm text-muted-foreground">
                            Set a regular schedule below to see per-injection calculations
                          </p>
                        </div>
                      );
                    }
                    
                    // "As Needed" doesn't have fixed per-injection calculations
                    if (frequency === 'As Needed') {
                      return (
                        <div className="border border-border rounded-lg p-4 bg-muted/30 text-center">
                          <p className="text-sm text-muted-foreground">
                            Per-injection calculations aren't available for "As Needed" schedules
                          </p>
                        </div>
                      );
                    }
                    
                    // Has schedule but missing inputs
                    if (!result && intendedDose && concentration) {
                      return (
                        <div className="border-2 border-destructive/50 rounded-lg p-4 bg-destructive/10">
                          <div className="flex items-start gap-2 text-destructive">
                            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <div className="text-sm">
                              <div className="font-semibold">Cannot calculate</div>
                              <div>Please check your values</div>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    
                    if (!result) {
                      return (
                        <div className="text-sm text-muted-foreground text-center py-2">
                          Enter weekly dose above and concentration to see calculation
                        </div>
                      );
                    }
                    
                    // Show calculation results
                    return (
                      <>
                        <div className={cn(
                          "border-2 rounded-lg p-4",
                          getWeeklyCalcWarning()?.startsWith("❌") 
                            ? "bg-destructive/10 border-destructive" 
                            : "bg-card border-secondary"
                        )}>
                          <div className="text-sm text-center mb-3 pb-2 border-b border-border/50">
                            <span className="text-muted-foreground">Schedule: </span>
                            <button 
                              onClick={() => {
                                document.getElementById('frequency-select')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                setTimeout(() => document.getElementById('frequency-select')?.focus(), 300);
                              }}
                              className="text-primary hover:underline"
                            >
                              {getScheduleDescription()}
                            </button>
                          </div>
                          
                          <div className="space-y-2 text-center">
                            <div>
                              <div className="text-3xl font-bold text-primary">{result.mgPerInjection} mg</div>
                              <div className="text-sm text-muted-foreground">per injection</div>
                            </div>
                            <div>
                              <div className="text-2xl font-semibold text-primary">{result.mlPerInjection} mL</div>
                              <div className="text-sm text-muted-foreground">per injection</div>
                            </div>
                          </div>
                          
                          {getWeeklyCalcWarning() && (
                            <div className="flex items-center justify-center gap-2 text-sm text-yellow-400/90 mt-3 bg-yellow-400/10 rounded-lg p-2.5 border border-yellow-400/20">
                              <AlertCircle className="w-4 h-4 flex-shrink-0" />
                              <span className="text-center">{getWeeklyCalcWarning()}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Medical disclaimer */}
                        <div className="text-center text-muted-foreground/60 text-xs mt-4 flex items-center justify-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Always verify your calculations before use</span>
                        </div>
                      </>
                    );
                  })()}
                </>
              )}
            </div>
          )}

          {/* IU/mL Calculator - for pre-mixed IU-based compounds like HGH */}
          {activeCalculator === 'iu-ml' && doseUnit === 'iu' && (
            <div className="space-y-4 p-4 bg-surface rounded-lg">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <Label className="sm:mb-0">Concentration (IU/mL)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={iuConcentration}
                  onChange={(e) => setIuConcentration(e.target.value)}
                  placeholder="e.g., 10"
                  className="text-lg h-12 w-full sm:w-64"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Enter the IU/mL shown on your vial label or calculated from reconstitution
              </p>

              {calculatedIUtoML && (
                <>
                  <div className={cn(
                    "border-2 rounded-lg p-4 text-center",
                    getIUtoMLWarning()?.startsWith("❌") 
                      ? "bg-destructive/10 border-destructive" 
                      : "bg-card border-secondary"
                  )}>
                    <div className="text-3xl font-bold text-primary">{calculatedIUtoML} mL</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Volume to inject
                    </div>
                    {getIUtoMLWarning() && (
                      <div className="flex items-center justify-center gap-2 text-sm text-yellow-400/90 mt-3 bg-yellow-400/10 rounded-lg p-2.5 border border-yellow-400/20">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span className="text-center">{getIUtoMLWarning()}</span>
                      </div>
                    )}
                    
                    {/* Show the calculation breakdown for transparency */}
                    <div className="mt-4 pt-4 border-t border-border/50 text-xs text-muted-foreground">
                      <div>{intendedDose} IU ÷ {iuConcentration} IU/mL = {calculatedIUtoML} mL</div>
                    </div>
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
              id="frequency-select"
              value={frequency}
              onChange={(e) => {
                setFrequency(e.target.value);
                if (e.target.value === 'Specific day(s)') setCustomDays([]);
              }}
              className="w-full sm:w-64 h-11 bg-input border-border rounded-lg border px-3 text-sm"
            >
              <option value="Daily">Daily</option>
              <option value="Weekly">Weekly</option>
              <option value="Twice Weekly">Twice weekly</option>
              <option value="Specific day(s)">Specific days</option>
              <option value="Every X Days">Every X days</option>
              <option value="As Needed">As needed</option>
            </select>
          </div>

          {/* Weekly: Single day picker */}
          {frequency === 'Weekly' && (
            <div className="space-y-3">
              <Label>Which day?</Label>
              <div className="grid grid-cols-7 gap-2">
                {[
                  { label: 'M', dayIndex: 1, fullName: 'Monday' },
                  { label: 'T', dayIndex: 2, fullName: 'Tuesday' },
                  { label: 'W', dayIndex: 3, fullName: 'Wednesday' },
                  { label: 'T', dayIndex: 4, fullName: 'Thursday' },
                  { label: 'F', dayIndex: 5, fullName: 'Friday' },
                  { label: 'S', dayIndex: 6, fullName: 'Saturday' },
                  { label: 'S', dayIndex: 0, fullName: 'Sunday' },
                ].map(({ label, dayIndex }) => (
                  <button
                    key={dayIndex}
                    type="button"
                    onClick={() => setWeeklyDay(dayIndex)}
                    className={`p-2 rounded-lg text-sm font-medium transition-colors ${
                      weeklyDay === dayIndex
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card border border-border hover:bg-muted'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Twice Weekly: Two day pickers with per-day times */}
          {frequency === 'Twice Weekly' && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Pick two days for your twice-weekly schedule. Each day can have its own time.
              </p>
              
              {/* Two-column layout for injections */}
              <div className="grid grid-cols-2 gap-4">
                {/* First injection */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">First injection</Label>
                  <div className="flex flex-wrap gap-1">
                    {[
                      { label: 'M', dayIndex: 1 },
                      { label: 'T', dayIndex: 2 },
                      { label: 'W', dayIndex: 3 },
                      { label: 'T', dayIndex: 4 },
                      { label: 'F', dayIndex: 5 },
                      { label: 'S', dayIndex: 6 },
                      { label: 'S', dayIndex: 0 },
                    ].map(({ label, dayIndex }) => (
                      <button
                        key={dayIndex}
                        type="button"
                        onClick={() => {
                          if (dayIndex !== twiceWeeklyDay2) {
                            setTwiceWeeklyDay1(dayIndex);
                          }
                        }}
                        disabled={dayIndex === twiceWeeklyDay2}
                        className={`w-7 h-7 rounded-full text-xs font-medium transition-colors ${
                          twiceWeeklyDay1 === dayIndex
                            ? 'bg-primary text-primary-foreground'
                            : dayIndex === twiceWeeklyDay2
                            ? 'bg-muted/50 text-muted-foreground/50 cursor-not-allowed'
                            : 'bg-card border border-border hover:bg-muted'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <IOSTimePicker
                    value={twiceWeeklyTime1}
                    onChange={setTwiceWeeklyTime1}
                  />
                </div>
                
                {/* Second injection */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Second injection</Label>
                  <div className="flex flex-wrap gap-1">
                    {[
                      { label: 'M', dayIndex: 1 },
                      { label: 'T', dayIndex: 2 },
                      { label: 'W', dayIndex: 3 },
                      { label: 'T', dayIndex: 4 },
                      { label: 'F', dayIndex: 5 },
                      { label: 'S', dayIndex: 6 },
                      { label: 'S', dayIndex: 0 },
                    ].map(({ label, dayIndex }) => (
                      <button
                        key={dayIndex}
                        type="button"
                        onClick={() => {
                          if (dayIndex !== twiceWeeklyDay1) {
                            setTwiceWeeklyDay2(dayIndex);
                          }
                        }}
                        disabled={dayIndex === twiceWeeklyDay1}
                        className={`w-7 h-7 rounded-full text-xs font-medium transition-colors ${
                          twiceWeeklyDay2 === dayIndex
                            ? 'bg-primary text-primary-foreground'
                            : dayIndex === twiceWeeklyDay1
                            ? 'bg-muted/50 text-muted-foreground/50 cursor-not-allowed'
                            : 'bg-card border border-border hover:bg-muted'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <IOSTimePicker
                    value={twiceWeeklyTime2}
                    onChange={setTwiceWeeklyTime2}
                  />
                </div>
              </div>
              
              {/* Spacing hint - calculate forward distance correctly */}
              {(() => {
                const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                const day1Name = dayNames[twiceWeeklyDay1];
                const day2Name = dayNames[twiceWeeklyDay2];
                
                // Calculate forward distance from day1 to day2 (wrapping around week)
                const forwardToDay2 = (twiceWeeklyDay2 - twiceWeeklyDay1 + 7) % 7;
                const forwardToDay1 = 7 - forwardToDay2; // The other gap
                
                // Both gaps should ideally be 3-4 days for optimal spacing
                const gap1 = forwardToDay2;
                const gap2 = forwardToDay1;
                const minGap = Math.min(gap1, gap2);
                const maxGap = Math.max(gap1, gap2);
                
                // Optimal: gaps of 3-4 days (like Mon/Thu = 3 and 4)
                const isOptimal = minGap >= 3 && maxGap <= 4;
                
                return (
                  <div className={`text-xs py-1.5 px-2.5 rounded-md inline-flex items-center gap-1.5 ${
                    isOptimal 
                      ? 'bg-emerald-500/10 text-emerald-500' 
                      : 'bg-amber-500/10 text-amber-500'
                  }`}>
                    {isOptimal 
                      ? `✓ ${day1Name} & ${day2Name} (~3-4 days apart)`
                      : `${day1Name} & ${day2Name} (${minGap} & ${maxGap} days apart)`
                    }
                  </div>
                );
              })()}
            </div>
          )}

          {frequency === 'Specific day(s)' && (
            <div className="space-y-2">
              <Label>Select Days</Label>
              <div className="grid grid-cols-7 gap-2">
                {/* Days starting Monday: M=1, T=2, W=3, T=4, F=5, S=6, S=0 */}
                {[
                  { label: 'M', dayIndex: 1 },
                  { label: 'T', dayIndex: 2 },
                  { label: 'W', dayIndex: 3 },
                  { label: 'T', dayIndex: 4 },
                  { label: 'F', dayIndex: 5 },
                  { label: 'S', dayIndex: 6 },
                  { label: 'S', dayIndex: 0 },
                ].map(({ label, dayIndex }) => (
                  <button
                    key={dayIndex}
                    onClick={() => {
                      if (customDays.includes(dayIndex)) {
                        setCustomDays(customDays.filter(d => d !== dayIndex));
                      } else {
                        setCustomDays([...customDays, dayIndex]);
                      }
                    }}
                    className={`p-2 rounded-lg text-sm font-medium transition-colors ${
                      customDays.includes(dayIndex)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card border border-border hover:bg-muted'
                    }`}
                  >
                    {label}
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

          {/* Hide doses per day and time pickers for Weekly/Twice Weekly (they have their own) */}
          {frequency !== 'As Needed' && frequency !== 'Weekly' && frequency !== 'Twice Weekly' && (
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

              {/* Time(s) - Always unlocked */}
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
                  {startDate ? safeFormatDate(startDate, "PPP") : <span>Pick a date</span>}
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

          {/* End Date - Optional */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex flex-col">
              <Label className="sm:mb-0">End Date</Label>
              <span className="text-xs text-muted-foreground">Optional - leave empty for ongoing</span>
            </div>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full sm:w-52 justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? safeFormatDate(endDate, "PPP") : <span>Ongoing</span>}
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
                        const newEndDate = `${year}-${month}-${day}`;
                        // Validate end date is after start date
                        if (startDate && newEndDate < startDate) {
                          toast({
                            title: "Invalid date",
                            description: "End date must be after start date",
                            variant: "destructive"
                          });
                          return;
                        }
                        setEndDate(newEndDate);
                      }
                    }}
                    disabled={(date) => {
                      // Disable dates before start date
                      if (startDate) {
                        const start = new Date(startDate + 'T00:00:00');
                        return date < start;
                      }
                      return false;
                    }}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              {endDate && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEndDate("")}
                  className="h-9 px-2 text-muted-foreground hover:text-foreground"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
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
              {/* Show subscribe button only if not subscribed AND not in preview mode (first compound) */}
              {!isSubscribed && !canProceed && (
                <button
                  type="button"
                  onClick={() => openPaywall({ 
                    message: "Subscribe to unlock cycle management",
                    onDismiss: () => navigate(-1)
                  })}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                >
                  🔒 <span className="underline">Subscribe</span>
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Advanced: Automatically pause and resume this compound on a schedule</p>
          </div>

          <div className="flex items-center justify-between py-2">
            <Label htmlFor="enableCycle" className="mb-0 text-sm">Enable Cycling</Label>
            <Switch
              id="enableCycle"
              checked={enableCycle}
              onCheckedChange={setEnableCycle}
            />
          </div>

          {enableCycle && (
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

              {/* Duration input with inline unit dropdown */}
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  inputMode="numeric"
                  value={cycleWeeksOn === 0 ? '' : cycleWeeksOn}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      setCycleWeeksOn(0);
                      return;
                    }
                    if (/^\d*\.?\d*$/.test(val)) {
                      const num = parseFloat(val);
                      if (!isNaN(num) && num >= 0) {
                        setCycleWeeksOn(num);
                      }
                    }
                  }}
                  onFocus={(e) => e.target.select()}
                  onBlur={() => {
                    if (cycleWeeksOn === 0 || cycleWeeksOn < 1) {
                      setCycleWeeksOn(1);
                    }
                  }}
                  className="w-20 text-center"
                  placeholder="4"
                />
                <select
                  value={cycleOnTimeUnit}
                  onChange={(e) => setCycleOnTimeUnit(e.target.value as 'days' | 'weeks' | 'months')}
                  className="h-10 px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="days">days</option>
                  <option value="weeks">weeks</option>
                  <option value="months">months</option>
                </select>
                <span className="text-sm text-muted-foreground">on</span>
              </div>

              {cycleMode === 'continuous' && (
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={cycleWeeksOff === 0 ? '' : cycleWeeksOff}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setCycleWeeksOff(0);
                        return;
                      }
                      if (/^\d*\.?\d*$/.test(val)) {
                        const num = parseFloat(val);
                        if (!isNaN(num) && num >= 0) {
                          setCycleWeeksOff(num);
                        }
                      }
                    }}
                    onFocus={(e) => e.target.select()}
                    onBlur={() => {
                      if (cycleWeeksOff === 0 || cycleWeeksOff < 1) {
                        setCycleWeeksOff(1);
                      }
                    }}
                    className="w-20 text-center"
                    placeholder="2"
                  />
                  <select
                    value={cycleOffTimeUnit}
                    onChange={(e) => setCycleOffTimeUnit(e.target.value as 'days' | 'weeks' | 'months')}
                    className="h-10 px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="days">days</option>
                    <option value="weeks">weeks</option>
                    <option value="months">months</option>
                  </select>
                  <span className="text-sm text-muted-foreground">off</span>
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
                  After {cycleWeeksOn} {cycleOnTimeUnit === 'days' ? (cycleWeeksOn !== 1 ? 'days' : 'day') : cycleOnTimeUnit === 'months' ? (cycleWeeksOn !== 1 ? 'months' : 'month') : (cycleWeeksOn !== 1 ? 'weeks' : 'week')}, this compound will automatically become inactive. You can reactivate it manually from My Stack.
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

        {/* Remove from Stack - Only show when editing */}
        {isEditing && (
          <div className="pt-6 border-t border-border">
            <button
              onClick={() => setShowDeleteDialog(true)}
              className="w-full flex items-center justify-center gap-2 p-4 text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-lg transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              <span className="text-sm">Remove from Stack</span>
            </button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Your dose history will be preserved
            </p>
          </div>
        )}

      </div>

      {/* Save Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border">
        <div className="p-4 max-w-2xl mx-auto">
          <Button
            onClick={() => {
              triggerHaptic('light');
              handleSave();
            }}
            disabled={saving}
            className="w-full"
            size="lg"
          >
            {saving ? 'Saving...' : isEditing ? 'Update Compound' : 'Save Compound'}
          </Button>
        </div>
        </div>
      </div>

      {showPreviewTimer && !isSubscribed && (
        <PreviewModeTimer 
          onTimerStart={() => console.log('[AddCompound] ⏱️ Preview timer started')}
          onPaywallDismiss={() => {
            console.log('[AddCompound] User dismissed preview paywall');
            // Navigate back when they dismiss the paywall
            navigate('/today');
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the compound from your active stack. Your dose history will be preserved for your records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Past Doses Dialog */}
      <AlertDialog open={showPastDosesDialog} onOpenChange={setShowPastDosesDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark past doses as taken?</AlertDialogTitle>
            <AlertDialogDescription>
              Your start date is in the past. Would you like to mark all previous doses as taken? This will help calculate your current levels accurately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleSkipPastDoses}>Skip</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMarkPastDosesTaken}
              disabled={markingPastDoses}
            >
              {markingPastDoses ? 'Marking...' : 'Mark All Taken'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Notification Permission Dialog (first compound) */}
      <NotificationPermissionDialog
        open={showNotificationDialog}
        onResponse={handleNotificationResponse}
        medicationName={savedCompoundName}
      />
    </div>
  );
};
