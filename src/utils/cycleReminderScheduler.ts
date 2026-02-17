import { LocalNotifications } from "@capacitor/local-notifications";
import { supabase } from "@/integrations/supabase/client";
import { safeParseDate, createLocalDate } from "@/utils/dateUtils";
import { persistentStorage } from "@/utils/persistentStorage";

interface CycleCompound {
  id: string;
  name: string;
  start_date: string;
  cycle_weeks_on: number | null;
  cycle_weeks_off: number | null;
  has_cycles: boolean;
  cycle_reminders_enabled: boolean;
}

/** Storage key for persisted notification IDs per compound */
const notifIdsKey = (compoundId: string) => `cycle_notif_ids_${compoundId}`;

/**
 * Schedule cycle transition reminders for a compound
 * - Advance reminder scaled to phase length
 * - Day of transition
 * Time: 8:00 AM
 */
export const scheduleCycleReminders = async (compound: CycleCompound): Promise<void> => {
  if (!compound.has_cycles || !compound.cycle_weeks_on || !compound.cycle_reminders_enabled) {
    return;
  }

  // Cancel existing reminders for this compound first
  await cancelCycleReminders(compound.id);

  const startDate = safeParseDate(compound.start_date);
  if (!startDate) {
    console.error('Invalid start date for cycle reminders');
    return;
  }
  
  // Values are already stored in DAYS in the database
  const daysOn = compound.cycle_weeks_on;
  const daysOff = compound.cycle_weeks_off || 0;
  const now = new Date();
  
  let notifications: any[];
  if (!daysOff) {
    notifications = buildOneTimeCycleNotifications(compound, startDate, daysOn, now);
  } else {
    notifications = buildRecurringCycleNotifications(compound, startDate, daysOn, daysOff, now);
  }

  if (notifications.length > 0) {
    try {
      await LocalNotifications.schedule({ notifications });
      // Persist the scheduled IDs so we can reliably cancel them later
      const ids = notifications.map(n => n.id);
      await persistentStorage.setJSON(notifIdsKey(compound.id), ids);
      console.log(`[CycleReminders] Scheduled ${ids.length} notifications for ${compound.name}, IDs: ${ids.join(',')}`);
    } catch (error) {
      console.error('Failed to schedule cycle reminders:', error);
    }
  }
};

/**
 * Calculate smart lead time for advance reminders
 */
const getAdvanceReminderDays = (phaseDays: number): number | null => {
  if (phaseDays >= 7) return 7;
  if (phaseDays >= 4) return 2;
  if (phaseDays >= 2) return 1;
  return null;
};

/**
 * Build notifications for one-time cycles (ending permanently)
 */
const buildOneTimeCycleNotifications = (
  compound: CycleCompound,
  startDate: Date,
  daysOn: number,
  now: Date
): any[] => {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + daysOn);

  if (endDate <= now) return [];

  const notifications: any[] = [];
  const advanceDays = getAdvanceReminderDays(daysOn);

  if (advanceDays !== null) {
    const advanceDate = new Date(endDate);
    advanceDate.setDate(advanceDate.getDate() - advanceDays);
    
    if (advanceDate > now) {
      const advanceAt8AM = new Date(advanceDate);
      advanceAt8AM.setHours(8, 0, 0, 0);
      
      notifications.push({
        id: generateNotificationId(compound.id, 'end_advance'),
        title: `${compound.name}: Cycle Ending Soon`,
        body: `Your cycle ends in ${advanceDays} day${advanceDays > 1 ? 's' : ''} on ${formatDate(endDate)}.`,
        schedule: { at: advanceAt8AM },
      });
    }
  }

  if (endDate > now) {
    const endAt8AM = new Date(endDate);
    endAt8AM.setHours(8, 0, 0, 0);
    
    notifications.push({
      id: generateNotificationId(compound.id, 'end_day'),
        title: `${compound.name}: Cycle Ends Today`,
        body: `Your cycle ends today.`,
      schedule: { at: endAt8AM },
    });
  }

  return notifications;
};

/**
 * Build notifications for recurring cycles
 * Schedules next 4 transitions (2 complete cycles) to avoid over-scheduling
 */
const buildRecurringCycleNotifications = (
  compound: CycleCompound,
  startDate: Date,
  daysOn: number,
  daysOff: number,
  now: Date
): any[] => {
  const cycleDuration = daysOn + daysOff;
  const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  const notifications: any[] = [];
  let notificationCount = 0;
  const maxNotifications = 8;

  const onAdvanceDays = getAdvanceReminderDays(daysOn);
  const offAdvanceDays = getAdvanceReminderDays(daysOff);

  for (let cycleOffset = 0; cycleOffset < 3; cycleOffset++) {
    if (notificationCount >= maxNotifications) break;

    const cycleStart = new Date(startDate);
    cycleStart.setDate(cycleStart.getDate() + (Math.floor(daysSinceStart / cycleDuration) + cycleOffset) * cycleDuration);

    // ON → OFF transition
    const offTransition = new Date(cycleStart);
    offTransition.setDate(offTransition.getDate() + daysOn);
    
    if (offTransition > now) {
      if (onAdvanceDays !== null) {
        const advanceDate = new Date(offTransition);
        advanceDate.setDate(advanceDate.getDate() - onAdvanceDays);
        
        if (advanceDate > now) {
          const advanceAt8AM = new Date(advanceDate);
          advanceAt8AM.setHours(8, 0, 0, 0);
          
          notifications.push({
            id: generateNotificationId(compound.id, `off_advance_${cycleOffset}`),
            title: `${compound.name}: Cycle Ending Soon`,
            body: `Your cycle ends in ${onAdvanceDays} day${onAdvanceDays > 1 ? 's' : ''}. Off-phase begins on ${formatDate(offTransition)}.`,
            schedule: { at: advanceAt8AM },
          });
          notificationCount++;
        }
      }

      const offAt8AM = new Date(offTransition);
      offAt8AM.setHours(8, 0, 0, 0);
      
      notifications.push({
        id: generateNotificationId(compound.id, `off_day_${cycleOffset}`),
        title: `${compound.name}: Cycle Off-Phase Begins`,
        body: `Your off-phase starts today. Next cycle resumes on ${formatDate(new Date(offTransition.getTime() + daysOff * 24 * 60 * 60 * 1000))}.`,
        schedule: { at: offAt8AM },
      });
      notificationCount++;
    }

    // OFF → ON transition
    const onTransition = new Date(cycleStart);
    onTransition.setDate(onTransition.getDate() + daysOn + daysOff);
    
    if (onTransition > now && notificationCount < maxNotifications) {
      if (offAdvanceDays !== null) {
        const advanceDate = new Date(onTransition);
        advanceDate.setDate(advanceDate.getDate() - offAdvanceDays);
        
        if (advanceDate > now) {
          const advanceAt8AM = new Date(advanceDate);
          advanceAt8AM.setHours(8, 0, 0, 0);
          
          notifications.push({
            id: generateNotificationId(compound.id, `on_advance_${cycleOffset}`),
            title: `${compound.name}: Cycle Resuming Soon`,
            body: `Your cycle resumes in ${offAdvanceDays} day${offAdvanceDays > 1 ? 's' : ''} on ${formatDate(onTransition)}.`,
            schedule: { at: advanceAt8AM },
          });
          notificationCount++;
        }
      }

      const onAt8AM = new Date(onTransition);
      onAt8AM.setHours(8, 0, 0, 0);
      
      notifications.push({
        id: generateNotificationId(compound.id, `on_day_${cycleOffset}`),
        title: `${compound.name}: Cycle Begins`,
        body: `Cycle begins today! Don't forget your dose.`,
        schedule: { at: onAt8AM },
      });
      notificationCount++;
    }
  }

  return notifications;
};

/**
 * Cancel all cycle reminders for a compound using persisted notification IDs
 */
export const cancelCycleReminders = async (compoundId: string): Promise<void> => {
  try {
    const storedIds = await persistentStorage.getJSON<number[]>(notifIdsKey(compoundId));
    
    if (storedIds && storedIds.length > 0) {
      await LocalNotifications.cancel({
        notifications: storedIds.map(id => ({ id }))
      });
      await persistentStorage.remove(notifIdsKey(compoundId));
      console.log(`[CycleReminders] Cancelled ${storedIds.length} notifications for compound ${compoundId}`);
    }
  } catch (error) {
    console.error('Failed to cancel cycle reminders:', error);
  }
};

/**
 * One-time cleanup of stale cycle notifications from before the fix.
 * Cancels ALL pending notifications whose titles match cycle-related patterns,
 * then sets a flag so it only runs once.
 */
export const cleanupStaleCycleNotifications = async (): Promise<void> => {
  try {
    const alreadyCleaned = await persistentStorage.getBoolean('cycle_notif_cleanup_v1', false);
    if (alreadyCleaned) return;

    const { notifications } = await LocalNotifications.getPending();
    const cyclePatterns = [
      'Cycle Ending',
      'On-Cycle Ending',
      'Off-Phase Begins',
      'Cycle Begins',
      'Cycle Resuming',
      'Cycle Ends Today',
      'On-Cycle Ends Today',
    ];

    const stale = notifications.filter(n => {
      const title = (n as any).title || '';
      return cyclePatterns.some(p => title.includes(p));
    });

    if (stale.length > 0) {
      await LocalNotifications.cancel({
        notifications: stale.map(n => ({ id: n.id }))
      });
      console.log(`[CycleReminders] Cleaned up ${stale.length} stale cycle notifications`);
    }

    await persistentStorage.setBoolean('cycle_notif_cleanup_v1', true);
  } catch (error) {
    console.error('Failed to cleanup stale cycle notifications:', error);
  }
};

/**
 * Reschedule all cycle reminders for all user compounds
 */
export const rescheduleAllCycleReminders = async (): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: compounds } = await supabase
      .from('compounds')
      .select('id, name, start_date, cycle_weeks_on, cycle_weeks_off, has_cycles, cycle_reminders_enabled')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (compounds) {
      for (const compound of compounds) {
        await scheduleCycleReminders(compound as CycleCompound);
      }
    }
  } catch (error) {
    console.error('Failed to reschedule cycle reminders:', error);
  }
};

/**
 * Generate unique notification ID for cycle reminders
 */
const generateNotificationId = (compoundId: string, type: string): number => {
  const str = `cycle_${compoundId}_${type}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash % 2147483647) + 1;
};

/**
 * Format date for notification messages
 */
const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
};
