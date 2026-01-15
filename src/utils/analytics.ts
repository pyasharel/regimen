import ReactGA from 'react-ga4';

// Initialize Google Analytics
export const initGA = (measurementId: string) => {
  ReactGA.initialize(measurementId);
};

// Page view tracking
export const trackPageView = (path: string) => {
  ReactGA.send({ hitType: 'pageview', page: path });
};

// User signup tracking
export const trackSignup = (method: 'email' | 'google') => {
  ReactGA.event({
    category: 'User',
    action: 'Signup',
    label: method,
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

// Compound tracking
export const trackCompoundAdded = (compoundName: string, scheduleType: string) => {
  ReactGA.event({
    category: 'Compound',
    action: 'Added',
    label: `${compoundName} - ${scheduleType}`,
  });
  // Also track the schedule type separately for easier filtering
  ReactGA.event({
    category: 'Schedule',
    action: 'Type Selected',
    label: scheduleType,
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

// Calculator tracking
export const trackCalculatorUsed = (calculatorType: 'iu' | 'ml') => {
  ReactGA.event({
    category: 'Calculator',
    action: 'Used',
    label: calculatorType.toUpperCase(),
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
export const trackShareAction = (shareType: 'stack' | 'progress' | 'photo') => {
  ReactGA.event({
    category: 'Social',
    action: 'Share',
    label: shareType,
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

// Screen tracking
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

// Onboarding funnel tracking
export const trackOnboardingStep = (screenId: string, stepNumber: number, totalSteps: number) => {
  ReactGA.event({
    category: 'Onboarding',
    action: 'Screen View',
    label: screenId,
    value: stepNumber,
  });
};

export const trackOnboardingComplete = () => {
  ReactGA.event({
    category: 'Onboarding',
    action: 'Completed',
  });
};

export const trackOnboardingSkip = (screenId: string, reason?: string) => {
  ReactGA.event({
    category: 'Onboarding',
    action: 'Skipped',
    label: reason ? `${screenId}: ${reason}` : screenId,
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
