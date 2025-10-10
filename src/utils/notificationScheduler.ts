import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export const requestNotificationPermissions = async () => {
  if (!Capacitor.isNativePlatform()) {
    console.log('Notifications only available on native platforms');
    return false;
  }

  try {
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

    const time = timeMap[dose.scheduled_time] || { hour: 8, minute: 0 };
    
    // Create notification date
    const notificationDate = new Date(dose.scheduled_date);
    notificationDate.setHours(time.hour, time.minute, 0, 0);

    // Only schedule if in the future
    if (notificationDate.getTime() <= Date.now()) {
      return;
    }

    await LocalNotifications.schedule({
      notifications: [
        {
          id: parseInt(dose.id.replace(/\D/g, '').substring(0, 9)), // Convert UUID to number
          title: '💊 Time for your medication',
          body: `${dose.compound_name} - ${dose.dose_amount} ${dose.dose_unit}`,
          schedule: { at: notificationDate },
          sound: 'default',
          smallIcon: 'ic_stat_icon_config_sample',
          iconColor: '#FF6F61',
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

  for (const dose of upcomingDoses) {
    await scheduleDoseNotification(dose);
  }

  console.log(`Scheduled ${upcomingDoses.length} notifications`);
};
