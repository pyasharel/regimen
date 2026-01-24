import ReactGA from 'react-ga4';
import { captureAttribution, getStoredAttribution } from './attribution';

// App version - could be read from package.json in a real setup
const APP_VERSION = '1.0.0';

// Initialize Google Analytics with content group and user properties
export const initGA = (measurementId: string) => {
  ReactGA.initialize(measurementId);
  
  // Set content_group to identify this is the APP (not landing page)
  ReactGA.gtag('set', 'content_group', 'app');
  
  // Set user properties for platform identification
  ReactGA.gtag('set', 'user_properties', {
    platform_type: 'app',
    app_version: APP_VERSION,
  });
  
  // Capture and set attribution data
  const attribution = captureAttribution();
  if (attribution.utm_source) {
    ReactGA.gtag('set', 'user_properties', {
      first_utm_source: attribution.utm_source,
      first_utm_medium: attribution.utm_medium || 'none',
      first_utm_campaign: attribution.utm_campaign || 'none',
    });
  }
  
  console.log('[Analytics] GA4 initialized with content_group: app');
};

/**
 * Sets the GA4 user ID for cross-session tracking.
 * Call this after successful authentication.
 */
export const setUserId = (userId: string) => {
  ReactGA.gtag('set', 'user_id', userId);
  console.log('[Analytics] User ID set');
};

/**
 * Clears the GA4 user ID (e.g., on logout).
 */
export const clearUserId = () => {
  ReactGA.gtag('set', 'user_id', null);
};

// Screen name mapping for cleaner reports
const SCREEN_NAMES: Record<string, string> = {
  '/': 'Landing',
  '/auth': 'Auth',
  '/today': 'Today',
  '/stack': 'My Stack',
  '/progress': 'Progress',
  '/settings': 'Settings',
  '/photo-compare': 'Photo Compare',
  '/onboarding': 'Onboarding',
  '/add-compound': 'Add Compound',
  '/partner': 'Partner Landing',
};

// Page view tracking with explicit screen names
export const trackPageView = (path: string, customScreenName?: string) => {
  const screenName = customScreenName || SCREEN_NAMES[path] || path;
  ReactGA.send({ 
    hitType: 'pageview', 
    page: path,
    page_title: `App: ${screenName}` // Prefix to differentiate from landing page
  });
};

// User signup tracking with attribution
export const trackSignup = (method: 'email' | 'google') => {
  const attribution = getStoredAttribution();
  ReactGA.event({
    category: 'User',
    action: 'Signup',
    label: method,
  });
  
  // Enhanced signup event with attribution
  ReactGA.event('signup_complete', {
    method,
    utm_source: attribution?.utm_source || 'direct',
    utm_medium: attribution?.utm_medium || 'none',
    utm_campaign: attribution?.utm_campaign || 'none',
    referrer: attribution?.referrer || 'none',
  });
};

// User login tracking
export const trackLogin = (method: 'email' | 'google') => {
  ReactGA.event({
    category: 'User',
    action: 'Login',
    label: method,
  });
};

// Dose logging tracking
export const trackDoseLogged = (compoundName: string, completed: boolean) => {
  ReactGA.event({
    category: 'Dose',
    action: completed ? 'Marked Complete' : 'Marked Incomplete',
    label: compoundName,
  });
};

export const trackDoseSkipped = (compoundName: string) => {
  ReactGA.event({
    category: 'Dose',
    action: 'Skipped',
    label: compoundName,
  });
};

// Compound tracking - includes compound_type for GA4 custom dimension
export const trackCompoundAdded = (
  compoundName: string, 
  scheduleType: string,
  compoundType?: 'peptide' | 'trt' | 'glp1' | 'supplement' | 'other'
) => {
  ReactGA.event('compound_added', {
    compound_name: compoundName,
    schedule_type: scheduleType,
    compound_type: compoundType || 'other',
  });
};

export const trackCompoundEdited = (compoundName: string) => {
  ReactGA.event({
    category: 'Compound',
    action: 'Edited',
    label: compoundName,
  });
};

export const trackCompoundDeleted = (compoundName: string) => {
  ReactGA.event({
    category: 'Compound',
    action: 'Deleted',
    label: compoundName,
  });
};

export const trackCompoundViewed = (compoundName: string) => {
  ReactGA.event({
    category: 'Compound',
    action: 'Viewed',
    label: compoundName,
  });
};

// Cycle tracking
export const trackCycleEnabled = (compoundName: string, weeksOn: number, weeksOff: number | null) => {
  ReactGA.event({
    category: 'Compound',
    action: 'Cycle Enabled',
    label: weeksOff ? `${compoundName} - ${weeksOn}on/${weeksOff}off` : `${compoundName} - ${weeksOn} weeks`,
  });
};

// Calculator tracking - sends calculator_type as proper parameter for GA4 custom dimension
export const trackCalculatorUsed = (calculatorType: 'iu' | 'ml' | 'peptide' | 'testosterone' | 'oil') => {
  ReactGA.event('calculator_used', {
    calculator_type: calculatorType,
  });
};

// Half-life/Levels tracking
export const trackLevelsViewed = (compoundName: string) => {
  ReactGA.event({
    category: 'Feature',
    action: 'Levels Viewed',
    label: compoundName,
  });
};

// Share tracking
export const trackShareAction = (shareType: 'stack' | 'progress' | 'photo' | 'app') => {
  ReactGA.event({
    category: 'Social',
    action: 'Share',
    label: shareType,
  });
};

// Settings change tracking
export const trackThemeChanged = (theme: 'light' | 'dark' | 'system') => {
  ReactGA.event({
    category: 'Settings',
    action: 'Theme Changed',
    label: theme,
  });
};

export const trackSoundToggled = (enabled: boolean) => {
  ReactGA.event({
    category: 'Settings',
    action: 'Sound Effects Toggled',
    label: enabled ? 'enabled' : 'disabled',
  });
};

export const trackNotificationToggled = (
  type: 'dose' | 'cycle' | 'photo' | 'weight',
  enabled: boolean
) => {
  ReactGA.event({
    category: 'Settings',
    action: 'Notification Toggled',
    label: `${type}: ${enabled ? 'enabled' : 'disabled'}`,
  });
};

// Photo tracking
export const trackPhotoUploaded = (category: string) => {
  ReactGA.event({
    category: 'Progress',
    action: 'Photo Uploaded',
    label: category,
  });
};

export const trackPhotoCompared = () => {
  ReactGA.event({
    category: 'Progress',
    action: 'Photos Compared',
  });
};

// Progress tracking
export const trackProgressEntryAdded = (category: string, hasPhoto: boolean, hasMetrics: boolean) => {
  ReactGA.event({
    category: 'Progress',
    action: 'Entry Added',
    label: category,
    value: (hasPhoto ? 1 : 0) + (hasMetrics ? 1 : 0),
  });
};

export const trackProgressViewed = (category: string) => {
  ReactGA.event({
    category: 'Progress',
    action: 'Viewed',
    label: category,
  });
};

// Individual wellness metrics tracking
export const trackMetricLogged = (metricType: 'weight' | 'energy' | 'sleep' | 'cravings' | 'notes', value?: number | string) => {
  ReactGA.event({
    category: 'Wellness',
    action: 'Metric Logged',
    label: metricType,
    value: typeof value === 'number' ? value : undefined,
  });
};

// Medication correlation tracking
export const trackCorrelationUsed = (metricType: string, compoundName: string) => {
  ReactGA.event({
    category: 'Analysis',
    action: 'Correlation Viewed',
    label: `${metricType} - ${compoundName}`,
  });
};

// User preference tracking
export const trackPreferenceSet = (preference: string, value: string) => {
  ReactGA.event({
    category: 'Preferences',
    action: 'Set',
    label: `${preference}: ${value}`,
  });
};

// Weight logging - specific tracking
export const trackWeightLogged = (unit: 'lbs' | 'kg') => {
  ReactGA.event({
    category: 'Progress',
    action: 'Weight Logged',
    label: unit,
  });
};

// Photo compare tracking
export const trackPhotoCompareUsed = () => {
  ReactGA.event({
    category: 'Feature',
    action: 'Photo Compare Used',
  });
};

// Paywall tracking (replaces premium tracking)
export const trackPaywallShown = (trigger: string) => {
  ReactGA.event({
    category: 'Paywall',
    action: 'Shown',
    label: trigger,
  });
};

export const trackPaywallDismissed = (trigger: string) => {
  ReactGA.event({
    category: 'Paywall',
    action: 'Dismissed',
    label: trigger,
  });
};

export const trackSubscriptionStarted = (plan: string) => {
  ReactGA.event({
    category: 'Subscription',
    action: 'Started',
    label: plan,
  });
};

// Settings tracking
export const trackSettingChanged = (setting: string, value: string) => {
  ReactGA.event({
    category: 'Settings',
    action: 'Changed',
    label: `${setting}: ${value}`,
  });
};

export const trackNotificationPermission = (granted: boolean) => {
  ReactGA.event({
    category: 'Settings',
    action: 'Notification Permission',
    label: granted ? 'Granted' : 'Denied',
  });
};

// Push notification tracking
export const trackPushNotificationOpened = (type: string) => {
  ReactGA.event({
    category: 'Notification',
    action: 'Opened',
    label: type,
  });
};

// Screen tracking with explicit names
export const trackScreenView = (screenName: string) => {
  ReactGA.event({
    category: 'Navigation',
    action: 'Screen View',
    label: screenName,
  });
};

// Session tracking
export const trackSessionStart = () => {
  ReactGA.event({
    category: 'Session',
    action: 'Started',
  });
};

export const trackSessionEnd = (duration: number) => {
  ReactGA.event({
    category: 'Session',
    action: 'Ended',
    value: Math.round(duration / 1000), // duration in seconds
  });
};

// App opened tracking (for native apps)
export const trackAppOpened = (platform: string, daysSinceInstall: number) => {
  ReactGA.event('app_opened', {
    platform,
    days_since_install: daysSinceInstall,
  });
};

// Drop-off tracking
export const trackDropOff = (location: string, reason?: string) => {
  ReactGA.event({
    category: 'User Flow',
    action: 'Drop Off',
    label: reason ? `${location} - ${reason}` : location,
  });
};

// Weekly digest tracking
export const trackWeeklyDigestViewed = () => {
  ReactGA.event({
    category: 'Engagement',
    action: 'Weekly Digest Viewed',
  });
};

export const trackWeeklyDigestClosed = (method: 'dismiss' | 'complete') => {
  ReactGA.event({
    category: 'Engagement',
    action: 'Weekly Digest Closed',
    label: method,
  });
};

// Enhanced onboarding funnel tracking
export const trackOnboardingStep = (screenId: string, stepNumber: number, totalSteps: number) => {
  // Calculate funnel position
  const progressPercent = Math.round((stepNumber / totalSteps) * 100);
  let funnelPosition: 'early' | 'middle' | 'late';
  if (progressPercent <= 33) {
    funnelPosition = 'early';
  } else if (progressPercent <= 66) {
    funnelPosition = 'middle';
  } else {
    funnelPosition = 'late';
  }
  
  // GA4 recommended event format
  ReactGA.event('onboarding_step', {
    step_name: screenId,
    step_number: stepNumber,
    steps_total: totalSteps,
    progress_percent: progressPercent,
    funnel_position: funnelPosition,
  });
};

export const trackOnboardingComplete = () => {
  ReactGA.event({
    category: 'Onboarding',
    action: 'Completed',
  });
  
  // Also fire as custom event for easier funnel analysis
  ReactGA.event('onboarding_complete', {
    completed: true,
  });
};

export const trackOnboardingSkip = (screenId: string, reason?: string) => {
  // Calculate funnel position based on screen
  const earlyScreens = ['splash', 'privacy', 'goals', 'experience'];
  const lateScreens = ['notifications', 'complete', 'paywall'];
  
  let funnelPosition: 'early' | 'middle' | 'late';
  if (earlyScreens.some(s => screenId.toLowerCase().includes(s))) {
    funnelPosition = 'early';
  } else if (lateScreens.some(s => screenId.toLowerCase().includes(s))) {
    funnelPosition = 'late';
  } else {
    funnelPosition = 'middle';
  }
  
  ReactGA.event('onboarding_skip', {
    skip_screen: screenId,
    skip_reason: reason || 'unknown',
    funnel_position: funnelPosition,
  });
};

// Promo code tracking
export const trackPromoCodeApplied = (code: string, daysGranted: number) => {
  ReactGA.event({
    category: 'Subscription',
    action: 'Promo Code Applied',
    label: code,
    value: daysGranted,
  });
};

// Subscription outcome tracking
export const trackSubscriptionSuccess = (plan: string, source: 'revenuecat' | 'stripe') => {
  ReactGA.event({
    category: 'Subscription',
    action: 'Purchase Success',
    label: `${plan} via ${source}`,
  });
};

export const trackSubscriptionFailed = (plan: string, error: string) => {
  ReactGA.event({
    category: 'Subscription',
    action: 'Purchase Failed',
    label: `${plan}: ${error}`,
  });
};

// Account actions
export const trackAccountDeleted = () => {
  ReactGA.event({
    category: 'Account',
    action: 'Deleted',
  });
};

/**
 * Tracks a weekly engagement snapshot for retention and cohort analysis.
 * Call this once per week (e.g., on app resume if 7+ days since last snapshot).
 */
export const trackWeeklyEngagementSnapshot = (metrics: {
  compounds_count: number;
  doses_last_30d: number;
  photos_count: number;
  current_streak: number;
  days_since_install: number;
  subscription_status: string;
}) => {
  ReactGA.event('engagement_snapshot', {
    compounds_count: metrics.compounds_count,
    doses_last_30d: metrics.doses_last_30d,
    photos_count: metrics.photos_count,
    current_streak: metrics.current_streak,
    days_since_install: metrics.days_since_install,
    subscription_status: metrics.subscription_status,
  });
  console.log('[Analytics] Weekly engagement snapshot tracked');
};

export const trackDataCleared = () => {
  ReactGA.event({
    category: 'Account',
    action: 'Data Cleared',
  });
};

export const trackDataExported = () => {
  ReactGA.event({
    category: 'Account',
    action: 'Data Exported',
  });
};

export const trackSignOut = () => {
  clearUserId();
  ReactGA.event({
    category: 'Account',
    action: 'Sign Out',
  });
};

// Engagement
export const trackRatingRequested = (source: 'settings' | 'onboarding') => {
  ReactGA.event({
    category: 'Engagement',
    action: 'Rating Requested',
    label: source,
  });
};

export const trackFeedbackInitiated = () => {
  ReactGA.event({
    category: 'Engagement',
    action: 'Feedback Initiated',
  });
};

// Engagement snapshot - periodic health check
export const trackEngagementSnapshot = (metrics: {
  compounds_active: number;
  doses_logged_30d: number;
  photos_total: number;
  current_streak: number;
}) => {
  ReactGA.event('engagement_snapshot', {
    compounds_active: metrics.compounds_active,
    doses_logged_30d: metrics.doses_logged_30d,
    photos_total: metrics.photos_total,
    current_streak: metrics.current_streak,
  });
};

// Streak achievement tracking
export const trackStreakMilestone = (streakDays: number) => {
  ReactGA.event('streak_milestone', {
    streak_days: streakDays,
    milestone_type: streakDays >= 30 ? 'monthly' : streakDays >= 7 ? 'weekly' : 'daily',
  });
};
