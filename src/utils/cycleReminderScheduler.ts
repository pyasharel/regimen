import { LocalNotifications } from "@capacitor/local-notifications";
import { supabase } from "@/integrations/supabase/client";
import { safeParseDate, createLocalDate } from "@/utils/dateUtils";

interface CycleCompound {
  id: string;
  name: string;
  start_date: string;
  cycle_weeks_on: number | null;
  cycle_weeks_off: number | null;
  has_cycles: boolean;
  cycle_reminders_enabled: boolean;
}

/**
 * Schedule cycle transition reminders for a compound
 * - 1 week before transition (if phase is >= 7 days)
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
  
  // One-time cycle (no off period)
  if (!daysOff) {
    await scheduleOneTimeCycleReminders(compound, startDate, daysOn, now);
  } else {
    // Recurring cycle
    await scheduleRecurringCycleReminders(compound, startDate, daysOn, daysOff, now);
  }
};

/**
 * Schedule reminders for one-time cycles (ending permanently)
 */
const scheduleOneTimeCycleReminders = async (
  compound: CycleCompound,
  startDate: Date,
  daysOn: number,
  now: Date
): Promise<void> => {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + daysOn);

  // Only schedule if end date is in the future
  if (endDate <= now) {
    return;
  }

  const notifications: any[] = [];

  // 7 days before end (if cycle is at least 7 days)
  if (daysOn >= 7) {
    const weekBefore = new Date(endDate);
    weekBefore.setDate(weekBefore.getDate() - 7);
    
    if (weekBefore > now) {
      const weekBeforeAt8AM = new Date(weekBefore);
      weekBeforeAt8AM.setHours(8, 0, 0, 0);
      
      notifications.push({
        id: generateNotificationId(compound.id, 'end_week'),
        title: `${compound.name}: Cycle Ending Soon`,
        body: `Your cycle ends in 7 days on ${formatDate(endDate)}.`,
        schedule: { at: weekBeforeAt8AM },
      });
    }
  }

  // Day of end
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

  if (notifications.length > 0) {
    try {
      await LocalNotifications.schedule({ notifications });
    } catch (error) {
      console.error('Failed to schedule one-time cycle reminders:', error);
    }
  }
};

/**
 * Schedule reminders for recurring cycles
 * Schedules next 4 transitions (2 complete cycles) to avoid over-scheduling
 */
const scheduleRecurringCycleReminders = async (
  compound: CycleCompound,
  startDate: Date,
  daysOn: number,
  daysOff: number,
  now: Date
): Promise<void> => {
  const cycleDuration = daysOn + daysOff;
  const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const positionInCycle = daysSinceStart % cycleDuration;
  
  const notifications: any[] = [];
  let notificationCount = 0;
  const maxNotifications = 8; // 4 transitions × 2 notifications each

  // Calculate next few transitions
  for (let cycleOffset = 0; cycleOffset < 3; cycleOffset++) {
    if (notificationCount >= maxNotifications) break;

    const cycleStart = new Date(startDate);
    cycleStart.setDate(cycleStart.getDate() + (Math.floor(daysSinceStart / cycleDuration) + cycleOffset) * cycleDuration);

    // ON → OFF transition
    const offTransition = new Date(cycleStart);
    offTransition.setDate(offTransition.getDate() + daysOn);
    
    if (offTransition > now) {
      // 7 days before (if ON phase is >= 7 days)
      if (daysOn >= 7) {
        const weekBefore = new Date(offTransition);
        weekBefore.setDate(weekBefore.getDate() - 7);
        
        if (weekBefore > now) {
          const weekBeforeAt8AM = new Date(weekBefore);
          weekBeforeAt8AM.setHours(8, 0, 0, 0);
          
          notifications.push({
            id: generateNotificationId(compound.id, `off_week_${cycleOffset}`),
            title: `${compound.name}: Cycle Ending Soon`,
            body: `Your cycle ends in 7 days. Off-phase begins on ${formatDate(offTransition)}.`,
            schedule: { at: weekBeforeAt8AM },
          });
          notificationCount++;
        }
      }

      // Day of OFF transition
      const offAt8AM = new Date(offTransition);
      offAt8AM.setHours(8, 0, 0, 0);
      
      notifications.push({
        id: generateNotificationId(compound.id, `off_day_${cycleOffset}`),
        title: `${compound.name}: Off-Phase Begins`,
        body: `Off-phase begins today. Next cycle resumes on ${formatDate(new Date(offTransition.getTime() + daysOff * 24 * 60 * 60 * 1000))}.`,
        schedule: { at: offAt8AM },
      });
      notificationCount++;
    }

    // OFF → ON transition
    const onTransition = new Date(cycleStart);
    onTransition.setDate(onTransition.getDate() + daysOn + daysOff);
    
    if (onTransition > now && notificationCount < maxNotifications) {
      // 7 days before (if OFF phase is >= 7 days)
      if (daysOff >= 7) {
        const weekBefore = new Date(onTransition);
        weekBefore.setDate(weekBefore.getDate() - 7);
        
        if (weekBefore > now) {
          const weekBeforeAt8AM = new Date(weekBefore);
          weekBeforeAt8AM.setHours(8, 0, 0, 0);
          
          notifications.push({
            id: generateNotificationId(compound.id, `on_week_${cycleOffset}`),
            title: `${compound.name}: Cycle Resuming Soon`,
            body: `Your cycle resumes in 7 days on ${formatDate(onTransition)}.`,
            schedule: { at: weekBeforeAt8AM },
          });
          notificationCount++;
        }
      }

      // Day of ON transition
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

  if (notifications.length > 0) {
    try {
      await LocalNotifications.schedule({ notifications });
    } catch (error) {
      console.error('Failed to schedule recurring cycle reminders:', error);
    }
  }
};

/**
 * Cancel all cycle reminders for a compound
 */
export const cancelCycleReminders = async (compoundId: string): Promise<void> => {
  try {
    // Get all pending notifications
    const { notifications } = await LocalNotifications.getPending();
    
    // Filter to cycle reminder notifications for this compound
    const cycleNotifications = notifications.filter(n => 
      n.id.toString().startsWith(`cycle_${compoundId}_`)
    );
    
    if (cycleNotifications.length > 0) {
      await LocalNotifications.cancel({ 
        notifications: cycleNotifications.map(n => ({ id: n.id })) 
      });
    }
  } catch (error) {
    console.error('Failed to cancel cycle reminders:', error);
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
  // Create a hash-like ID from compound ID and type
  const str = `cycle_${compoundId}_${type}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
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
