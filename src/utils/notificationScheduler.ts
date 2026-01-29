import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { enqueuePendingAction } from './pendingDoseActions';

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
            // Store metadata so action handlers don't need to query DB
            compoundName: dose.compound_name,
            doseAmount: dose.dose_amount,
            doseUnit: dose.dose_unit,
            scheduledDate: dose.scheduled_date,
            scheduledTime: dose.scheduled_time,
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

  // CHECK permissions instead of REQUESTING during sync/resume
  // This prevents iOS permission dialogs from appearing during boot
  // and causing native bridge contention
  console.log('🔔 Checking notification permissions (without prompting)...');
  try {
    const permissionStatus = await LocalNotifications.checkPermissions();
    if (permissionStatus.display !== 'granted') {
      console.log('⚠️ Notification permissions not granted - skipping scheduling');
      console.log('   (Permission will be requested during onboarding or settings)');
      return;
    }
  } catch (error) {
    console.error('❌ Error checking notification permissions:', error);
    return;
  }
  console.log('✅ Notification permissions already granted');

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

// Track if handlers are already registered (prevent double-registration)
let handlersRegistered = false;

/**
 * Handle notification action responses (Premium feature)
 * 
 * IMPORTANT: This handler is intentionally minimal and does NOT:
 * - Call supabase.auth.getUser()
 * - Make database queries
 * - Show toasts or UI updates
 * 
 * This prevents crashes/hangs when the app is resuming or not fully initialized.
 * Actions that need backend work are queued and processed later by useAppStateSync.
 */
export const setupNotificationActionHandlers = () => {
  if (!Capacitor.isNativePlatform()) return;
  if (handlersRegistered) {
    console.log('[Notifications] Handlers already registered, skipping');
    return;
  }
  
  handlersRegistered = true;
  console.log('[Notifications] Registering action handlers');

  LocalNotifications.addListener('localNotificationActionPerformed', async (notification) => {
    const extra = notification.notification.extra || {};
    const doseId = extra.doseId;
    const actionId = notification.actionId;

    if (!doseId) {
      console.log('[Notifications] No doseId in notification, ignoring action');
      return;
    }

    console.log('[Notifications] Action performed:', actionId, 'for dose:', doseId);

    // Extract metadata from notification (no DB query needed)
    const compoundName = extra.compoundName || 'Medication';
    const doseAmount = extra.doseAmount || 0;
    const doseUnit = extra.doseUnit || '';

    try {
      switch (actionId) {
        case 'take-now':
          // Queue the action for processing when app is fully ready
          await enqueuePendingAction(doseId, 'take-now', {
            compoundName,
            doseAmount,
            doseUnit,
          });
          console.log('[Notifications] Queued take-now action for dose:', doseId);
          break;

        case 'remind-15':
          // Schedule new notification directly (no DB needed)
          await rescheduleNotificationLocally(doseId, 15, {
            compoundName,
            doseAmount,
            doseUnit,
          });
          console.log('[Notifications] Rescheduled reminder for 15 minutes');
          break;

        case 'remind-60':
          // Schedule new notification directly (no DB needed)
          await rescheduleNotificationLocally(doseId, 60, {
            compoundName,
            doseAmount,
            doseUnit,
          });
          console.log('[Notifications] Rescheduled reminder for 1 hour');
          break;

        case 'skip':
          // Queue the action for processing when app is fully ready
          await enqueuePendingAction(doseId, 'skip', {
            compoundName,
            doseAmount,
            doseUnit,
          });
          console.log('[Notifications] Queued skip action for dose:', doseId);
          break;

        default:
          console.log('[Notifications] Unknown action:', actionId);
      }
    } catch (error) {
      console.error('[Notifications] Error handling action:', error);
      // Don't throw - we never want to crash in the notification handler
    }
  });
};

/**
 * Reschedule a notification locally without querying the database
 * Uses metadata stored in the notification's extra field
 */
const rescheduleNotificationLocally = async (
  doseId: string,
  minutesFromNow: number,
  metadata: { compoundName: string; doseAmount: number; doseUnit: string }
) => {
  try {
    // Cancel existing notification
    await cancelDoseNotification(doseId);

    // Create new notification time
    const newTime = new Date();
    newTime.setMinutes(newTime.getMinutes() + minutesFromNow);

    // Schedule new notification using stored metadata
    const doseWithName = {
      id: doseId,
      compound_name: metadata.compoundName,
      dose_amount: metadata.doseAmount,
      dose_unit: metadata.doseUnit,
      scheduled_date: newTime.toISOString().split('T')[0],
      scheduled_time: `${newTime.getHours()}:${newTime.getMinutes().toString().padStart(2, '0')}`,
    };

    // Check premium status from localStorage (sync access, no await)
    const isPremium = localStorage.getItem('testPremiumMode') === 'true';

    await scheduleDoseNotification(doseWithName, isPremium);
  } catch (error) {
    console.error('[Notifications] Error rescheduling notification:', error);
  }
};
