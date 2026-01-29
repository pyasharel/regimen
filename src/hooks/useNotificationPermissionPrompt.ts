import { useState, useEffect, useCallback } from 'react';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { persistentStorage } from '@/utils/persistentStorage';
import { scheduleAllUpcomingDoses, ensureDoseActionTypesRegistered } from '@/utils/notificationScheduler';
import { supabase } from '@/integrations/supabase/client';

type PermissionStatus = 'granted' | 'prompt' | 'denied' | 'unknown';

const PROMPT_THROTTLE_KEY = 'notificationPermissionPromptLastShownAt';
const PROMPT_THROTTLE_MS = 24 * 60 * 60 * 1000; // 24 hours between prompts

interface UseNotificationPermissionPromptResult {
  shouldShowPrompt: boolean;
  osPermissionStatus: PermissionStatus;
  isLoading: boolean;
  handleEnableNotifications: () => Promise<boolean>;
  handleDismissPrompt: () => void;
}

/**
 * Hook to manage notification permission prompting for existing users
 * Shows a prompt on Today screen when:
 * - User has dose reminders desired (default true)
 * - OS permission is 'prompt' (never asked or reset after reinstall)
 * - User has at least one active compound
 * - Haven't shown prompt in last 24 hours
 */
export function useNotificationPermissionPrompt(
  hasActiveCompounds: boolean,
  isSubscribed: boolean
): UseNotificationPermissionPromptResult {
  const [osPermissionStatus, setOsPermissionStatus] = useState<PermissionStatus>('unknown');
  const [shouldShowPrompt, setShouldShowPrompt] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check OS permission and determine if we should prompt
  useEffect(() => {
    const checkAndDecide = async () => {
      if (!Capacitor.isNativePlatform()) {
        setIsLoading(false);
        return;
      }

      try {
        // Check OS permission status
        const status = await LocalNotifications.checkPermissions();
        const permissionStatus: PermissionStatus = 
          status.display === 'granted' ? 'granted' :
          status.display === 'denied' ? 'denied' : 'prompt';
        
        setOsPermissionStatus(permissionStatus);
        console.log('[useNotificationPermissionPrompt] OS status:', permissionStatus);

        // Only show prompt if permission is 'prompt'
        if (permissionStatus !== 'prompt') {
          setShouldShowPrompt(false);
          setIsLoading(false);
          return;
        }

        // Check if user wants dose reminders (default true)
        const doseRemindersDesired = await persistentStorage.getBoolean('doseReminders', true);
        if (!doseRemindersDesired) {
          console.log('[useNotificationPermissionPrompt] User has disabled dose reminders in settings');
          setShouldShowPrompt(false);
          setIsLoading(false);
          return;
        }

        // Check throttle - don't show if we showed recently
        const lastShownAt = await persistentStorage.get(PROMPT_THROTTLE_KEY);
        if (lastShownAt) {
          const elapsed = Date.now() - parseInt(lastShownAt, 10);
          if (elapsed < PROMPT_THROTTLE_MS) {
            console.log('[useNotificationPermissionPrompt] Throttled - shown', Math.round(elapsed / 1000 / 60), 'minutes ago');
            setShouldShowPrompt(false);
            setIsLoading(false);
            return;
          }
        }

        // Show prompt if user has active compounds
        if (hasActiveCompounds) {
          console.log('[useNotificationPermissionPrompt] Will show prompt');
          setShouldShowPrompt(true);
        }
      } catch (error) {
        console.error('[useNotificationPermissionPrompt] Error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAndDecide();
  }, [hasActiveCompounds]);

  // Handle user tapping "Enable Notifications"
  const handleEnableNotifications = useCallback(async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) return true;

    try {
      // Register action types first
      await ensureDoseActionTypesRegistered();

      // Request permission
      const result = await LocalNotifications.requestPermissions();
      const granted = result.display === 'granted';

      setOsPermissionStatus(granted ? 'granted' : 'denied');
      setShouldShowPrompt(false);

      if (granted) {
        // Schedule notifications immediately
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
            console.log('[useNotificationPermissionPrompt] Scheduled notifications after grant');
          }
        }
      }

      // Record that we showed the prompt (regardless of outcome)
      await persistentStorage.set(PROMPT_THROTTLE_KEY, Date.now().toString());

      return granted;
    } catch (error) {
      console.error('[useNotificationPermissionPrompt] Error enabling:', error);
      return false;
    }
  }, [isSubscribed]);

  // Handle user dismissing the prompt
  const handleDismissPrompt = useCallback(async () => {
    setShouldShowPrompt(false);
    // Record dismissal time so we don't prompt again for 24 hours
    await persistentStorage.set(PROMPT_THROTTLE_KEY, Date.now().toString());
    console.log('[useNotificationPermissionPrompt] User dismissed, throttling for 24h');
  }, []);

  return {
    shouldShowPrompt,
    osPermissionStatus,
    isLoading,
    handleEnableNotifications,
    handleDismissPrompt,
  };
}
