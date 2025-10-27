import { supabase } from "@/integrations/supabase/client";

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
      // Get last scheduled dose for this compound
      const { data: lastDose } = await supabase
        .from('doses')
        .select('scheduled_date')
        .eq('compound_id', compound.id)
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
 */
const regenerateCompoundDoses = async (compound: any) => {
  try {
    // Delete future doses
    const today = new Date().toISOString().split('T')[0];
    await supabase
      .from('doses')
      .delete()
      .eq('compound_id', compound.id)
      .gte('scheduled_date', today);

    // Generate new doses
    const doses = generateDoses(compound);
    
    if (doses.length > 0) {
      const { error: insertError } = await supabase
        .from('doses')
        .insert(doses);

      if (insertError) throw insertError;
      console.log(`✅ Generated ${doses.length} doses for ${compound.name}`);
    }
  } catch (error) {
    console.error(`Error regenerating doses for ${compound.name}:`, error);
  }
};

/**
 * Generates doses for a compound (same logic as AddCompoundScreen)
 */
const generateDoses = (compound: any) => {
  const doses = [];
  const [year, month, day] = compound.start_date.split('-').map(Number);
  const start = new Date(year, month - 1, day);
  
  if (compound.schedule_type === 'As Needed') {
    return doses;
  }
  
  // Start from today or start date (whichever is later)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const effectiveStart = start > today ? start : today;
  
  // Generate 60 days forward
  const maxDays = 60;
  let daysToGenerate = maxDays;
  
  if (compound.end_date) {
    const [endYear, endMonth, endDay] = compound.end_date.split('-').map(Number);
    const end = new Date(endYear, endMonth - 1, endDay);
    const daysDiff = Math.floor((end.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24));
    daysToGenerate = Math.min(maxDays, Math.max(0, daysDiff + 1));
  }
  
  for (let i = 0; i < daysToGenerate; i++) {
    const date = new Date(effectiveStart);
    date.setDate(date.getDate() + i);
    const dayOfWeek = date.getDay();
    
    // Check schedule type
    if (compound.schedule_type === 'Specific day(s)') {
      const scheduleDays = compound.schedule_days?.map((d: string | number) => 
        typeof d === 'string' ? parseInt(d) : d
      ) || [];
      if (!scheduleDays.includes(dayOfWeek)) {
        continue;
      }
    }
    
    if (compound.schedule_type === 'Every X Days') {
      const everyXDays = compound.schedule_days?.[0] || 1;
      if (i % everyXDays !== 0) {
        continue;
      }
    }

    // Check cycle logic
    if (compound.has_cycles && compound.cycle_weeks_on && compound.cycle_weeks_off) {
      const daysSinceStart = Math.floor((date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const weeksOnInDays = Math.round(compound.cycle_weeks_on * 7);
      const weeksOffInDays = Math.round(compound.cycle_weeks_off * 7);
      const cycleLength = weeksOnInDays + weeksOffInDays;
      const positionInCycle = daysSinceStart % cycleLength;
      
      if (positionInCycle >= weeksOnInDays) {
        continue;
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
