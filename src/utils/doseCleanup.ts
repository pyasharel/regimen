/**
 * Utility to clean up duplicate doses in the database
 * This can happen if a user edits a compound multiple times
 */

import { supabase } from '@/integrations/supabase/client';
import { toLocalDateString } from '@/utils/dateUtils';

/**
 * Clean up duplicate doses for a specific user
 * Keeps the earliest created dose for each compound/date/time combination
 */
export const cleanupDuplicateDoses = async (userId: string): Promise<number> => {
  try {
    // Call the database function that handles the cleanup
    const { data, error } = await supabase.rpc('cleanup_duplicate_doses');
    
    if (error) {
      console.error('Error cleaning up duplicate doses:', error);
      return 0;
    }
    
    const deletedCount = data || 0;
    if (deletedCount > 0) {
      console.log(`🧹 Cleaned up ${deletedCount} duplicate doses`);
    }
    
    return deletedCount;
  } catch (error) {
    console.error('Error in cleanupDuplicateDoses:', error);
    return 0;
  }
};

/**
 * Remove doses that are scheduled for days that don't match the compound's schedule
 * This fixes issues where editing a compound leaves behind stale doses
 */
export const cleanupStaleDoses = async (userId: string): Promise<number> => {
  try {
    // Get all active compounds with their schedules
    const { data: compounds, error: compoundsError } = await supabase
      .from('compounds')
      .select('id, schedule_type, schedule_days, start_date, is_active')
      .eq('user_id', userId);
    
    if (compoundsError || !compounds) {
      console.error('Error fetching compounds:', compoundsError);
      return 0;
    }
    
    let totalDeleted = 0;
    
    for (const compound of compounds) {
      // Skip if no specific days schedule
      if (compound.schedule_type !== 'Specific day(s)' && compound.schedule_type !== 'Specific day of the week') {
        continue;
      }
      
      if (!compound.schedule_days || compound.schedule_days.length === 0) {
        continue;
      }
      
      // Get all future untaken doses for this compound
      const today = toLocalDateString();
      const { data: doses, error: dosesError } = await supabase
        .from('doses')
        .select('id, scheduled_date')
        .eq('compound_id', compound.id)
        .eq('taken', false)
        .gte('scheduled_date', today);
      
      if (dosesError || !doses) continue;
      
      // Check each dose to see if it's on a valid day
      const dosesToDelete: string[] = [];
      const validDays = compound.schedule_days.map(d => typeof d === 'string' ? parseInt(d) : d);
      
      for (const dose of doses) {
        const doseDate = new Date(dose.scheduled_date + 'T00:00:00');
        const dayOfWeek = doseDate.getDay();
        
        if (!validDays.includes(dayOfWeek)) {
          dosesToDelete.push(dose.id);
        }
      }
      
      if (dosesToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('doses')
          .delete()
          .in('id', dosesToDelete);
        
        if (!deleteError) {
          totalDeleted += dosesToDelete.length;
          console.log(`🧹 Deleted ${dosesToDelete.length} stale doses for compound ${compound.id}`);
        }
      }
    }
    
    return totalDeleted;
  } catch (error) {
    console.error('Error in cleanupStaleDoses:', error);
    return 0;
  }
};

/**
 * Clean up orphan doses from inactive compounds
 * These are future untaken doses that should have been deleted when the compound was deactivated
 */
export const cleanupOrphanDosesFromInactiveCompounds = async (userId: string): Promise<number> => {
  try {
    const todayStr = toLocalDateString();
    
    // Get all inactive compound IDs for this user
    const { data: inactiveCompounds, error: compoundsError } = await supabase
      .from('compounds')
      .select('id')
      .eq('user_id', userId)
      .eq('is_active', false);
    
    if (compoundsError || !inactiveCompounds?.length) {
      return 0;
    }
    
    const inactiveIds = inactiveCompounds.map(c => c.id);
    
    // Delete future untaken doses from inactive compounds
    const { data, error } = await supabase
      .from('doses')
      .delete()
      .in('compound_id', inactiveIds)
      .eq('taken', false)
      .eq('skipped', false)
      .gte('scheduled_date', todayStr)
      .select('id');
    
    if (error) {
      console.error('Error cleaning up orphan doses:', error);
      return 0;
    }
    
    const deletedCount = data?.length || 0;
    if (deletedCount > 0) {
      console.log(`🧹 Cleaned up ${deletedCount} orphan doses from inactive compounds`);
    }
    
    return deletedCount;
  } catch (error) {
    console.error('Error in cleanupOrphanDosesFromInactiveCompounds:', error);
    return 0;
  }
};

/**
 * Run all cleanup tasks
 */
export const runFullCleanup = async (userId: string): Promise<{ duplicates: number; stale: number; orphans: number }> => {
  const duplicates = await cleanupDuplicateDoses(userId);
  const stale = await cleanupStaleDoses(userId);
  const orphans = await cleanupOrphanDosesFromInactiveCompounds(userId);
  
  return { duplicates, stale, orphans };
};
