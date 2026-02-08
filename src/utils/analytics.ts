import ReactGA from 'react-ga4';
import { Capacitor } from '@capacitor/core';
import { captureAttribution, getStoredAttribution } from './attribution';
import { appVersion } from '../../capacitor.config';

// App version synced from capacitor.config.ts
const APP_VERSION = appVersion;

/**
 * Detects the current platform (ios, android, or web)
 */
export const getPlatform = (): 'ios' | 'android' | 'web' => {
  if (!Capacitor.isNativePlatform()) return 'web';
  return Capacitor.getPlatform() as 'ios' | 'android';
};

/**
 * Sets platform as a persistent GA4 user property.
 * This allows segmenting reports by iOS/Android/Web.
 */
export const setPlatformUserProperty = () => {
  const platform = getPlatform();
  ReactGA.gtag('set', 'user_properties', {
    user_platform: platform,
    app_version: APP_VERSION,
  });
  console.log('[Analytics] Platform user property set:', platform, 'version:', APP_VERSION);
};

/**
 * Sets user profile properties as GA4 user properties.
 * Call this after profile data is loaded (on app init and after auth).
 * These allow segmenting ALL reports by user type.
 */
export const setProfileUserProperties = (profile: {
  pathType: string | null;
  experienceLevel: string | null;
}) => {
  ReactGA.gtag('set', 'user_properties', {
    user_path_type: profile.pathType || 'unknown',
    user_experience_level: profile.experienceLevel || 'unknown',
  });
  console.log('[Analytics] Profile user properties set:', {
    path_type: profile.pathType,
    experience_level: profile.experienceLevel,
  });
};

// Initialize Google Analytics with content group and user properties
export const initGA = (measurementId: string) => {
  ReactGA.initialize(measurementId);
  
  // Set content_group to identify this is the APP (not landing page)
  ReactGA.gtag('set', 'content_group', 'app');
  
  // Set platform and version as persistent user properties
  setPlatformUserProperty();
  
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
  const platform = getPlatform();
  
  ReactGA.send({ 
    hitType: 'pageview', 
    page: path,
    page_title: `App: ${screenName}` // Prefix to differentiate from landing page
  });
  
  // Also fire as event with platform for better GA4 reporting
  ReactGA.event('screen_view', {
    screen_name: screenName,
    platform,
    app_version: APP_VERSION,
  });
  
  console.log('[Analytics] Page view:', screenName, { platform });
};

// User signup tracking with attribution
export const trackSignup = (method: 'email' | 'google') => {
  const platform = getPlatform();
  const attribution = getStoredAttribution();
  
  // Enhanced signup event with attribution and platform
  ReactGA.event('signup_complete', {
    method,
    platform,
    app_version: APP_VERSION,
    utm_source: attribution?.utm_source || 'direct',
    utm_medium: attribution?.utm_medium || 'none',
    utm_campaign: attribution?.utm_campaign || 'none',
    referrer: attribution?.referrer || 'none',
  });
  
  console.log('[Analytics] Signup:', { method, platform, app_version: APP_VERSION });
};

// User login tracking
export const trackLogin = (method: 'email' | 'google') => {
  const platform = getPlatform();
  
  ReactGA.event('login_complete', {
    method,
    platform,
    app_version: APP_VERSION,
  });
  
  console.log('[Analytics] Login:', { method, platform, app_version: APP_VERSION });
};

// Dose logging tracking - GA4 format with platform
export const trackDoseLogged = (compoundName: string, completed: boolean) => {
  const platform = getPlatform();
  
  ReactGA.event('dose_logged', {
    compound_name: compoundName,
    completed,
    platform,
    app_version: APP_VERSION,
  });
  
  console.log('[Analytics] Dose logged:', { compound: compoundName, completed, platform });
};

export const trackDoseSkipped = (compoundName: string) => {
  const platform = getPlatform();
  
  ReactGA.event('dose_skipped', {
    compound_name: compoundName,
    platform,
    app_version: APP_VERSION,
  });
};

// Compound tracking - includes compound_type and platform for GA4
export const trackCompoundAdded = (
  compoundName: string, 
  scheduleType: string,
  compoundType?: 'peptide' | 'trt' | 'glp1' | 'supplement' | 'other'
) => {
  const platform = getPlatform();
  
  ReactGA.event('compound_added', {
    compound_name: compoundName,
    schedule_type: scheduleType,
    compound_type: compoundType || 'other',
    platform,
    app_version: APP_VERSION,
  });
  
  console.log('[Analytics] Compound added:', { compound: compoundName, platform });
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

// Enhanced paywall tracking with detailed outcomes
export const trackPaywallPlanSelected = (planType: 'monthly' | 'annual', trigger: string) => {
  ReactGA.event('paywall_plan_selected', {
    plan_type: planType,
    trigger,
    platform: getPlatform(),
  });
};

export const trackPaywallPurchaseComplete = (planType: 'monthly' | 'annual', trigger: string, isPartnerPromo: boolean) => {
  ReactGA.event('paywall_purchase_complete', {
    plan_type: planType,
    trigger,
    is_partner_promo: isPartnerPromo,
    platform: getPlatform(),
  });
};

export const trackPaywallAbandoned = (trigger: string, timeSpentMs: number) => {
  ReactGA.event('paywall_abandoned', {
    trigger,
    time_spent_ms: timeSpentMs,
    time_spent_seconds: Math.round(timeSpentMs / 1000),
    platform: getPlatform(),
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

// Session counter for pre-conversion analytics
const SESSION_COUNT_KEY = 'regimen_session_count';

export const incrementSessionCount = (): number => {
  const current = parseInt(localStorage.getItem(SESSION_COUNT_KEY) || '0', 10);
  const next = current + 1;
  localStorage.setItem(SESSION_COUNT_KEY, String(next));
  return next;
};

export const getSessionCount = (): number => {
  return parseInt(localStorage.getItem(SESSION_COUNT_KEY) || '0', 10);
};

// Session tracking - GA4 format with platform
export const trackSessionStart = () => {
  const platform = getPlatform();
  const sessionCount = incrementSessionCount();
  
  ReactGA.event('session_started', {
    platform,
    app_version: APP_VERSION,
    session_number: sessionCount,
  });
  
  console.log('[Analytics] Session started:', { platform, app_version: APP_VERSION, session_number: sessionCount });
};

/**
 * Track user engagement state right before subscription purchase attempt.
 * This helps identify what engagement level predicts conversion.
 */
export const trackPreConversionState = (params: {
  dosesLoggedTotal: number;
  compoundsCount: number;
  daysSinceSignup: number;
  sessionsCount: number;
  selectedPlan: 'monthly' | 'annual';
}) => {
  const platform = getPlatform();
  
  ReactGA.event('pre_conversion_state', {
    platform,
    app_version: APP_VERSION,
    doses_logged_total: params.dosesLoggedTotal,
    compounds_count: params.compoundsCount,
    days_since_signup: params.daysSinceSignup,
    sessions_count: params.sessionsCount,
    selected_plan: params.selectedPlan,
  });
  
  console.log('[Analytics] Pre-conversion state:', params);
};

export const trackSessionEnd = (duration: number) => {
  const platform = getPlatform();
  
  ReactGA.event('session_ended', {
    duration_seconds: Math.round(duration / 1000),
    platform,
    app_version: APP_VERSION,
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

// Enhanced onboarding funnel tracking with platform
export const trackOnboardingStep = (screenId: string, stepNumber: number, totalSteps: number) => {
  const platform = getPlatform();
  
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
  
  // GA4 recommended event format with platform
  ReactGA.event('onboarding_step', {
    step_name: screenId,
    step_number: stepNumber,
    steps_total: totalSteps,
    progress_percent: progressPercent,
    funnel_position: funnelPosition,
    platform,
    app_version: APP_VERSION,
  });
};

export const trackOnboardingComplete = () => {
  const platform = getPlatform();
  
  ReactGA.event('onboarding_complete', {
    completed: true,
    platform,
    app_version: APP_VERSION,
  });
  
  console.log('[Analytics] Onboarding complete:', { platform, app_version: APP_VERSION });
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
  const platform = getPlatform();
  ReactGA.event('rating_requested', {
    source,
    platform,
    app_version: APP_VERSION,
  });
  console.log('[Analytics] Rating requested:', { source, platform });
};

export const trackRatingButtonTapped = (source: 'settings' | 'onboarding') => {
  const platform = getPlatform();
  ReactGA.event('rating_button_tapped', {
    source,
    platform,
    app_version: APP_VERSION,
  });
  console.log('[Analytics] Rating button tapped:', { source, platform });
};

export const trackRatingOutcome = (
  source: 'settings' | 'onboarding',
  outcome: 'plugin_not_available' | 'request_sent' | 'request_failed' | 'skipped_web' | 'testflight_detected' | 'fallback_store_link' | 'fallback_skipped'
) => {
  const platform = getPlatform();
  ReactGA.event('rating_outcome', {
    source,
    outcome,
    platform,
    app_version: APP_VERSION,
  });
  console.log('[Analytics] Rating outcome:', { source, outcome, platform });
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

// ============================================
// ACTIVATION TRACKING
// ============================================

/**
 * Check if user is currently in the onboarding flow.
 * Used to accurately track `added_during_onboarding` and `logged_during_onboarding`.
 */
export const isInOnboarding = (): boolean => {
  return localStorage.getItem('regimen_in_onboarding') === 'true';
};

/**
 * Track first compound added - fires ONCE per user lifetime.
 * Call this after successfully inserting a user's first compound.
 */
export const trackFirstCompoundAdded = (params: {
  timeSinceSignupHours: number;
}) => {
  const platform = getPlatform();
  const addedDuringOnboarding = isInOnboarding();
  
  ReactGA.event('first_compound_added', {
    platform,
    app_version: APP_VERSION,
    time_since_signup_hours: params.timeSinceSignupHours,
    added_during_onboarding: addedDuringOnboarding,
  });
  
  console.log('[Analytics] First compound added:', { 
    timeSinceSignupHours: params.timeSinceSignupHours,
    addedDuringOnboarding,
    platform 
  });
};

/**
 * Track activation complete (first dose logged) - fires ONCE per user lifetime.
 * This is the key "activation" moment indicating a user has truly engaged with the app.
 */
export const trackActivationComplete = (params: {
  timeSinceSignupHours: number;
  timeSinceFirstCompoundHours: number | null;
}) => {
  const platform = getPlatform();
  const loggedDuringOnboarding = isInOnboarding();
  
  ReactGA.event('activation_complete', {
    platform,
    app_version: APP_VERSION,
    time_since_signup_hours: params.timeSinceSignupHours,
    time_since_first_compound_hours: params.timeSinceFirstCompoundHours,
    logged_during_onboarding: loggedDuringOnboarding,
  });
  
  console.log('[Analytics] Activation complete:', { 
    timeSinceSignupHours: params.timeSinceSignupHours,
    timeSinceFirstCompoundHours: params.timeSinceFirstCompoundHours,
    loggedDuringOnboarding,
    platform 
  });
};
