/**
 * Startup Preflight Module
 * 
 * Runs BEFORE the app bootstraps to validate and sanitize localStorage.
 * This prevents "poison pill" scenarios where corrupted JSON data
 * causes the app to fail on startup (black screen).
 */

// Keys that must contain valid JSON
const JSON_KEYS_TO_VALIDATE = [
  'dismissedBanners',
  'weeklyDigestSettings',
  'regimen_used_features',
  'regimen_onboarding_state',
  'cachedEntitlement',
  'medicationLevelsCollapsed',
  'selectedLevelsCompound',
  'pendingDoseActions', // New key for queued notification actions
];

// Additional patterns to check for auth-related keys
const AUTH_KEY_PATTERNS = ['auth-token', 'sb-', 'supabase.auth'];

interface PreflightReport {
  timestamp: string;
  keysChecked: number;
  keysCleared: string[];
  authKeysCleared: string[];
  errors: string[];
}

/**
 * Safely parse JSON, returns null if invalid
 */
const safeJsonParse = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

/**
 * Check if a localStorage key contains valid JSON
 */
const isValidJsonKey = (key: string): boolean => {
  try {
    const value = localStorage.getItem(key);
    if (value === null) return true; // Key doesn't exist, that's fine
    if (value === '') return true; // Empty string is okay
    
    // Try to parse it
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
};

/**
 * Run the startup preflight check
 * Call this before mounting React
 */
export const runStartupPreflight = (): PreflightReport => {
  const report: PreflightReport = {
    timestamp: new Date().toISOString(),
    keysChecked: 0,
    keysCleared: [],
    authKeysCleared: [],
    errors: [],
  };

  try {
    // Set boot stage marker
    localStorage.setItem('regimen_last_boot_stage', 'preflight_start');

    // 1. Validate known JSON keys
    for (const key of JSON_KEYS_TO_VALIDATE) {
      report.keysChecked++;
      if (!isValidJsonKey(key)) {
        try {
          localStorage.removeItem(key);
          report.keysCleared.push(key);
          console.warn(`[Preflight] Cleared corrupted key: ${key}`);
        } catch (e) {
          report.errors.push(`Failed to clear ${key}: ${e}`);
        }
      }
    }

    // 2. Scan all keys for auth-related ones and validate
    const allKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) allKeys.push(key);
    }

    for (const key of allKeys) {
      const isAuthKey = AUTH_KEY_PATTERNS.some(pattern => key.includes(pattern));
      if (isAuthKey) {
        report.keysChecked++;
        const value = localStorage.getItem(key);
        
        // Auth keys should be valid JSON if they contain JSON-like content
        if (value && (value.startsWith('{') || value.startsWith('['))) {
          if (safeJsonParse(value) === null) {
            try {
              localStorage.removeItem(key);
              report.authKeysCleared.push(key);
              console.warn(`[Preflight] Cleared corrupted auth key: ${key}`);
            } catch (e) {
              report.errors.push(`Failed to clear auth key ${key}: ${e}`);
            }
          }
        }
      }
    }

    // 3. Update boot stage
    localStorage.setItem('regimen_last_boot_stage', 'preflight_complete');

    // 4. Store report for diagnostics
    localStorage.setItem('regimen_preflight_report', JSON.stringify(report));

    // Log summary
    if (report.keysCleared.length > 0 || report.authKeysCleared.length > 0) {
      console.log('[Preflight] Cleared corrupted data:', {
        keys: report.keysCleared,
        authKeys: report.authKeysCleared,
      });
    } else {
      console.log('[Preflight] All storage validated successfully');
    }

  } catch (error) {
    report.errors.push(`Preflight error: ${error}`);
    console.error('[Preflight] Error during preflight:', error);
    
    // Even if preflight fails, try to mark it
    try {
      localStorage.setItem('regimen_last_boot_stage', 'preflight_error');
    } catch {
      // Can't even write to localStorage - very broken state
    }
  }

  return report;
};

/**
 * Get the last boot stage (for diagnostics)
 */
export const getLastBootStage = (): string => {
  try {
    return localStorage.getItem('regimen_last_boot_stage') || 'unknown';
  } catch {
    return 'storage_inaccessible';
  }
};

/**
 * Get the last preflight report (for diagnostics)
 */
export const getPreflightReport = (): PreflightReport | null => {
  try {
    const report = localStorage.getItem('regimen_preflight_report');
    return report ? JSON.parse(report) : null;
  } catch {
    return null;
  }
};

/**
 * Clear all app data (for recovery UI)
 */
export const clearAllAppData = (): void => {
  try {
    // Preserve some diagnostic keys temporarily
    const bootStage = localStorage.getItem('regimen_last_boot_stage');
    
    // Clear everything
    localStorage.clear();
    
    // Restore diagnostic marker
    if (bootStage) {
      localStorage.setItem('regimen_cleared_at', new Date().toISOString());
      localStorage.setItem('regimen_cleared_from_stage', bootStage);
    }
    
    console.log('[Preflight] All app data cleared');
  } catch (error) {
    console.error('[Preflight] Failed to clear app data:', error);
  }
};

/**
 * Generate a support code for users to share
 */
export const generateSupportCode = (): string => {
  const now = Date.now();
  const stage = getLastBootStage();
  const report = getPreflightReport();
  
  // Create a short code: timestamp-stage-clearedCount
  const clearedCount = report 
    ? report.keysCleared.length + report.authKeysCleared.length 
    : 0;
  
  // Base36 encode for shorter code
  const timeCode = now.toString(36).slice(-6);
  const stageCode = stage.slice(0, 4);
  
  return `${timeCode}-${stageCode}-${clearedCount}`.toUpperCase();
};
