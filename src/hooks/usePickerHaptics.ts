import { useCallback, useRef } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

const HAPTIC_THROTTLE_MS = 25;

/**
 * Hook for reliable picker/slider haptic feedback using ImpactStyle.Light
 * This style produces the most consistent "tick" feel on iOS
 */
export function usePickerHaptics() {
  const lastHapticTimeRef = useRef<number>(0);

  const triggerHaptic = useCallback(() => {
    const now = Date.now();
    if (now - lastHapticTimeRef.current < HAPTIC_THROTTLE_MS) return;
    lastHapticTimeRef.current = now;
    
    if (Capacitor.isNativePlatform()) {
      // Fire-and-forget - don't await to prevent scroll jank
      Haptics.impact({ style: ImpactStyle.Light }).catch(() => {
        // Silently ignore errors
      });
    }
  }, []);

  return { triggerHaptic };
}
