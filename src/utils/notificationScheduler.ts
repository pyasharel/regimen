import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const requestNotificationPermissions = async (): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) {
    console.log('Notifications only available on native platforms');
    return false;
  }

  try {
    // Register action types for notification buttons
    await LocalNotifications.registerActionTypes({
      types: [
        {
          id: 'DOSE_ACTIONS',
          actions: [
            {
              id: 'take-now',
              title: 'Take Now',
            },
            {
              id: 'remind-15',
              title: 'Remind in 15 min',
            },
            {
              id: 'remind-60',
              title: 'Remind in 1 hour',
            },
            {
              id: 'skip',
              title: 'Skip',
              destructive: true,
            },
          ],
        },
      ],
    });

    const result = await LocalNotifications.requestPermissions();
    return result.display === 'granted';
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
};

/**
 * Generate a unique notification ID from a dose ID
 * Uses a simple hash to convert UUID to a number within safe integer range
 */
const generateNotificationId = (doseId: string): number => {
  // Simple hash function to convert UUID to a number
  let hash = 0;
  for (let i = 0; i < doseId.length; i++) {
    const char = doseId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Ensure positive number within safe range for iOS/Android notification IDs
  return Math.abs(hash % 2147483647) + 1; // Keep under max 32-bit signed int
};

export const scheduleDoseNotification = async (
  dose: {
    id: string;
    compound_name: string;
    dose_amount: number;
    dose_unit: string;
    scheduled_date: string;
    scheduled_time: string;
  },
  isPremium: boolean = false
) => {
  if (!Capacitor.isNativePlatform()) return;

  try {
    // Parse the scheduled time - try HH:MM format first (custom times)
    const customTimeMatch = dose.scheduled_time.match(/^(\d{1,2}):(\d{2})$/);
    let time: { hour: number; minute: number };
    
    if (customTimeMatch) {
      // Custom time in HH:MM format
      time = {
        hour: parseInt(customTimeMatch[1]),
        minute: parseInt(customTimeMatch[2])
      };
    } else {
      // Preset time (Morning/Afternoon/Evening)
      const timeMap: { [key: string]: { hour: number; minute: number } } = {
        'Morning': { hour: 8, minute: 0 },
        'Afternoon': { hour: 14, minute: 0 },
        'Evening': { hour: 18, minute: 0 },
      };
      
      time = timeMap[dose.scheduled_time] || { hour: 8, minute: 0 };
    }
    
    // Create notification date - parse the date properly to avoid timezone issues
    const [year, month, day] = dose.scheduled_date.split('-').map(Number);
    const notificationDate = new Date(year, month - 1, day, time.hour, time.minute, 0, 0);

    // Only schedule if in the future (with 30 second buffer)
    const now = Date.now();
    const bufferMs = 30 * 1000; // 30 second buffer
    if (notificationDate.getTime() <= now - bufferMs) {
      console.log(`⏭️ Skipping past notification: ${dose.compound_name} at ${notificationDate.toLocaleString()}`);
      return;
    }

    // Generate a unique notification ID using hash
    const notificationId = generateNotificationId(dose.id);

    await LocalNotifications.schedule({
      notifications: [
        {
          id: notificationId,
          title: 'Regimen',
          body: `Time for ${dose.compound_name} (${dose.dose_amount}${dose.dose_unit})`,
          schedule: { at: notificationDate },
          sound: 'light_bubble_pop_regimen.m4a',
          smallIcon: 'ic_stat_icon_config_sample',
          iconColor: '#FF6F61',
          actionTypeId: isPremium ? 'DOSE_ACTIONS' : undefined,
          extra: {
            doseId: dose.id,
          },
        },
      ],
    });

    console.log(`✅ Scheduled: ${dose.compound_name} at ${notificationDate.toLocaleString()} (ID: ${notificationId})`);
  } catch (error) {
    console.error('Error scheduling notification:', error);
  }
};

export const cancelDoseNotification = async (doseId: string) => {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const notificationId = generateNotificationId(doseId);
    await LocalNotifications.cancel({
      notifications: [{ id: notificationId }],
    });
  } catch (error) {
    console.error('Error canceling notification:', error);
  }
};

export const cancelAllNotifications = async () => {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await LocalNotifications.getPending().then(async (result) => {
      if (result.notifications.length > 0) {
        await LocalNotifications.cancel({ notifications: result.notifications });
      }
    });
  } catch (error) {
    console.error('Error canceling all notifications:', error);
  }
};

export const scheduleAllUpcomingDoses = async (doses: any[], isPremium: boolean = false) => {
  if (!Capacitor.isNativePlatform()) {
    console.log('⚠️ Not on native platform - notifications disabled');
    return;
  }

  console.log('🔔 Checking notification permissions...');
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    console.error('❌ Notification permissions NOT granted!');
    return;
  }
  console.log('✅ Notification permissions granted');

  // Cancel all existing notifications first
  await cancelAllNotifications();
  console.log('🗑️ Cleared all existing notifications');

  // Schedule notifications for upcoming doses (next 7 days)
  const now = new Date();
  now.setSeconds(0, 0); // Normalize to start of minute
  
  const sevenDaysFromNow = new Date(now);
  sevenDaysFromNow.setDate(now.getDate() + 7);

  // Filter to only future doses
  const upcomingDoses = doses.filter(dose => {
    if (dose.taken || dose.skipped) return false;
    
    // Parse the dose date and time
    const [year, month, day] = dose.scheduled_date.split('-').map(Number);
    const timeMatch = dose.scheduled_time.match(/^(\d{1,2}):(\d{2})$/);
    
    let doseDateTime: Date;
    if (timeMatch) {
      doseDateTime = new Date(year, month - 1, day, parseInt(timeMatch[1]), parseInt(timeMatch[2]));
    } else {
      // Handle preset times
      const timeMap: { [key: string]: number } = { 'Morning': 8, 'Afternoon': 14, 'Evening': 18 };
      const hour = timeMap[dose.scheduled_time] || 8;
      doseDateTime = new Date(year, month - 1, day, hour, 0);
    }
    
    // More lenient filter: include doses within next 2 minutes (to catch "just added" doses)
    const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);
    return doseDateTime > twoMinutesAgo && doseDateTime <= sevenDaysFromNow;
  });

  console.log(`📅 Scheduling ${upcomingDoses.length} notifications from ${doses.length} total doses`);
  console.log(`💎 Premium status: ${isPremium ? 'Yes (actions enabled)' : 'No'}`);

  // Track scheduled IDs to detect collisions
  const scheduledIds = new Map<number, string>();
  let successCount = 0;
  let collisionCount = 0;

  for (const dose of upcomingDoses) {
    try {
      const doseWithName = {
        ...dose,
        compound_name: dose.compound_name || dose.compounds?.name || 'Medication'
      };
      
      // Check for ID collision before scheduling
      const notificationId = generateNotificationId(dose.id);
      if (scheduledIds.has(notificationId)) {
        console.warn(`⚠️ ID collision detected: ${notificationId} for ${doseWithName.compound_name} (already used by ${scheduledIds.get(notificationId)})`);
        collisionCount++;
        // Still schedule - iOS/Android will just update the existing notification
      }
      scheduledIds.set(notificationId, doseWithName.compound_name);
      
      await scheduleDoseNotification(doseWithName, isPremium);
      successCount++;
    } catch (error) {
      console.error('❌ Failed to schedule notification for dose:', dose.id, error);
    }
  }

  console.log(`✅ Scheduled ${successCount}/${upcomingDoses.length} notifications`);
  if (collisionCount > 0) {
    console.warn(`⚠️ ${collisionCount} ID collisions detected - some notifications may have been overwritten`);
  }
  
  // Log all pending notifications for verification
  try {
    const pending = await LocalNotifications.getPending();
    console.log(`📋 Total pending notifications: ${pending.notifications.length}`);
    pending.notifications.slice(0, 10).forEach(notif => {
      console.log(`   - ID ${notif.id}: scheduled for ${notif.schedule?.at}`);
    });
    if (pending.notifications.length > 10) {
      console.log(`   ... and ${pending.notifications.length - 10} more`);
    }
  } catch (error) {
    console.error('Error checking pending notifications:', error);
  }
};

// Handle notification action responses (Premium feature)
export const setupNotificationActionHandlers = () => {
  if (!Capacitor.isNativePlatform()) return;

  LocalNotifications.addListener('localNotificationActionPerformed', async (notification) => {
    const doseId = notification.notification.extra?.doseId;
    const actionId = notification.actionId;

    if (!doseId) return;

    console.log('🔔 Notification action:', actionId, 'for dose:', doseId);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      switch (actionId) {
        case 'take-now':
          // Mark dose as taken
          await supabase
            .from('doses')
            .update({ taken: true, taken_at: new Date().toISOString() })
            .eq('id', doseId);
          
          toast({
            title: "Dose logged! 💊",
            description: "Great job staying on track!",
          });
          break;

        case 'remind-15':
          // Reschedule for 15 minutes from now
          await rescheduleDose(doseId, 15);
          toast({
            title: "Reminder set ⏰",
            description: "We'll remind you in 15 minutes",
          });
          break;

        case 'remind-60':
          // Reschedule for 1 hour from now
          await rescheduleDose(doseId, 60);
          toast({
            title: "Reminder set ⏰",
            description: "We'll remind you in 1 hour",
          });
          break;

        case 'skip':
          // Mark as skipped (you could add a 'skipped' field to the database)
          toast({
            title: "Dose skipped",
            description: "No worries, we'll remind you for the next one",
          });
          break;
      }
    } catch (error) {
      console.error('Error handling notification action:', error);
    }
  });
};

// Helper function to reschedule a dose
const rescheduleDose = async (doseId: string, minutesFromNow: number) => {
  try {
    // Get dose details
    const { data: dose } = await supabase
      .from('doses')
      .select('*, compounds(name)')
      .eq('id', doseId)
      .single();

    if (!dose) return;

    // Cancel existing notification
    await cancelDoseNotification(doseId);

    // Create new notification time
    const newTime = new Date();
    newTime.setMinutes(newTime.getMinutes() + minutesFromNow);

    // Schedule new notification
    const doseWithName = {
      id: dose.id,
      compound_name: dose.compounds?.name || 'Medication',
      dose_amount: dose.dose_amount,
      dose_unit: dose.dose_unit,
      scheduled_date: newTime.toISOString().split('T')[0],
      scheduled_time: `${newTime.getHours()}:${newTime.getMinutes().toString().padStart(2, '0')}`,
    };

    // Check premium status from localStorage
    const isPremium = localStorage.getItem('testPremiumMode') === 'true';

    await scheduleDoseNotification(doseWithName, isPremium);
  } catch (error) {
    console.error('Error rescheduling dose:', error);
  }
};
