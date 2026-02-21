import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export type ExactAlarmStatus = 'granted' | 'denied' | 'not_applicable';

/**
 * Check if exact alarms can be scheduled on Android 12+.
 * 
 * Since Capacitor's LocalNotifications plugin doesn't expose canScheduleExactAlarms(),
 * we use a probe approach: schedule a far-future test notification, check if it appears
 * in pending, then cancel it. If it doesn't appear, exact alarms are blocked.
 * 
 * On iOS or web, always returns 'not_applicable'.
 */
export const checkExactAlarmPermission = async (): Promise<ExactAlarmStatus> => {
  if (!Capacitor.isNativePlatform()) return 'not_applicable';
  if (Capacitor.getPlatform() !== 'android') return 'not_applicable';

  const PROBE_ID = 2147483646; // Near max 32-bit int, unlikely to collide

  try {
    // First check basic notification permission
    const permStatus = await LocalNotifications.checkPermissions();
    if (permStatus.display !== 'granted') {
      // Can't even test if base permission isn't granted
      return 'denied';
    }

    // Schedule a probe notification far in the future
    const probeDate = new Date();
    probeDate.setFullYear(probeDate.getFullYear() + 1); // 1 year from now

    await LocalNotifications.schedule({
      notifications: [{
        id: PROBE_ID,
        title: 'Probe',
        body: 'Probe',
        schedule: { at: probeDate },
      }],
    });

    // Check if it's actually pending
    const { notifications: pending } = await LocalNotifications.getPending();
    const probeFound = pending.some(n => n.id === PROBE_ID);

    // Clean up - cancel the probe
    try {
      await LocalNotifications.cancel({ notifications: [{ id: PROBE_ID }] });
    } catch {
      // Ignore cancel errors
    }

    console.log(`[AndroidAlarm] Exact alarm probe: ${probeFound ? 'GRANTED' : 'DENIED'}`);
    return probeFound ? 'granted' : 'denied';
  } catch (error) {
    console.error('[AndroidAlarm] Error checking exact alarm permission:', error);
    // If scheduling threw, exact alarms are likely blocked
    return 'denied';
  }
};

/**
 * Open the Android system settings page for "Alarms & Reminders" permission.
 * Falls back to general app settings if the intent isn't available.
 */
export const openExactAlarmSettings = async (): Promise<void> => {
  if (Capacitor.getPlatform() !== 'android') return;

  try {
    // Try to open the exact alarm settings page via Browser plugin
    // The intent URI format for SCHEDULE_EXACT_ALARM settings
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ 
      url: 'package:app.lovable.348ffbbac09744d8bbbea7cee13c09a9',
      presentationStyle: 'popover',
    });
  } catch (error) {
    console.error('[AndroidAlarm] Error opening alarm settings, trying app settings:', error);
    try {
      // Fallback: open general app info settings
      const { App } = await import('@capacitor/app');
      // This opens the app's info page in Android settings
      await (App as any).openUrl?.({ url: 'app-settings:' });
    } catch (fallbackError) {
      console.error('[AndroidAlarm] Fallback also failed:', fallbackError);
    }
  }
};
