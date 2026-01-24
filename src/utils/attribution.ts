/**
 * Attribution tracking utility for capturing UTM parameters and referrer data.
 * Stores attribution data in sessionStorage for later use in signup/conversion events.
 */

export interface AttributionData {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  referrer: string | null;
  landing_page: string;
  captured_at: string;
}

const STORAGE_KEY = 'regimen_attribution';

/**
 * Captures UTM parameters and referrer data from the current URL.
 * Only stores data if at least one UTM parameter is present.
 */
export const captureAttribution = (): AttributionData => {
  const params = new URLSearchParams(window.location.search);
  
  const attribution: AttributionData = {
    utm_source: params.get('utm_source'),
    utm_medium: params.get('utm_medium'),
    utm_campaign: params.get('utm_campaign'),
    utm_content: params.get('utm_content'),
    utm_term: params.get('utm_term'),
    referrer: document.referrer || null,
    landing_page: window.location.pathname,
    captured_at: new Date().toISOString()
  };
  
  // Only store if we have meaningful attribution data
  if (attribution.utm_source || attribution.referrer) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(attribution));
      console.log('[Attribution] Captured:', attribution);
    } catch (e) {
      console.warn('[Attribution] Failed to store:', e);
    }
  }
  
  return attribution;
};

/**
 * Retrieves stored attribution data from sessionStorage.
 * Returns null if no data exists or parsing fails.
 */
export const getStoredAttribution = (): AttributionData | null => {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (e) {
    console.warn('[Attribution] Failed to retrieve:', e);
    return null;
  }
};

/**
 * Clears stored attribution data.
 * Call this after successfully attaching attribution to a signup event.
 */
export const clearAttribution = (): void => {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('[Attribution] Failed to clear:', e);
  }
};

/**
 * Checks if the current session has any attribution data.
 */
export const hasAttribution = (): boolean => {
  return getStoredAttribution() !== null;
};
