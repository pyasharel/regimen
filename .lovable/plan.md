
# Comprehensive Analytics & User Profile Enhancement Plan

## Executive Summary

This plan creates a unified, cross-platform analytics system that gives you a complete picture of your users: who they are, where they come from, how they use the app, and why they might leave. It addresses the data discrepancies you're seeing between Google Analytics and RevenueCat while adding missing tracking capabilities.

---

## Current State Analysis

### What's Working Well
- UTM attribution captured on web and persisted to Supabase `profiles` table
- RevenueCat receives display name, email, and UTM attributes for native users
- GA4 tracks onboarding steps, feature usage, and subscription lifecycle events
- Server-side GA4 tracking via RevenueCat webhook for subscription events

### Critical Gaps Identified

| Issue | Impact |
|-------|--------|
| **App version hardcoded as "1.0.0"** | GA4 reports show incorrect version data; can't track upgrade adoption |
| **Platform not set as persistent GA4 user property** | Can't segment users by iOS/Android/Web in reports |
| **No app upgrade detection** | Can't see how quickly users adopt new versions |
| **Country not captured in RevenueCat or Supabase** | Geographic data missing from user profiles |
| **No platform in RevenueCat webhook events** | Can't correlate churn with platform in GA4 |
| **Onboarding attribution not saved for Google Sign-in** | Missing attribution data for ~30% of signups |
| **No centralized analytics initialization** | Platform detection happens too late |

---

## Implementation Plan

### Phase 1: Fix Version & Platform Tracking (Core Foundation)

#### 1.1 Sync App Version with Capacitor Config

**File:** `src/utils/analytics.ts`

```text
Current (broken):
  const APP_VERSION = '1.0.0';

Fixed:
  import { appVersion } from '../../capacitor.config';
  const APP_VERSION = appVersion; // Currently '1.0.3'
```

This ensures GA4 always reports the correct app version.

#### 1.2 Add Platform as Persistent GA4 User Property

**File:** `src/utils/analytics.ts`

Add a new function to set platform as a sticky user property:

```typescript
export const setPlatformUserProperty = () => {
  const platform = Capacitor.isNativePlatform() 
    ? Capacitor.getPlatform() // 'ios' | 'android'
    : 'web';
  
  ReactGA.gtag('set', 'user_properties', {
    user_platform: platform,
  });
  console.log('[Analytics] Platform user property set:', platform);
};
```

Call this in `initGA()` after initialization.

#### 1.3 Track App Version Upgrades

**File:** `src/utils/featureTracking.ts`

Add version tracking:

```typescript
const LAST_VERSION_KEY = 'regimen_last_app_version';

export const checkAndTrackVersionUpgrade = (currentVersion: string): void => {
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
  
  localStorage.setItem(LAST_VERSION_KEY, currentVersion);
};
```

---

### Phase 2: Enrich RevenueCat Customer Profiles

#### 2.1 Add Country Detection

**File:** `src/contexts/SubscriptionContext.tsx`

When identifying a user with RevenueCat, also attempt to set their country:

```typescript
// In identifyRevenueCatUser function, after setting email:

// Set country from browser locale (best effort)
try {
  const locale = navigator.language || 'en-US';
  const country = locale.split('-')[1] || 'Unknown';
  await Purchases.setAttributes({ 
    $countryCode: country,
    locale: locale,
  });
  console.log('[RevenueCat] Country/locale set:', country, locale);
} catch (e) {
  console.warn('[RevenueCat] Could not set country');
}
```

#### 2.2 Add Platform to RevenueCat

```typescript
// In identifyRevenueCatUser:
await Purchases.setAttributes({
  platform: Capacitor.getPlatform(), // 'ios' | 'android'
  app_version: appVersion,
});
```

#### 2.3 Add Platform to RevenueCat Webhook GA4 Events

**File:** `supabase/functions/revenuecat-webhook/index.ts`

Modify the `trackGA4Event` function to include platform from the webhook payload:

```typescript
// Extract platform from event
const platform = event.store === 'APP_STORE' ? 'ios' 
              : event.store === 'PLAY_STORE' ? 'android' 
              : 'web';

// Include in all GA4 events
params.platform = platform;
params.app_version = event.app_version || 'unknown';
```

---

### Phase 3: Fix Attribution Gaps

#### 3.1 Save Attribution for Google Sign-in Users

**File:** `src/pages/Auth.tsx`

The current code only saves attribution for email signups. Add the same logic after successful Google sign-in:

```typescript
// After Google sign-in success (around line 280):
const attribution = getStoredAttribution();
if (result.user && attribution && (attribution.utm_source || attribution.referrer)) {
  await supabase.from('profiles').update({
    utm_source: attribution.utm_source,
    utm_medium: attribution.utm_medium,
    utm_campaign: attribution.utm_campaign,
    utm_content: attribution.utm_content,
    referrer: attribution.referrer,
    landing_page: attribution.landing_page,
    attributed_at: new Date().toISOString(),
  }).eq('user_id', result.user.id);
  console.log('[Auth] Google Sign-in attribution persisted');
}
```

#### 3.2 Save Attribution for Onboarding Signups

**File:** `src/components/onboarding/screens/AccountCreationScreen.tsx`

Add attribution persistence after account creation:

```typescript
import { getStoredAttribution } from '@/utils/attribution';

// After successful signup, add:
const attribution = getStoredAttribution();
if (authData.user && attribution && (attribution.utm_source || attribution.referrer)) {
  await supabase.from('profiles').update({
    utm_source: attribution.utm_source,
    utm_medium: attribution.utm_medium,
    utm_campaign: attribution.utm_campaign,
    utm_content: attribution.utm_content,
    referrer: attribution.referrer,
    landing_page: attribution.landing_page,
    attributed_at: new Date().toISOString(),
  }).eq('user_id', authData.user.id);
}
```

---

### Phase 4: Add Country Tracking to Supabase

#### 4.1 Add Country Column to Profiles

**Migration SQL:**
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country_code TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS detected_locale TEXT;
```

#### 4.2 Capture Country on Signup

Add to both Auth.tsx and AccountCreationScreen.tsx:

```typescript
const locale = navigator.language || 'en-US';
const countryCode = locale.split('-')[1] || null;

await supabase.from('profiles').update({
  detected_locale: locale,
  country_code: countryCode,
}).eq('user_id', user.id);
```

---

### Phase 5: Enhanced Drop-off & Churn Tracking

#### 5.1 Add Screen Time Tracking

**File:** `src/hooks/useAnalytics.tsx`

Track time spent on each screen to identify engagement patterns:

```typescript
const screenEntryTime = useRef<number>(Date.now());
const lastScreen = useRef<string>('');

useEffect(() => {
  const screenName = SCREEN_MAP[location.pathname] || location.pathname;
  
  // Track time on previous screen
  if (lastScreen.current) {
    const timeSpent = Date.now() - screenEntryTime.current;
    ReactGA.event('screen_time', {
      screen_name: lastScreen.current,
      time_ms: timeSpent,
      time_seconds: Math.round(timeSpent / 1000),
    });
  }
  
  lastScreen.current = screenName;
  screenEntryTime.current = Date.now();
  
  trackPageView(location.pathname, screenName);
}, [location]);
```

#### 5.2 Track Paywall Outcomes

**File:** `src/components/SubscriptionPaywall.tsx`

Track which plan users select and if they complete purchase:

```typescript
// When user selects a plan:
trackPaywallPlanSelected(planType: 'monthly' | 'annual', trigger: string);

// When purchase completes:
trackPaywallPurchaseComplete(planType, trigger, isPartnerPromo);

// When user abandons at paywall:
trackPaywallAbandoned(trigger, timeSpentMs);
```

---

### Phase 6: Weekly Engagement Snapshots

#### 6.1 Trigger Weekly Snapshots

**File:** `src/hooks/useAppStateSync.tsx`

Add logic to fire a weekly engagement snapshot for cohort analysis:

```typescript
const WEEKLY_SNAPSHOT_KEY = 'regimen_last_engagement_snapshot';
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// On app resume, check if it's been a week:
const lastSnapshot = localStorage.getItem(WEEKLY_SNAPSHOT_KEY);
const lastSnapshotTime = lastSnapshot ? parseInt(lastSnapshot) : 0;

if (Date.now() - lastSnapshotTime > ONE_WEEK_MS) {
  // Fetch user metrics and fire snapshot
  const metrics = await fetchEngagementMetrics(userId);
  trackWeeklyEngagementSnapshot({
    compounds_count: metrics.compounds,
    doses_last_30d: metrics.doses,
    photos_count: metrics.photos,
    current_streak: metrics.streak,
    days_since_install: getDaysSinceInstall(),
    subscription_status: subscriptionStatus,
  });
  localStorage.setItem(WEEKLY_SNAPSHOT_KEY, Date.now().toString());
}
```

---

## Data Flow Diagram

```text
+-------------------+     +------------------+     +-------------------+
|   User Opens App  | --> | Capture Platform | --> | Set GA4 User      |
|                   |     | & Version        |     | Properties        |
+-------------------+     +------------------+     +-------------------+
                                  |
                                  v
+-------------------+     +------------------+     +-------------------+
|   User Signs Up   | --> | Capture UTM &    | --> | Save to Supabase  |
|   (any method)    |     | Country          |     | profiles table    |
+-------------------+     +------------------+     +-------------------+
                                  |
                                  v
+-------------------+     +------------------+     +-------------------+
|   Native: Login   | --> | RevenueCat       | --> | Set Attributes:   |
|   to RevenueCat   |     | Identify User    |     | email, name, UTM, |
+-------------------+     +------------------+     | country, platform |
                                                   +-------------------+
                                  |
                                  v
+-------------------+     +------------------+     +-------------------+
|   Subscription    | --> | RevenueCat       | --> | GA4 via Measure-  |
|   Event           |     | Webhook          |     | ment Protocol     |
+-------------------+     +------------------+     +-------------------+
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/utils/analytics.ts` | Import version from capacitor.config, add platform user property, fix version tracking |
| `src/utils/featureTracking.ts` | Add version upgrade detection |
| `src/hooks/useAnalytics.tsx` | Initialize platform property, add screen time tracking |
| `src/contexts/SubscriptionContext.tsx` | Add country/locale/platform to RevenueCat attributes |
| `src/pages/Auth.tsx` | Add attribution persistence for Google sign-in |
| `src/components/onboarding/screens/AccountCreationScreen.tsx` | Add attribution persistence for onboarding |
| `supabase/functions/revenuecat-webhook/index.ts` | Add platform and version to GA4 events |
| `src/hooks/useAppStateSync.tsx` | Add weekly engagement snapshot trigger |
| `src/components/SubscriptionPaywall.tsx` | Add detailed paywall outcome tracking |

**New Migration:**
- Add `country_code` and `detected_locale` columns to `profiles` table

---

## GA4 Custom Dimensions to Create

After implementation, create these custom dimensions in GA4 Admin:

| Dimension Name | Scope | Parameter |
|---------------|-------|-----------|
| User Platform | User | user_platform |
| App Version | User | app_version |
| UTM Source | User | first_utm_source |
| Subscription Status | Event | subscription_status |
| Plan Type | Event | plan_type |

---

## Expected Outcomes

After implementation, you'll be able to answer:

1. **"How many users are on iOS vs Android vs Web?"** - Filter any report by `user_platform`
2. **"How many users have upgraded to 1.0.3?"** - See `app_upgraded` events and version distribution
3. **"Where are my users coming from?"** - Query `profiles.country_code` or RevenueCat's `$countryCode`
4. **"Which traffic sources convert best?"** - Join `profiles.utm_source` with `subscription_status`
5. **"Why is GA4 data different from RevenueCat?"** - Platform user property ensures consistent segmentation across both systems
6. **"Where do users drop off in onboarding?"** - `onboarding_step` events with `step_number` and `funnel_position`
7. **"What's the profile of a churning user?"** - `subscription_cancelled` events include compounds, doses, photos count

---

## Why Data Might Be Different Between GA4 and RevenueCat

The discrepancy you're seeing (UK/France in GA4 vs US/Canada/Philippines in RevenueCat) is likely caused by:

1. **RevenueCat only tracks paying users** - It shows where your *subscribers* are from
2. **GA4 tracks all visitors** - Including people who visit but never sign up
3. **Different data sources** - GA4 uses IP geolocation; RevenueCat uses App Store/Play Store billing address

This plan harmonizes the data by:
- Adding country to Supabase profiles (single source of truth)
- Sending platform and country consistently to both GA4 and RevenueCat
- Using the same user_id across all systems for accurate joining
