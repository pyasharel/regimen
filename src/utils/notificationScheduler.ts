import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

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

export const scheduleDoseNotification = async (
  dose: {
    id: string;
    compound_name: string;
    dose_amount: number;
    dose_unit: string;
    scheduled_date: string;
    scheduled_time: string;
  }
) => {
  if (!Capacitor.isNativePlatform()) return;

  try {
    // Parse the scheduled time
    const timeMap: { [key: string]: { hour: number; minute: number } } = {
      'Morning': { hour: 8, minute: 0 },
      'Afternoon': { hour: 14, minute: 0 },
      'Evening': { hour: 18, minute: 0 },
    };

    let time = timeMap[dose.scheduled_time];
    
    // If not a preset time, try to parse as HH:MM format (custom time)
    if (!time) {
      const customTimeMatch = dose.scheduled_time.match(/^(\d{1,2}):(\d{2})$/);
      if (customTimeMatch) {
        time = {
          hour: parseInt(customTimeMatch[1]),
          minute: parseInt(customTimeMatch[2])
        };
      } else {
        // Fallback to morning if we can't parse
        time = { hour: 8, minute: 0 };
      }
    }
    
    // Create notification date
    const notificationDate = new Date(dose.scheduled_date);
    notificationDate.setHours(time.hour, time.minute, 0, 0);

    // Only schedule if in the future
    if (notificationDate.getTime() <= Date.now()) {
      return;
    }

    // Get badge count for pending doses today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data: pendingDoses } = await supabase
      .from('doses')
      .select('id')
      .eq('taken', false)
      .gte('scheduled_date', today.toISOString().split('T')[0]);
    
    const badgeCount = pendingDoses?.length || 0;

    await LocalNotifications.schedule({
      notifications: [
        {
          id: parseInt(dose.id.replace(/\D/g, '').substring(0, 9)), // Convert UUID to number
          title: 'Regimen: Time for your dose',
          body: `${dose.compound_name} - ${dose.dose_amount} ${dose.dose_unit}`,
          schedule: { at: notificationDate },
          sound: 'light_bubble_pop.mp3', // Custom sound (requires adding to native projects)
          smallIcon: 'ic_stat_icon_config_sample',
          iconColor: '#FF6F61',
          actionTypeId: 'DOSE_ACTIONS',
          extra: {
            doseId: dose.id,
          },
        },
      ],
    });

    console.log('Scheduled notification for:', dose.compound_name, 'at', notificationDate);
  } catch (error) {
    console.error('Error scheduling notification:', error);
  }
};

export const cancelDoseNotification = async (doseId: string) => {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const notificationId = parseInt(doseId.replace(/\D/g, '').substring(0, 9));
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

export const scheduleAllUpcomingDoses = async (doses: any[]) => {
  if (!Capacitor.isNativePlatform()) return;

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    console.log('Notification permissions not granted');
    return;
  }

  // Cancel all existing notifications first
  await cancelAllNotifications();

  // Schedule notifications for upcoming doses (next 7 days)
  const now = new Date();
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(now.getDate() + 7);

  const upcomingDoses = doses.filter(dose => {
    if (dose.taken) return false; // Don't schedule for already taken doses
    const doseDate = new Date(dose.scheduled_date);
    return doseDate >= now && doseDate <= sevenDaysFromNow;
  });

  console.log(`Scheduling ${upcomingDoses.length} notifications from ${doses.length} total doses`);

  for (const dose of upcomingDoses) {
    // Ensure compound_name is available
    const doseWithName = {
      ...dose,
      compound_name: dose.compound_name || dose.compounds?.name || 'Medication'
    };
    await scheduleDoseNotification(doseWithName);
  }

  console.log(`Successfully scheduled ${upcomingDoses.length} notifications`);
};
