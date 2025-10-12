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
    label: compoundName,
    value: scheduleType === 'daily' ? 1 : 2,
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

// Premium feature tracking
export const trackPremiumModalOpened = (source: string) => {
  ReactGA.event({
    category: 'Premium',
    action: 'Modal Opened',
    label: source,
  });
};

export const trackPremiumFeatureAttempt = (feature: string) => {
  ReactGA.event({
    category: 'Premium',
    action: 'Feature Attempted',
    label: feature,
  });
};

export const trackPremiumToggled = (enabled: boolean) => {
  ReactGA.event({
    category: 'Premium',
    action: enabled ? 'Enabled' : 'Disabled',
    label: 'Test Mode',
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
