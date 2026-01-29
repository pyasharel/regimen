import { useEffect, useRef } from 'react';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { persistentStorage } from '@/utils/persistentStorage';
import { scheduleAllUpcomingDoses, ensureDoseActionTypesRegistered } from '@/utils/notificationScheduler';
import { supabase } from '@/integrations/supabase/client';

const PROMPT_THROTTLE_KEY = 'notificationPermissionPromptLastShownAt';
const PROMPT_THROTTLE_MS = 24 * 60 * 60 * 1000; // 24 hours between prompts

/**
 * Hook that auto-triggers iOS notification permission prompt when conditions are met.
 * 
 * Automatically calls requestPermissions() (no banner, no user tap required) when:
 * - OS permission is 'prompt' (never asked or reset after reinstall)
 * - User has dose reminders preference enabled (default true)
 * - User has at least one active compound
 * - Haven't prompted in last 24 hours
 * 
 * After granting permission, immediately schedules all upcoming dose notifications.
 */
export function useNotificationPermissionPrompt(
  hasActiveCompounds: boolean,
  isSubscribed: boolean
): void {
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    // Prevent double-triggering
    if (hasTriggeredRef.current) return;
    
    const autoTriggerPermission = async () => {
      if (!Capacitor.isNativePlatform()) return;

      try {
        // Step 1: Check OS permission status
        const status = await LocalNotifications.checkPermissions();
        const permissionStatus = status.display;
        
        console.log('[AutoNotificationPrompt] OS permission:', permissionStatus);

        // Only proceed if permission is 'prompt' (not granted, not denied)
        if (permissionStatus !== 'prompt') {
          console.log('[AutoNotificationPrompt] Permission already', permissionStatus, '- no action needed');
          return;
        }

        // Step 2: Check if user wants dose reminders (default true)
        const doseRemindersDesired = await persistentStorage.getBoolean('doseReminders', true);
        if (!doseRemindersDesired) {
          console.log('[AutoNotificationPrompt] User has disabled dose reminders in settings');
          return;
        }

        // Step 3: Check throttle - don't prompt if we prompted recently
        const lastPromptedAt = await persistentStorage.get(PROMPT_THROTTLE_KEY);
        if (lastPromptedAt) {
          const elapsed = Date.now() - parseInt(lastPromptedAt, 10);
          if (elapsed < PROMPT_THROTTLE_MS) {
            console.log('[AutoNotificationPrompt] Throttled - prompted', Math.round(elapsed / 1000 / 60), 'minutes ago');
            return;
          }
        }

        // Step 4: Check if user has active compounds
        if (!hasActiveCompounds) {
          console.log('[AutoNotificationPrompt] No active compounds - skipping prompt');
          return;
        }

        // All conditions met - auto-trigger the iOS permission dialog
        hasTriggeredRef.current = true;
        console.log('[AutoNotificationPrompt] Auto-triggering permission request...');

        // Register action types first
        await ensureDoseActionTypesRegistered();

        // Request permission (this shows the iOS system dialog)
        const result = await LocalNotifications.requestPermissions();
        const granted = result.display === 'granted';

        console.log('[AutoNotificationPrompt] Permission result:', granted ? 'granted' : 'denied');

        // Record that we prompted (regardless of outcome) for throttle
        await persistentStorage.set(PROMPT_THROTTLE_KEY, Date.now().toString());

        if (granted) {
          // Schedule notifications immediately after grant
          console.log('[AutoNotificationPrompt] Scheduling notifications after grant...');
          
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: allDoses } = await supabase
              .from('doses')
              .select('*, compounds(name, is_active)')
              .eq('user_id', user.id)
              .eq('taken', false);

            if (allDoses) {
              const activeDoses = allDoses.filter(d => d.compounds?.is_active !== false);
              const dosesWithName = activeDoses.map(d => ({
                ...d,
                compound_name: d.compounds?.name || 'Medication'
              }));
              await scheduleAllUpcomingDoses(dosesWithName, isSubscribed);
              console.log('[AutoNotificationPrompt] Scheduled', dosesWithName.length, 'notifications');
            }
          }
        }
      } catch (error) {
        console.error('[AutoNotificationPrompt] Error:', error);
      }
    };

    // Small delay to let the screen finish rendering before showing system dialog
    const timeoutId = setTimeout(autoTriggerPermission, 1500);
    
    return () => clearTimeout(timeoutId);
  }, [hasActiveCompounds, isSubscribed]);
}
