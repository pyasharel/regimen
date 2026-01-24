
## Comprehensive Analytics Implementation Plan

### Problem Summary
Your GA4 property mixes data from two sources (landing page + app) with no way to differentiate them. The screenshot shows entries like "Regimen" (app) alongside "Peptide Reconstitution Calculator | Free Dosing Tool | Regimen" (landing page), making analysis difficult.

---

## Part 1: Separate Landing Page vs App Traffic (Content Groups)

### What to Change in THIS Project (App)

**1. Add Content Group on GA4 Initialization**
```typescript
// In src/utils/analytics.ts - modify initGA
export const initGA = (measurementId: string) => {
  ReactGA.initialize(measurementId);
  
  // Set content_group to identify this is the APP (not landing page)
  ReactGA.gtag('set', 'content_group', 'app');
  
  // Set a custom dimension for app version tracking
  ReactGA.gtag('set', 'user_properties', {
    platform_type: 'app',
    app_version: '1.0.0' // Could read from package.json
  });
};
```

**2. Override Page Titles for Cleaner Reports**
Instead of letting GA4 pick up the HTML title, send explicit, short screen names:
```typescript
// Modify trackPageView to send custom page_title
export const trackPageView = (path: string, screenName?: string) => {
  ReactGA.send({ 
    hitType: 'pageview', 
    page: path,
    page_title: screenName || `App: ${path}` // Prefix to identify app screens
  });
};
```

### What to Tell the Landing Page Project

The landing page should add this to their GA4 initialization:
```javascript
// In landing page analytics initialization
gtag('set', 'content_group', 'website');
gtag('set', 'user_properties', { platform_type: 'website' });
```

Now in GA4, you can filter by content_group: "app" vs "website" to see each separately.

---

## Part 2: UTM Parameter Capture (Attribution Tracking)

**Why**: When users click "Get Regimen" on landing page, you need to know they came from there.

**1. Create Attribution Capture Utility**
Create `src/utils/attribution.ts`:
```typescript
// Capture and store UTM parameters on app entry
export const captureAttribution = () => {
  const params = new URLSearchParams(window.location.search);
  
  const attribution = {
    utm_source: params.get('utm_source'),
    utm_medium: params.get('utm_medium'),
    utm_campaign: params.get('utm_campaign'),
    utm_content: params.get('utm_content'),
    utm_term: params.get('utm_term'),
    referrer: document.referrer || null,
    landing_page: window.location.pathname,
    captured_at: new Date().toISOString()
  };
  
  // Store for later use (signup attribution)
  if (attribution.utm_source) {
    sessionStorage.setItem('regimen_attribution', JSON.stringify(attribution));
  }
  
  return attribution;
};

export const getStoredAttribution = () => {
  const stored = sessionStorage.getItem('regimen_attribution');
  return stored ? JSON.parse(stored) : null;
};
```

**2. Set User Properties in GA4**
In the GA4 initialization, after capturing:
```typescript
const attribution = captureAttribution();
if (attribution.utm_source) {
  ReactGA.gtag('set', 'user_properties', {
    first_utm_source: attribution.utm_source,
    first_utm_campaign: attribution.utm_campaign
  });
}
```

**3. Landing Page Links Should Include UTM**
Tell landing page team to use links like:
```
https://regimen.lovable.app/auth?utm_source=landing&utm_medium=website&utm_campaign=main_cta
https://regimen.lovable.app/auth?utm_source=landing&utm_medium=calculator&utm_campaign=peptide_calc
```

---

## Part 3: User Identity Linking

**Why**: To track the same user across sessions and analyze churn by usage patterns.

**1. Set GA4 User ID After Authentication**
In `src/pages/Auth.tsx` or after successful signup/login:
```typescript
import ReactGA from 'react-ga4';

// After successful auth
ReactGA.gtag('set', 'user_id', user.id);
ReactGA.event({
  category: 'User',
  action: method === 'signup' ? 'Signup' : 'Login',
  label: authMethod // 'email' or 'google'
});
```

**2. Attach Attribution to Signup Event**
```typescript
// When user signs up
const attribution = getStoredAttribution();
ReactGA.event({
  category: 'User',
  action: 'Signup',
  label: authMethod,
  // Custom parameters
  utm_source: attribution?.utm_source || 'direct',
  utm_campaign: attribution?.utm_campaign || 'none'
});
```

---

## Part 4: Enhanced Onboarding Funnel

**Currently**: You track `trackOnboardingStep(screenId, stepNumber, totalSteps)` but parameters get lost in GA4's event structure.

**Improvement**: Use GA4's recommended event parameters for funnel visualization:
```typescript
export const trackOnboardingStep = (screenId: string, stepNumber: number, totalSteps: number) => {
  ReactGA.event('onboarding_step', {
    step_name: screenId,
    step_number: stepNumber,
    steps_total: totalSteps,
    // Calculate progress percentage for easy filtering
    progress_percent: Math.round((stepNumber / totalSteps) * 100)
  });
};

// Track specific drop-off points
export const trackOnboardingSkip = (screenId: string, reason?: string) => {
  ReactGA.event('onboarding_skip', {
    skip_screen: screenId,
    skip_reason: reason || 'unknown',
    // Where in the funnel they dropped
    funnel_position: 'early' | 'middle' | 'late'
  });
};
```

---

## Part 5: Subscription Lifecycle Analytics (Server-Side)

**Why**: Client-side tracking misses cancellations and expirations that happen outside the app.

**1. Enhance RevenueCat Webhook to Send GA4 Events**
In `supabase/functions/revenuecat-webhook/index.ts`, add GA4 Measurement Protocol calls:
```typescript
// After updating the database, send GA4 event
const trackServerEvent = async (userId: string, eventName: string, params: Record<string, unknown>) => {
  const measurementId = Deno.env.get('GA4_MEASUREMENT_ID');
  const apiSecret = Deno.env.get('GA4_API_SECRET');
  
  if (!measurementId || !apiSecret) return;
  
  await fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`, {
    method: 'POST',
    body: JSON.stringify({
      client_id: userId,
      user_id: userId,
      events: [{ name: eventName, params }]
    })
  });
};

// In switch statement, add:
case "INITIAL_PURCHASE":
  await trackServerEvent(userId, 'subscription_started', {
    plan_type: subscriptionType,
    source: 'revenuecat',
    is_trial: event.period_type === 'TRIAL'
  });
  break;

case "CANCELLATION":
  await trackServerEvent(userId, 'subscription_cancelled', {
    reason: event.cancel_reason || 'unknown',
    days_active: calculateDaysActive(event)
  });
  break;

case "EXPIRATION":
  await trackServerEvent(userId, 'subscription_expired', {
    was_trial: event.period_type === 'TRIAL',
    lifetime_value: event.price || 0
  });
  break;
```

**2. Required Secrets**
- `GA4_MEASUREMENT_ID`: Your GA4 ID (G-YD7H95V3S9)
- `GA4_API_SECRET`: Create in GA4 Admin → Data Streams → Measurement Protocol API secrets

---

## Part 6: Feature Engagement & Retention Signals

**1. Track App Opens (Native)**
```typescript
// In App.tsx or useAppStateSync
import { App as CapacitorApp } from '@capacitor/app';

CapacitorApp.addListener('appStateChange', ({ isActive }) => {
  if (isActive) {
    ReactGA.event('app_opened', {
      platform: Capacitor.getPlatform(),
      days_since_install: calculateDaysSinceInstall()
    });
  }
});
```

**2. Track Feature First-Use**
```typescript
// New utility: src/utils/featureTracking.ts
const FEATURE_KEYS = ['calculator', 'photo_compare', 'cycle', 'levels_graph', 'share'];

export const trackFeatureFirstUse = (featureKey: string) => {
  const usedFeatures = JSON.parse(localStorage.getItem('used_features') || '[]');
  
  if (!usedFeatures.includes(featureKey)) {
    usedFeatures.push(featureKey);
    localStorage.setItem('used_features', JSON.stringify(usedFeatures));
    
    ReactGA.event('feature_first_use', {
      feature_name: featureKey,
      features_used_count: usedFeatures.length
    });
  }
};
```

**3. Track Engagement Quality**
```typescript
// In SubscriptionContext or weekly digest
export const trackEngagementSnapshot = () => {
  const compoundCount = getCompoundCount();
  const doseHistory = getDoseHistory();
  const photoCount = getPhotoCount();
  
  ReactGA.event('engagement_snapshot', {
    compounds_active: compoundCount,
    doses_logged_30d: doseHistory.last30Days,
    photos_total: photoCount,
    current_streak: getCurrentStreak(),
    engagement_score: calculateEngagementScore()
  });
};
```

---

## Part 7: Churn Analysis Data

**Why**: To analyze what users DID or DIDN'T do before cancelling.

**1. Save User Engagement Summary on Subscription Events**
When someone cancels, the webhook should fetch their usage:
```typescript
// In revenuecat-webhook, on CANCELLATION
const { data: userStats } = await supabase
  .from('compounds')
  .select('id')
  .eq('user_id', userId);

const { data: doseStats } = await supabase
  .from('dose_logs')
  .select('id')
  .eq('user_id', userId)
  .gte('created_at', thirtyDaysAgo);

await trackServerEvent(userId, 'subscription_cancelled', {
  compounds_count: userStats?.length || 0,
  doses_last_30d: doseStats?.length || 0,
  // This data helps you understand: "Did inactive users churn?"
});
```

---

## Summary: Files to Modify

| File | Changes |
|------|---------|
| `src/utils/analytics.ts` | Add content_group, improve page titles, add user_id support, enhance onboarding tracking |
| `src/utils/attribution.ts` | NEW: UTM capture and storage utility |
| `src/hooks/useAnalytics.tsx` | Add attribution capture on app load, improved screen names |
| `src/pages/Auth.tsx` | Set GA4 user_id after auth, attach attribution to signup |
| `src/main.tsx` | Call captureAttribution on init |
| `supabase/functions/revenuecat-webhook/index.ts` | Add GA4 Measurement Protocol calls for subscription lifecycle |
| `.env.example` | Document GA4_API_SECRET requirement |

---

## Landing Page Coordination Checklist

Tell the other Lovable project:
1. Add `gtag('set', 'content_group', 'website')` after GA4 init
2. Add UTM parameters to all "Get Regimen" / "Download" links:
   - Main CTA: `?utm_source=landing&utm_medium=cta&utm_campaign=hero`
   - Calculator CTA: `?utm_source=landing&utm_medium=calculator&utm_campaign=peptide_calc`
   - Partner pages: `?utm_source=partner&utm_medium=referral&utm_campaign=[partner_slug]`
3. Consider shorter page titles for blog/content pages: "Calculator | Regimen" instead of full SEO titles

---

## GA4 Configuration (Manual Steps)

After implementation, configure in GA4 Admin:
1. Create custom dimensions for: `utm_source`, `platform_type`, `feature_name`
2. Create audiences: "App Users" (content_group = app), "Website Visitors" (content_group = website)
3. Set up Funnel Exploration for onboarding steps
4. Create Measurement Protocol API secret for server-side events
