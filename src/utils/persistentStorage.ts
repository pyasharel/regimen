import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

/**
 * Persistent storage utility that uses Capacitor Preferences for native platforms
 * and localStorage for web. Capacitor Preferences persists across app updates.
 */

export const persistentStorage = {
  async get(key: string): Promise<string | null> {
    if (Capacitor.isNativePlatform()) {
      const { value } = await Preferences.get({ key });
      return value;
    } else {
      return localStorage.getItem(key);
    }
  },

  async set(key: string, value: string): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await Preferences.set({ key, value });
    } else {
      localStorage.setItem(key, value);
    }
  },

  async remove(key: string): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await Preferences.remove({ key });
    } else {
      localStorage.removeItem(key);
    }
  },

  async getBoolean(key: string, defaultValue: boolean = false): Promise<boolean> {
    const value = await this.get(key);
    if (value === null) return defaultValue;
    return value === 'true';
  },

  async setBoolean(key: string, value: boolean): Promise<void> {
    await this.set(key, String(value));
  },

  async getNumber(key: string, defaultValue?: number): Promise<number | null> {
    const value = await this.get(key);
    if (value === null) return defaultValue ?? null;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? (defaultValue ?? null) : parsed;
  },

  async setNumber(key: string, value: number): Promise<void> {
    await this.set(key, String(value));
  },

  async getJSON<T>(key: string, defaultValue?: T): Promise<T | null> {
    const value = await this.get(key);
    if (value === null) return defaultValue ?? null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return defaultValue ?? null;
    }
  },

  async setJSON<T>(key: string, value: T): Promise<void> {
    await this.set(key, JSON.stringify(value));
  },

  /**
   * Migrate existing localStorage values to Capacitor Preferences
   * Call this once on app startup for native platforms
   */
  async migrateFromLocalStorage(keys: string[]): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    for (const key of keys) {
      const localValue = localStorage.getItem(key);
      if (localValue !== null) {
        const { value: capacitorValue } = await Preferences.get({ key });
        // Only migrate if not already in Capacitor Preferences
        if (capacitorValue === null) {
          await Preferences.set({ key, value: localValue });
          console.log(`[Storage] Migrated ${key} to Capacitor Preferences`);
        }
      }
    }
  }
};

// List of all setting keys that should persist across updates
export const PERSISTENT_STORAGE_KEYS = [
  // Theme
  'vite-ui-theme',
  
  // Unit system (unified imperial/metric preference)
  'unitSystem',
  
  // Display settings
  'weightUnit',
  'heightUnit',
  'heightFeet',
  'heightInches',
  'heightCm',
  'goalWeight',
  'userHeight',
  'currentWeight',
  
  // Sound settings
  'soundEnabled',
  
  // Notification settings
  'doseReminders',
  'cycleReminders',
  'photoReminders',
  'photoFrequency',
  'photoTime',
  'photoDay',
  'weightReminders',
  'weightFrequency',
  'weightTime',
  'weightDay',
  'notificationPermissionAsked',
  'notificationPermissionDenied',
  
  // Weekly digest
  'weeklyDigestSettings',
  
  // Engagement tracking
  'firstDoseNotificationSent',
  'hasUploadedPhoto',
  'signupDate',
  
  // Dismissed banners
  'dismissedBanners',
  
  // Subscription entitlement cache (survives webview reloads)
  'cachedEntitlement',
  
  // Medication Levels card preferences
  'selectedLevelsCompound',
  'medicationLevelsCollapsed',
];

// Cached entitlement interface for subscription persistence
export interface CachedEntitlement {
  userId: string;
  isPro: boolean;
  isTrialing: boolean;
  subscriptionType: 'monthly' | 'annual' | null;
  expirationDate: string | null;
  timestamp: number; // When this cache was written
}

// Max age for cached entitlement (24 hours in milliseconds)
export const CACHED_ENTITLEMENT_MAX_AGE_MS = 24 * 60 * 60 * 1000;