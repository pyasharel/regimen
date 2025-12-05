import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

/**
 * Premium haptic feedback utility
 * Different feedback types for different interactions
 */

// Light tap - for navigation, selections, toggles
export const hapticLight = async () => {
  try {
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Light });
    } else if ('vibrate' in navigator) {
      navigator.vibrate(15);
    }
  } catch (err) {
    console.log('Haptic failed:', err);
  }
};

// Medium impact - for confirmations, completing actions
export const hapticMedium = async () => {
  try {
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } else if ('vibrate' in navigator) {
      navigator.vibrate(30);
    }
  } catch (err) {
    console.log('Haptic failed:', err);
  }
};

// Heavy impact - for important/destructive actions
export const hapticHeavy = async () => {
  try {
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } else if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  } catch (err) {
    console.log('Haptic failed:', err);
  }
};

// Success notification - for completing tasks, saving, achievements
export const hapticSuccess = async () => {
  try {
    if (Capacitor.isNativePlatform()) {
      await Haptics.notification({ type: NotificationType.Success });
    } else if ('vibrate' in navigator) {
      // Double pulse pattern for success
      navigator.vibrate([20, 50, 20]);
    }
  } catch (err) {
    console.log('Haptic failed:', err);
  }
};

// Warning notification - for alerts, important notices
export const hapticWarning = async () => {
  try {
    if (Capacitor.isNativePlatform()) {
      await Haptics.notification({ type: NotificationType.Warning });
    } else if ('vibrate' in navigator) {
      // Triple short pulse for warning
      navigator.vibrate([15, 30, 15, 30, 15]);
    }
  } catch (err) {
    console.log('Haptic failed:', err);
  }
};

// Error notification - for errors, destructive confirmations
export const hapticError = async () => {
  try {
    if (Capacitor.isNativePlatform()) {
      await Haptics.notification({ type: NotificationType.Error });
    } else if ('vibrate' in navigator) {
      // Long pulse for error
      navigator.vibrate(100);
    }
  } catch (err) {
    console.log('Haptic failed:', err);
  }
};

// Selection changed - for picker wheels, sliders
export const hapticSelection = async () => {
  try {
    if (Capacitor.isNativePlatform()) {
      await Haptics.selectionChanged();
    } else if ('vibrate' in navigator) {
      navigator.vibrate(5);
    }
  } catch (err) {
    console.log('Haptic failed:', err);
  }
};

// Selection start - begin selection interaction
export const hapticSelectionStart = async () => {
  try {
    if (Capacitor.isNativePlatform()) {
      await Haptics.selectionStart();
    }
  } catch (err) {
    console.log('Haptic failed:', err);
  }
};

// Selection end - finish selection interaction
export const hapticSelectionEnd = async () => {
  try {
    if (Capacitor.isNativePlatform()) {
      await Haptics.selectionEnd();
    }
  } catch (err) {
    console.log('Haptic failed:', err);
  }
};

// Combined feedback - vibrate pattern (use sparingly)
export const hapticPattern = async (pattern: number[]) => {
  try {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch (err) {
    console.log('Haptic failed:', err);
  }
};
