/**
 * Feature usage tracking utility for monitoring first-time feature usage.
 * Tracks which features users have discovered and used.
 */

import ReactGA from 'react-ga4';
import { appVersion } from '../../capacitor.config';

// Feature keys for tracking first-time usage
export const FEATURE_KEYS = [
  'calculator',
  'photo_compare', 
  'cycle',
  'levels_graph',
  'share',
  'weekly_digest',
  'injection_site',
  'titration',
  'promo_code',
  'export_data',
] as const;

export type FeatureKey = typeof FEATURE_KEYS[number];

const STORAGE_KEY = 'regimen_used_features';
const INSTALL_DATE_KEY = 'regimen_install_date';
const LAST_VERSION_KEY = 'regimen_last_app_version';

/**
 * Gets the list of features the user has already used.
 */
export const getUsedFeatures = (): FeatureKey[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

/**
 * Tracks when a user uses a feature for the first time.
 * Fires a GA4 event only on first use.
 */
export const trackFeatureFirstUse = (featureKey: FeatureKey): void => {
  const usedFeatures = getUsedFeatures();
  
  if (!usedFeatures.includes(featureKey)) {
    usedFeatures.push(featureKey);
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(usedFeatures));
    } catch (e) {
      console.warn('[FeatureTracking] Failed to save:', e);
    }
    
    // Fire GA4 event for feature discovery
    ReactGA.event('feature_first_use', {
      feature_name: featureKey,
      features_used_count: usedFeatures.length,
      features_remaining: FEATURE_KEYS.length - usedFeatures.length,
    });
    
    console.log('[FeatureTracking] First use:', featureKey, 'Total:', usedFeatures.length);
  }
};

/**
 * Checks if a specific feature has been used before.
 */
export const hasUsedFeature = (featureKey: FeatureKey): boolean => {
  return getUsedFeatures().includes(featureKey);
};

/**
 * Gets the count of features the user has discovered.
 */
export const getFeatureDiscoveryCount = (): number => {
  return getUsedFeatures().length;
};

/**
 * Sets the install date if not already set.
 * Used for calculating days since install.
 */
export const setInstallDate = (): void => {
  if (!localStorage.getItem(INSTALL_DATE_KEY)) {
    localStorage.setItem(INSTALL_DATE_KEY, new Date().toISOString());
  }
};

/**
 * Gets the install date.
 */
export const getInstallDate = (): Date | null => {
  const stored = localStorage.getItem(INSTALL_DATE_KEY);
  return stored ? new Date(stored) : null;
};

/**
 * Calculates days since the app was first installed.
 */
export const getDaysSinceInstall = (): number => {
  const installDate = getInstallDate();
  if (!installDate) {
    setInstallDate();
    return 0;
  }
  
  const now = new Date();
  const diffMs = now.getTime() - installDate.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
};

/**
 * Checks if the app was upgraded and fires an event if so.
 * Call this on app initialization to track version adoption.
 */
export const checkAndTrackVersionUpgrade = (): void => {
  const currentVersion = appVersion;
  const lastVersion = localStorage.getItem(LAST_VERSION_KEY);
  
  if (lastVersion && lastVersion !== currentVersion) {
    // User upgraded!
    ReactGA.event('app_upgraded', {
      from_version: lastVersion,
      to_version: currentVersion,
      days_since_install: getDaysSinceInstall(),
    });
    console.log('[FeatureTracking] App upgraded:', lastVersion, '->', currentVersion);
  }
  
  // Always update the stored version
  localStorage.setItem(LAST_VERSION_KEY, currentVersion);
};

/**
 * Gets the last recorded app version.
 */
export const getLastAppVersion = (): string | null => {
  return localStorage.getItem(LAST_VERSION_KEY);
};

/**
 * Resets all feature tracking data.
 * Useful for development/testing.
 */
export const resetFeatureTracking = (): void => {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(INSTALL_DATE_KEY);
  localStorage.removeItem(LAST_VERSION_KEY);
};
