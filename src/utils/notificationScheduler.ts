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
      console.log(`✅ Parsed custom time: ${dose.scheduled_time} -> ${time.hour}:${time.minute}`);
    } else {
      // Preset time (Morning/Afternoon/Evening)
      const timeMap: { [key: string]: { hour: number; minute: number } } = {
        'Morning': { hour: 8, minute: 0 },
        'Afternoon': { hour: 14, minute: 0 },
        'Evening': { hour: 18, minute: 0 },
      };
      
      time = timeMap[dose.scheduled_time] || { hour: 8, minute: 0 };
      console.log(`✅ Parsed preset time: ${dose.scheduled_time} -> ${time.hour}:${time.minute}`);
    }
    
    // Create notification date
    const notificationDate = new Date(dose.scheduled_date);
    notificationDate.setHours(time.hour, time.minute, 0, 0);

    // Only schedule if in the future (with 1 minute buffer to catch notifications just created)
    const now = Date.now();
    const oneMinuteAgo = now - (60 * 1000);
    if (notificationDate.getTime() < oneMinuteAgo) {
      console.log('Skipping past notification:', dose.compound_name, 'at', notificationDate);
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
          title: 'Regimen',
          body: `Time for ${dose.compound_name} (${dose.dose_amount}${dose.dose_unit})`,
          schedule: { at: notificationDate },
          sound: 'light_bubble_pop_regimen.m4a', // Custom sound (requires adding to native projects)
          smallIcon: 'ic_stat_icon_config_sample',
          iconColor: '#FF6F61',
          // Only add actions for premium users
          actionTypeId: isPremium ? 'DOSE_ACTIONS' : undefined,
          extra: {
            doseId: dose.id,
          },
        },
      ],
    });

    console.log('✅ Successfully scheduled notification for:', dose.compound_name, 'at', notificationDate.toLocaleString());
    console.log('   Notification ID:', parseInt(dose.id.replace(/\D/g, '').substring(0, 9)));
    console.log('   Time until notification:', Math.round((notificationDate.getTime() - Date.now()) / 1000 / 60), 'minutes');
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

export const scheduleAllUpcomingDoses = async (doses: any[], isPremium: boolean = false) => {
  if (!Capacitor.isNativePlatform()) {
    console.log('⚠️ Not on native platform - notifications disabled');
    return;
  }

  console.log('🔔 Checking notification permissions...');
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    console.error('❌ Notification permissions NOT granted!');
    console.log('Please enable notifications in iPhone Settings > Regimen > Notifications');
    return;
  }
  console.log('✅ Notification permissions granted');

  // Cancel all existing notifications first
  await cancelAllNotifications();
  console.log('🗑️ Cleared all existing notifications');

  // Schedule notifications for upcoming doses (next 7 days)
  const now = new Date();
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(now.getDate() + 7);

  const upcomingDoses = doses.filter(dose => {
    if (dose.taken) return false; // Don't schedule for already taken doses
    const doseDate = new Date(dose.scheduled_date);
    return doseDate >= now && doseDate <= sevenDaysFromNow;
  });

  console.log(`📅 Scheduling ${upcomingDoses.length} notifications from ${doses.length} total doses`);
  console.log(`💎 Premium status: ${isPremium ? 'Yes (actions enabled)' : 'No (actions disabled)'}`);

  let successCount = 0;
  for (const dose of upcomingDoses) {
    try {
      // Ensure compound_name is available
      const doseWithName = {
        ...dose,
        compound_name: dose.compound_name || dose.compounds?.name || 'Medication'
      };
      await scheduleDoseNotification(doseWithName, isPremium);
      successCount++;
    } catch (error) {
      console.error('❌ Failed to schedule notification for dose:', dose.id, error);
    }
  }

  console.log(`✅ Successfully scheduled ${successCount}/${upcomingDoses.length} notifications`);
  
  // Log all pending notifications for verification
  try {
    const pending = await LocalNotifications.getPending();
    console.log(`📋 Total pending notifications: ${pending.notifications.length}`);
    pending.notifications.forEach(notif => {
      console.log(`   - ID ${notif.id}: "${notif.title}" at ${notif.schedule?.at}`);
    });
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
