import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { checkExactAlarmPermission, openExactAlarmSettings, ExactAlarmStatus } from '@/utils/androidAlarmPermission';

const THROTTLE_KEY = 'regimen_android_alarm_prompt_last';
const THROTTLE_MS = 48 * 60 * 60 * 1000; // 48 hours

interface AndroidAlarmPermissionResult {
  /** Current exact alarm status */
  status: ExactAlarmStatus;
  /** Whether to show the permission prompt dialog */
  shouldShowPrompt: boolean;
  /** Dismiss the prompt (won't show again for 48h) */
  dismissPrompt: () => void;
  /** Open Android settings for Alarms & Reminders */
  openSettings: () => Promise<void>;
  /** Re-check the permission (e.g. after returning from settings) */
  recheck: () => Promise<void>;
}

/**
 * Hook to check and prompt for Android exact alarm permission.
 * Only active on Android. Returns not_applicable on other platforms.
 * 
 * @param hasCompounds - Whether the user has any active compounds
 * @param onboardingComplete - Whether onboarding is finished
 */
export const useAndroidAlarmPermission = (
  hasCompounds: boolean,
  onboardingComplete: boolean = true,
): AndroidAlarmPermissionResult => {
  const [status, setStatus] = useState<ExactAlarmStatus>('not_applicable');
  const [shouldShowPrompt, setShouldShowPrompt] = useState(false);

  const checkPermission = useCallback(async () => {
    if (Capacitor.getPlatform() !== 'android') {
      setStatus('not_applicable');
      return;
    }

    const result = await checkExactAlarmPermission();
    setStatus(result);

    // Determine if we should show the prompt
    if (result === 'denied' && hasCompounds && onboardingComplete) {
      const lastPrompt = localStorage.getItem(THROTTLE_KEY);
      const now = Date.now();

      if (!lastPrompt || now - parseInt(lastPrompt, 10) > THROTTLE_MS) {
        setShouldShowPrompt(true);
      }
    } else {
      setShouldShowPrompt(false);
    }
  }, [hasCompounds, onboardingComplete]);

  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  // Re-check when app resumes (user might have toggled it in settings)
  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') return;

    const handleResume = () => {
      // Small delay to let the OS state settle
      setTimeout(() => checkPermission(), 500);
    };

    window.addEventListener('regimen:resume', handleResume);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') handleResume();
    });

    return () => {
      window.removeEventListener('regimen:resume', handleResume);
    };
  }, [checkPermission]);

  const dismissPrompt = useCallback(() => {
    setShouldShowPrompt(false);
    localStorage.setItem(THROTTLE_KEY, Date.now().toString());
  }, []);

  const openSettings = useCallback(async () => {
    await openExactAlarmSettings();
    // Mark as dismissed so we re-check on resume instead of showing again
    localStorage.setItem(THROTTLE_KEY, Date.now().toString());
    setShouldShowPrompt(false);
  }, []);

  const recheck = useCallback(async () => {
    await checkPermission();
  }, [checkPermission]);

  return { status, shouldShowPrompt, dismissPrompt, openSettings, recheck };
};
