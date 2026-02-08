import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { InAppReview } from '@/plugins/InAppReviewPlugin';
import { TestFlightDetector } from '@/plugins/TestFlightDetectorPlugin';
import { 
  trackRatingButtonTapped, 
  trackRatingOutcome, 
  getPlatform 
} from './analytics';
import { STORE_URLS } from '@/constants/storeUrls';

export interface RatingResult {
  success: boolean;
  method: 'native' | 'store_fallback' | 'not_available';
  reason?: string;
}

export interface RatingOptions {
  /** If true, skip the store fallback and return not_available instead */
  skipStoreFallback?: boolean;
}

/**
 * Unified rating helper that:
 * 1. Attempts native In-App Review API first
 * 2. Falls back to opening the store directly if:
 *    - Plugin isn't available
 *    - We're on TestFlight (iOS)
 *    - Native request fails
 * 
 * @param source Where the rating was triggered from (for analytics)
 * @param options Configuration options
 */
export async function requestRating(
  source: 'settings' | 'onboarding',
  options: RatingOptions = {}
): Promise<RatingResult> {
  const { skipStoreFallback = false } = options;
  // Track the button tap immediately
  trackRatingButtonTapped(source);

  console.log('[RatingHelper] requestRating called from:', source);

  // Not on native platform
  if (!Capacitor.isNativePlatform()) {
    console.log('[RatingHelper] Not native platform, rating unavailable');
    trackRatingOutcome(source, 'skipped_web');
    return { success: false, method: 'not_available', reason: 'web_platform' };
  }

  const platform = getPlatform();
  const isPluginAvailable = Capacitor.isPluginAvailable('InAppReview');

  console.log('[RatingHelper] Platform:', platform);
  console.log('[RatingHelper] InAppReview plugin available:', isPluginAvailable);

  // Check if we're on TestFlight (iOS only) - always use store fallback
  if (platform === 'ios') {
    try {
      const { isTestFlight } = await TestFlightDetector.isTestFlight();
      console.log('[RatingHelper] TestFlight detected:', isTestFlight);
      
      if (isTestFlight) {
        console.log('[RatingHelper] TestFlight build detected');
        trackRatingOutcome(source, 'testflight_detected');
        if (skipStoreFallback) {
          console.log('[RatingHelper] Skipping store fallback (onboarding mode)');
          trackRatingOutcome(source, 'fallback_skipped');
          return { success: false, method: 'not_available', reason: 'testflight_fallback_skipped' };
        }
        return await openStoreFallback(platform, source);
      }
    } catch (error) {
      console.log('[RatingHelper] TestFlight detection failed, continuing:', error);
    }
  }

  // Plugin not available - use fallback
  if (!isPluginAvailable) {
    console.log('[RatingHelper] Plugin not registered');
    trackRatingOutcome(source, 'plugin_not_available');
    if (skipStoreFallback) {
      console.log('[RatingHelper] Skipping store fallback (onboarding mode)');
      trackRatingOutcome(source, 'fallback_skipped');
      return { success: false, method: 'not_available', reason: 'plugin_fallback_skipped' };
    }
    return await openStoreFallback(platform, source);
  }

  // Try native In-App Review
  try {
    console.log('[RatingHelper] Attempting native review...');
    
    // Small delay to ensure UI is settled
    await new Promise(resolve => setTimeout(resolve, 300));
    
    await InAppReview.requestReview();
    console.log('[RatingHelper] Native review request completed');
    trackRatingOutcome(source, 'request_sent');
    
    // Give user time to interact with the dialog
    // Apple/Google dialogs return immediately but stay on screen
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    return { success: true, method: 'native' };
  } catch (error) {
    console.error('[RatingHelper] Native review failed:', error);
    trackRatingOutcome(source, 'request_failed');
    
    if (skipStoreFallback) {
      console.log('[RatingHelper] Skipping store fallback after failure (onboarding mode)');
      trackRatingOutcome(source, 'fallback_skipped');
      return { success: false, method: 'not_available', reason: 'native_failed_fallback_skipped' };
    }
    
    // Fall back to store link
    console.log('[RatingHelper] Falling back to store link after failure');
    return await openStoreFallback(platform, source);
  }
}

/**
 * Opens the app store page directly as a fallback
 */
async function openStoreFallback(
  platform: 'ios' | 'android' | 'web',
  source: 'settings' | 'onboarding'
): Promise<RatingResult> {
  try {
    let url: string;
    
    if (platform === 'ios') {
      url = STORE_URLS.ios.review;
    } else if (platform === 'android') {
      url = STORE_URLS.android.review;
    } else {
      return { success: false, method: 'not_available', reason: 'unsupported_platform' };
    }

    console.log('[RatingHelper] Opening store URL:', url);
    
    await Browser.open({ url });
    
    trackRatingOutcome(source, 'fallback_store_link');
    console.log('[RatingHelper] Store opened successfully');
    
    return { success: true, method: 'store_fallback' };
  } catch (error) {
    console.error('[RatingHelper] Failed to open store:', error);
    
    // Try web URL for Android as final fallback
    if (platform === 'android') {
      try {
        console.log('[RatingHelper] Trying Android web fallback URL');
        await Browser.open({ url: STORE_URLS.android.reviewWeb });
        trackRatingOutcome(source, 'fallback_store_link');
        return { success: true, method: 'store_fallback' };
      } catch (webError) {
        console.error('[RatingHelper] Web fallback also failed:', webError);
      }
    }
    
    return { success: false, method: 'not_available', reason: 'store_open_failed' };
  }
}
