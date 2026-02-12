import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { enqueuePendingAction } from './pendingDoseActions';

// Track if action types are registered
let actionTypesRegistered = false;

// Debounce rapid scheduling calls to prevent duplicate notifications
// when DoseEditModal reschedule overlaps with app resume sync
let lastScheduleTime = 0;
const SCHEDULE_DEBOUNCE_MS = 5000; // 5 seconds between full reschedules

// Safety guard: don't reschedule notifications within this window of their fire time
const NEAR_FIRE_GUARD_MS = 90 * 1000; // 90 seconds

/**
 * Register notification action types without requesting permissions
 * Safe to call multiple times - will only register once
 */
export const ensureDoseActionTypesRegistered = async (): Promise<void> => {
  if (!Capacitor.isNativePlatform()) return;
  if (actionTypesRegistered) return;

  try {
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
    actionTypesRegistered = true;
    console.log('[Notifications] Action types registered');
  } catch (error) {
    console.error('[Notifications] Error registering action types:', error);
  }
};

export const requestNotificationPermissions = async (): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) {
    console.log('Notifications only available on native platforms');
    return false;
  }

  try {
    // Register action types first
    await ensureDoseActionTypesRegistered();

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

/**
 * Resolve scheduled_time to hour:minute
 * Handles both preset times (Morning/Afternoon/Evening) and custom HH:MM format
 */
const resolveTimeToMinutes = (scheduledTime: string): { hour: number; minute: number } => {
  // Try custom time in HH:MM format first
  const customTimeMatch = scheduledTime.match(/^(\d{1,2}):(\d{2})$/);
  if (customTimeMatch) {
    return {
      hour: parseInt(customTimeMatch[1]),
      minute: parseInt(customTimeMatch[2])
    };
  }
  
  // Preset time mapping
  const timeMap: { [key: string]: { hour: number; minute: number } } = {
    'Morning': { hour: 8, minute: 0 },
    'Afternoon': { hour: 14, minute: 0 },
    'Evening': { hour: 18, minute: 0 },
  };
  
  return timeMap[scheduledTime] || { hour: 8, minute: 0 };
};

/**
 * Create a deduplication key for a dose based on compound + date + resolved time
 */
const createDedupeKey = (dose: any): string => {
  const time = resolveTimeToMinutes(dose.scheduled_time);
  const hourStr = time.hour.toString().padStart(2, '0');
  const minStr = time.minute.toString().padStart(2, '0');
  return `${dose.compound_id}|${dose.scheduled_date}|${hourStr}:${minStr}`;
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
    const time = resolveTimeToMinutes(dose.scheduled_time);
    
    // Create notification date - parse the date properly to avoid timezone issues
    const [year, month, day] = dose.scheduled_date.split('-').map(Number);
    const notificationDate = new Date(year, month - 1, day, time.hour, time.minute, 0, 0);

    // STRICT FUTURE-ONLY: Only schedule if at least 5 seconds in the future
    // This prevents "immediate fire" if anything tries to schedule at current/past time
    const now = Date.now();
    const STRICT_FUTURE_BUFFER_MS = 5000; // 5 seconds
    if (notificationDate.getTime() <= now + STRICT_FUTURE_BUFFER_MS) {
      console.log(`⏭️ Skipping past/immediate notification: ${dose.compound_name} at ${notificationDate.toLocaleString()}`);
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
          sound: Capacitor.getPlatform() === 'ios' ? 'light_bubble_pop_regimen.m4a' : undefined,
          smallIcon: 'ic_stat_icon_config_sample',
          iconColor: '#FF6F61',
          actionTypeId: isPremium ? 'DOSE_ACTIONS' : undefined,
          extra: {
            type: 'dose', // Tag to identify dose notifications
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

/**
 * Idempotent notification scheduler - reconciles pending vs desired instead of wipe-and-rebuild
 * This prevents duplicate notifications when rescheduling near the fire time
 */
export const scheduleAllUpcomingDoses = async (doses: any[], isPremium: boolean = false, freeCompoundId?: string) => {
  if (!Capacitor.isNativePlatform()) {
    console.log('⚠️ Not on native platform - notifications disabled');
    return;
  }

  // Debounce rapid scheduling calls to prevent duplicate notifications
  const debounceNow = Date.now();
  if (debounceNow - lastScheduleTime < SCHEDULE_DEBOUNCE_MS) {
    console.log('⏭️ Skipping duplicate schedule call (debounced - last call was', 
      Math.round((debounceNow - lastScheduleTime) / 1000), 'seconds ago)');
    return;
  }
  lastScheduleTime = debounceNow;

  // CHECK permissions instead of REQUESTING during sync/resume
  console.log('🔔 Checking notification permissions (without prompting)...');
  try {
    const permissionStatus = await LocalNotifications.checkPermissions();
    if (permissionStatus.display !== 'granted') {
      console.log('⚠️ Notification permissions not granted - skipping scheduling');
      return;
    }
  } catch (error) {
    console.error('❌ Error checking notification permissions:', error);
    return;
  }
  console.log('✅ Notification permissions already granted');

  const now = new Date();
  now.setSeconds(0, 0); // Normalize to start of minute
  const nowMs = now.getTime();
  
  const sevenDaysFromNow = new Date(now);
  sevenDaysFromNow.setDate(now.getDate() + 7);

  // === Step 1: Build desired notifications map ===
  // First, dedupe doses by compound + date + resolved time
  const seenDedupeKeys = new Map<string, any>();
  
  // If freeCompoundId is set, only schedule for that compound (freemium gating)
  const filteredDoses = freeCompoundId
    ? doses.filter(d => d.compound_id === freeCompoundId)
    : doses;

  const upcomingDoses = filteredDoses.filter(dose => {
    if (dose.taken || dose.skipped) return false;
    
    // Parse the dose date and time
    const [year, month, day] = dose.scheduled_date.split('-').map(Number);
    const time = resolveTimeToMinutes(dose.scheduled_time);
    const doseDateTime = new Date(year, month - 1, day, time.hour, time.minute);
    
    // Only schedule strictly future doses
    if (doseDateTime <= now || doseDateTime > sevenDaysFromNow) return false;
    
    // Dedupe by compound + date + resolved time
    const dedupeKey = createDedupeKey(dose);
    if (seenDedupeKeys.has(dedupeKey)) {
      console.log(`⚠️ Duplicate dose detected: ${dose.compound_name || dose.compounds?.name} at ${dose.scheduled_date} ${dose.scheduled_time}`);
      return false; // Skip this duplicate
    }
    seenDedupeKeys.set(dedupeKey, dose);
    
    return true;
  });

  // Build map of desired notification ID -> { dose, dateTime }
  const desiredNotifications = new Map<number, { dose: any; dateTime: Date }>();
  
  for (const dose of upcomingDoses) {
    const doseWithName = {
      ...dose,
      compound_name: dose.compound_name || dose.compounds?.name || 'Medication'
    };
    
    const [year, month, day] = dose.scheduled_date.split('-').map(Number);
    const time = resolveTimeToMinutes(dose.scheduled_time);
    const dateTime = new Date(year, month - 1, day, time.hour, time.minute);
    
    const notificationId = generateNotificationId(dose.id);
    desiredNotifications.set(notificationId, { dose: doseWithName, dateTime });
  }

  console.log(`📅 Desired notifications: ${desiredNotifications.size} from ${doses.length} total doses`);
  console.log(`💎 Premium status: ${isPremium ? 'Yes (actions enabled)' : 'No'}`);

  // === Step 2: Get currently pending notifications ===
  let pendingNotifications: any[] = [];
  try {
    const pending = await LocalNotifications.getPending();
    pendingNotifications = pending.notifications || [];
    console.log(`📋 Currently pending notifications: ${pendingNotifications.length}`);
  } catch (error) {
    console.error('Error getting pending notifications:', error);
    // Fall back to cancel-all approach if we can't read pending
    await cancelAllNotifications();
    for (const [, { dose }] of desiredNotifications) {
      await scheduleDoseNotification(dose, isPremium);
    }
    return;
  }

  // Build map of pending dose notifications: id -> { scheduledAt, extra }
  // This includes both tagged notifications (extra.type === 'dose') AND legacy ones
  const pendingDoseNotifications = new Map<number, { scheduledAt: Date; extra: any; isLegacy: boolean }>();
  const legacyNotificationsToCancel: number[] = [];
  
  for (const notif of pendingNotifications) {
    const scheduledAt = notif.schedule?.at ? new Date(notif.schedule.at) : null;
    if (!scheduledAt) continue;
    
    // Check if this is a tagged dose notification (new system)
    if (notif.extra?.type === 'dose' || notif.extra?.doseId) {
      pendingDoseNotifications.set(notif.id, { scheduledAt, extra: notif.extra, isLegacy: false });
    }
    // Check for legacy dose notifications by signature:
    // title = "Regimen" AND body starts with "Time for"
    else if (
      (notif.title === 'Regimen' || notif.title?.startsWith('Regimen')) &&
      notif.body?.startsWith('Time for ')
    ) {
      // This is a legacy dose notification
      console.log(`🔍 Found legacy notification ID ${notif.id}: "${notif.body}" at ${scheduledAt.toLocaleString()}`);
      
      // Apply near-fire guard: don't cancel if it's about to fire
      const msUntilFire = scheduledAt.getTime() - nowMs;
      if (msUntilFire < NEAR_FIRE_GUARD_MS && msUntilFire > 0) {
        console.log(`⏰ Near-fire guard: keeping legacy notification (fires in ${Math.round(msUntilFire / 1000)}s)`);
      } else {
        // Queue for cancellation
        legacyNotificationsToCancel.push(notif.id);
      }
    }
  }

  console.log(`📋 Pending DOSE notifications: ${pendingDoseNotifications.size}, Legacy to cancel: ${legacyNotificationsToCancel.length}`);

  // === Step 3: Reconcile ===
  const toCancel: number[] = [];
  const toSchedule: { dose: any; dateTime: Date }[] = [];
  let keptCount = 0;

  // Check each pending dose notification
  for (const [id, { scheduledAt }] of pendingDoseNotifications) {
    if (!desiredNotifications.has(id)) {
      // This notification is no longer desired (dose taken/deleted/off-cycle)
      toCancel.push(id);
    } else {
      // Check if the scheduled time matches
      const desired = desiredNotifications.get(id)!;
      const timeDiff = Math.abs(desired.dateTime.getTime() - scheduledAt.getTime());
      
      if (timeDiff > 60 * 1000) { // More than 1 minute difference
        // Time differs - need to reschedule
        // But apply near-fire guard: don't reschedule if close to firing
        if (scheduledAt.getTime() - nowMs < NEAR_FIRE_GUARD_MS) {
          console.log(`⏰ Near-fire guard: keeping notification for ${desired.dose.compound_name} (fires in ${Math.round((scheduledAt.getTime() - nowMs) / 1000)}s)`);
          keptCount++;
        } else {
          toCancel.push(id);
          toSchedule.push(desired);
        }
      } else {
        // Time matches, keep it
        keptCount++;
      }
      
      // Remove from desired so we don't schedule it again
      desiredNotifications.delete(id);
    }
  }

  // Any remaining desired notifications need to be scheduled (they weren't pending)
  for (const [, desired] of desiredNotifications) {
    toSchedule.push(desired);
  }

  console.log(`📊 Reconciliation: keep=${keptCount}, cancel=${toCancel.length}, schedule=${toSchedule.length}, legacy_cleanup=${legacyNotificationsToCancel.length}`);

  // === Step 4: Execute changes ===
  // Cancel unwanted notifications (including legacy cleanup)
  const allToCancel = [...toCancel, ...legacyNotificationsToCancel];
  if (allToCancel.length > 0) {
    try {
      await LocalNotifications.cancel({
        notifications: allToCancel.map(id => ({ id }))
      });
      console.log(`🗑️ Canceled ${allToCancel.length} notifications (${toCancel.length} stale + ${legacyNotificationsToCancel.length} legacy)`);
    } catch (error) {
      console.error('Error canceling notifications:', error);
    }
  }

  // Schedule new/updated notifications
  let successCount = 0;
  for (const { dose } of toSchedule) {
    try {
      await scheduleDoseNotification(dose, isPremium);
      successCount++;
    } catch (error) {
      console.error('❌ Failed to schedule notification for dose:', dose.id, error);
    }
  }

  console.log(`✅ Scheduled ${successCount}/${toSchedule.length} new notifications`);
  console.log(`📋 Final state: ${keptCount + successCount} total dose notifications`);
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

  // Register action types at startup (safe, no permission prompt)
  ensureDoseActionTypesRegistered();

  LocalNotifications.addListener('localNotificationActionPerformed', async (notification) => {
    const extra = notification.notification.extra || {};
    const doseId = extra.doseId;
    const actionId = notification.actionId;

    // Dispatch custom resume event to trigger recovery logic
    // This ensures the app runs resume handlers even if appStateChange/visibilitychange fails
    try {
      window.dispatchEvent(new Event('regimen:resume'));
      console.log('[Notifications] Dispatched regimen:resume event');
    } catch (e) {
      console.warn('[Notifications] Failed to dispatch resume event:', e);
    }

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
