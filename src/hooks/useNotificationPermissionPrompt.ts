import { useEffect, useRef } from 'react';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { persistentStorage } from '@/utils/persistentStorage';
import { scheduleAllUpcomingDoses, ensureDoseActionTypesRegistered } from '@/utils/notificationScheduler';
import { dataClient } from '@/integrations/supabase/dataClient';
import { getUserIdWithFallback } from '@/utils/safeAuth';
import { withQueryTimeout } from '@/utils/withTimeout';

const PROMPT_THROTTLE_KEY = 'notificationPermissionPromptLastShownAt';
const PROMPT_THROTTLE_LS_KEY = 'regimen_notification_prompt_last'; // localStorage mirror for fast sync check
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
 * 
 * IMPORTANT: Uses getUserIdWithFallback() and dataClient to avoid auth lock contention
 * that can occur when supabase.auth.getUser() is called right after permission dialogs.
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
        // Step 0: Fast synchronous throttle check via localStorage (avoids async Capacitor call)
        const lsThrottle = localStorage.getItem(PROMPT_THROTTLE_LS_KEY);
        if (lsThrottle) {
          const elapsed = Date.now() - parseInt(lsThrottle, 10);
          if (elapsed < PROMPT_THROTTLE_MS) {
            console.log('[AutoNotificationPrompt] Fast-throttled via localStorage -', Math.round(elapsed / 1000 / 60), 'min ago');
            return;
          }
        }

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

        // Step 3: Check throttle via persistent storage (fallback)
        const lastPromptedAt = await persistentStorage.get(PROMPT_THROTTLE_KEY);
        if (lastPromptedAt) {
          const elapsed = Date.now() - parseInt(lastPromptedAt, 10);
          if (elapsed < PROMPT_THROTTLE_MS) {
            console.log('[AutoNotificationPrompt] Throttled - prompted', Math.round(elapsed / 1000 / 60), 'minutes ago');
            // Mirror to localStorage for next fast check
            localStorage.setItem(PROMPT_THROTTLE_LS_KEY, lastPromptedAt);
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

        // Record that we prompted (regardless of outcome) for throttle - both stores
        const nowStr = Date.now().toString();
        await persistentStorage.set(PROMPT_THROTTLE_KEY, nowStr);
        localStorage.setItem(PROMPT_THROTTLE_LS_KEY, nowStr);

        if (granted) {
          // Schedule notifications immediately after grant
          // Use getUserIdWithFallback instead of supabase.auth.getUser() to avoid auth lock
          console.log('[AutoNotificationPrompt] Scheduling notifications after grant...');
          
          const userId = await getUserIdWithFallback(3000);
          if (userId) {
            try {
              // Determine freeCompoundId for non-subscribed users
              let freeCompoundId: string | undefined;
              if (!isSubscribed) {
                const { data: oldest } = await withQueryTimeout(
                  dataClient
                    .from('compounds')
                    .select('id')
                    .eq('user_id', userId)
                    .eq('is_active', true)
                    .order('created_at', { ascending: true })
                    .limit(1),
                  'notification-prompt-oldest',
                  3000
                );
                if (oldest && oldest.length > 0) freeCompoundId = oldest[0].id;
              }

              // Use dataClient with timeout to avoid hanging on auth issues
              const { data: allDoses } = await withQueryTimeout(
                dataClient
                  .from('doses')
                  .select('*, compounds(name, is_active)')
                  .eq('user_id', userId)
                  .eq('taken', false),
                'notification-prompt-doses',
                5000
              );

              if (allDoses) {
                const activeDoses = allDoses.filter(d => d.compounds?.is_active !== false);
                const dosesWithName = activeDoses.map(d => ({
                  ...d,
                  compound_name: d.compounds?.name || 'Medication'
                }));
                await scheduleAllUpcomingDoses(dosesWithName, isSubscribed, freeCompoundId);
                console.log('[AutoNotificationPrompt] Scheduled', dosesWithName.length, 'notifications');
              }
            } catch (error) {
              // Don't let scheduling failures break the prompt flow
              // Normal app sync will handle it later
              console.warn('[AutoNotificationPrompt] Failed to schedule notifications:', error);
            }
          } else {
            console.log('[AutoNotificationPrompt] No userId available, skipping scheduling (app sync will handle later)');
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
