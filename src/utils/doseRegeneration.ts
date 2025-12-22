import { supabase } from "@/integrations/supabase/client";
import { createLocalDate } from "@/utils/dateUtils";

/**
 * Checks all active compounds and regenerates doses if needed
 * Regenerates when there are fewer than 14 days of doses remaining
 */
export const checkAndRegenerateDoses = async (userId: string) => {
  try {
    // Get all active compounds
    const { data: compounds, error: compoundsError } = await supabase
      .from('compounds')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (compoundsError) throw compoundsError;
    if (!compounds || compounds.length === 0) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const fourteenDaysFromNow = new Date(today);
    fourteenDaysFromNow.setDate(today.getDate() + 14);

    for (const compound of compounds) {
      // Get last scheduled dose for this compound (only untaken future doses)
      const { data: lastDose } = await supabase
        .from('doses')
        .select('scheduled_date')
        .eq('compound_id', compound.id)
        .eq('taken', false)
        .eq('skipped', false)
        .order('scheduled_date', { ascending: false })
        .limit(1)
        .single();

      const needsRegeneration = !lastDose || 
        new Date(lastDose.scheduled_date) < fourteenDaysFromNow;

      if (needsRegeneration) {
        console.log(`🔄 Regenerating doses for ${compound.name}`);
        await regenerateCompoundDoses(compound);
      }
    }
  } catch (error) {
    console.error('Error checking/regenerating doses:', error);
  }
};

/**
 * Regenerates doses for a single compound
 * IMPORTANT: Only deletes UNTAKEN future doses to preserve user's history
 */
const regenerateCompoundDoses = async (compound: any) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Get existing doses for today to avoid duplicates
    const { data: existingTodayDoses } = await supabase
      .from('doses')
      .select('scheduled_time')
      .eq('compound_id', compound.id)
      .eq('scheduled_date', today);
    
    const existingTodayTimes = new Set(existingTodayDoses?.map(d => d.scheduled_time) || []);
    
    // Delete only FUTURE UNTAKEN doses (preserve taken/skipped doses)
    // Also exclude TODAY to avoid race conditions
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    await supabase
      .from('doses')
      .delete()
      .eq('compound_id', compound.id)
      .gte('scheduled_date', tomorrowStr)
      .eq('taken', false)
      .eq('skipped', false);

    // Generate new doses from tomorrow forward (today is handled separately)
    const doses = generateDoses(compound, tomorrowStr);
    
    // Also check if today needs doses (only add missing ones)
    const todayDoses = generateDosesForDate(compound, today);
    const missingTodayDoses = todayDoses.filter(d => !existingTodayTimes.has(d.scheduled_time));
    
    const allDoses = [...missingTodayDoses, ...doses];
    
    if (allDoses.length > 0) {
      const { error: insertError } = await supabase
        .from('doses')
        .insert(allDoses);

      if (insertError) throw insertError;
      console.log(`✅ Generated ${allDoses.length} doses for ${compound.name}`);
    }
  } catch (error) {
    console.error(`Error regenerating doses for ${compound.name}:`, error);
  }
};

/**
 * Generates doses for a single specific date
 */
const generateDosesForDate = (compound: any, dateStr: string) => {
  const doses: any[] = [];
  const start = createLocalDate(compound.start_date);
  if (!start) return doses;
  
  if (compound.schedule_type === 'As Needed') return doses;
  
  const date = createLocalDate(dateStr);
  if (!date) return doses;
  
  const dayOfWeek = date.getDay();
  const daysSinceStart = Math.floor((date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  
  // Date must be >= start date
  if (daysSinceStart < 0) return doses;
  
  // Check end date
  if (compound.end_date) {
    const end = createLocalDate(compound.end_date);
    if (end && date > end) return doses;
  }
  
  // Check schedule type
  if (compound.schedule_type === 'Specific day(s)') {
    const scheduleDays = compound.schedule_days?.map((d: string | number) => 
      typeof d === 'string' ? parseInt(d) : d
    ) || [];
    if (!scheduleDays.includes(dayOfWeek)) return doses;
  }
  
  if (compound.schedule_type === 'Every X Days' || compound.schedule_type.startsWith('Every ')) {
    let everyXDays = 1;
    const match = compound.schedule_type.match(/Every (\d+) Days?/i);
    if (match) {
      everyXDays = parseInt(match[1]);
    } else if (compound.schedule_days?.[0]) {
      everyXDays = typeof compound.schedule_days[0] === 'string' 
        ? parseInt(compound.schedule_days[0]) 
        : compound.schedule_days[0];
    }
    if (daysSinceStart % everyXDays !== 0) return doses;
  }
  
  // Check cycle logic - values are stored as DAYS in the database
  if (compound.has_cycles && compound.cycle_weeks_on) {
    const daysOn = compound.cycle_weeks_on;
    if (compound.cycle_weeks_off) {
      const daysOff = compound.cycle_weeks_off;
      const cycleLength = daysOn + daysOff;
      const positionInCycle = daysSinceStart % cycleLength;
      if (positionInCycle >= daysOn) return doses;
    } else {
      if (daysSinceStart >= daysOn) return doses;
    }
  }
  
  const times = compound.time_of_day || ['08:00'];
  times.forEach((time: string) => {
    doses.push({
      compound_id: compound.id,
      user_id: compound.user_id,
      scheduled_date: dateStr,
      scheduled_time: time,
      dose_amount: compound.intended_dose,
      dose_unit: compound.dose_unit,
      taken: false,
    });
  });
  
  return doses;
};

/**
 * Generates doses for a compound from a start date forward
 * Note: This is for REGENERATION only. Initial dose creation (including past dates) 
 * is handled in AddCompoundScreen.tsx
 */
const generateDoses = (compound: any, fromDateStr?: string) => {
  const doses: any[] = [];
  const start = createLocalDate(compound.start_date);
  if (!start) {
    console.error('Invalid start date:', compound.start_date);
    return doses;
  }
  
  if (compound.schedule_type === 'As Needed') {
    return doses;
  }
  
  // For regeneration: start from specified date, today, or compound start date (whichever is latest)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let effectiveStart = start > today ? start : today;
  if (fromDateStr) {
    const fromDate = createLocalDate(fromDateStr);
    if (fromDate && fromDate > effectiveStart) {
      effectiveStart = fromDate;
    }
  }
  
  // Generate 60 days forward from effective start
  const maxDays = 60;
  let daysToGenerate = maxDays;
  
  if (compound.end_date) {
    const end = createLocalDate(compound.end_date);
    if (end) {
      const daysDiff = Math.floor((end.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24));
      daysToGenerate = Math.min(maxDays, Math.max(0, daysDiff + 1));
    }
  }
  
  for (let i = 0; i < daysToGenerate; i++) {
    const date = new Date(effectiveStart);
    date.setDate(date.getDate() + i);
    const dayOfWeek = date.getDay();
    
    // Calculate days since ORIGINAL start date for schedule calculations
    const daysSinceStart = Math.floor((date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    // Check schedule type
    if (compound.schedule_type === 'Specific day(s)') {
      const scheduleDays = compound.schedule_days?.map((d: string | number) => 
        typeof d === 'string' ? parseInt(d) : d
      ) || [];
      if (!scheduleDays.includes(dayOfWeek)) {
        continue;
      }
    }
    
    // For "Every X Days", check relative to original start date
    if (compound.schedule_type === 'Every X Days' || compound.schedule_type.startsWith('Every ')) {
      // Extract X from either format: "Every X Days" or schedule_days[0]
      let everyXDays = 1;
      const match = compound.schedule_type.match(/Every (\d+) Days?/i);
      if (match) {
        everyXDays = parseInt(match[1]);
      } else if (compound.schedule_days?.[0]) {
        everyXDays = typeof compound.schedule_days[0] === 'string' 
          ? parseInt(compound.schedule_days[0]) 
          : compound.schedule_days[0];
      }
      
      // Use days since ORIGINAL start to maintain schedule continuity
      if (daysSinceStart % everyXDays !== 0) {
        continue;
      }
    }

    // Check cycle logic - values are stored as DAYS in the database
    if (compound.has_cycles && compound.cycle_weeks_on) {
      const daysOn = compound.cycle_weeks_on;
      
      if (compound.cycle_weeks_off) {
        // Continuous cycle (on/off/on/off...)
        const daysOff = compound.cycle_weeks_off;
        const cycleLength = daysOn + daysOff;
        const positionInCycle = daysSinceStart % cycleLength;
        
        if (positionInCycle >= daysOn) {
          continue;
        }
      } else {
        // One-time cycle - stop after the "on" period
        if (daysSinceStart >= daysOn) {
          continue;
        }
      }
    }

    // Generate dose for each time of day
    const times = compound.time_of_day || ['08:00'];
    times.forEach((time: string) => {
      doses.push({
        compound_id: compound.id,
        user_id: compound.user_id,
        scheduled_date: date.toISOString().split('T')[0],
        scheduled_time: time,
        dose_amount: compound.intended_dose,
        dose_unit: compound.dose_unit,
        taken: false,
      });
    });
  }
  
  return doses;
};
