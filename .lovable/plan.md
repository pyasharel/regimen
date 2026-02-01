
# Analytics Fixes & RevenueCat Webhook Verification Plan

## Summary

This plan addresses two issues:
1. **RevenueCat Webhook Configuration** - The webhook is deployed and working, but you need to verify it's configured correctly in the RevenueCat dashboard
2. **Missing Platform Parameters** - 3 analytics events are missing `platform` and `app_version` parameters

---

## Part 1: RevenueCat Webhook Configuration (No Code Changes Needed)

### What I Found

- **Good News**: The webhook endpoint IS deployed and responding correctly
- **The webhook IS working for some users** - I can see recent subscribers (January 2026) have proper `subscription_start_date` and `subscription_end_date` values populated
- **Older subscribers (December 2025)** have null dates, suggesting they subscribed before the webhook was fully configured
- **Zero logs in Supabase analytics** - This could be a Supabase logging retention issue, not necessarily a webhook problem

### RevenueCat Dashboard Configuration

You need to verify these settings in the RevenueCat dashboard:

**Webhook URL:**
```
https://ywxhjnwaogsxtjwulyci.supabase.co/functions/v1/revenuecat-webhook
```

**Authorization Header:**
```
Authorization: [your REVENUECAT_WEBHOOK_SECRET value]
```

Note: RevenueCat sends the authorization value directly (not as "Bearer token"), so whatever secret you configured should match exactly what's in the Supabase secret.

### How to Test

1. In RevenueCat Dashboard → Webhooks → Send Test Event
2. Check Supabase Edge Function logs immediately after
3. Look for `[REVENUECAT-WEBHOOK]` log entries

---

## Part 2: Add Platform Parameter to 3 Events

### Changes Required

**File: `src/utils/analytics.ts`**

#### 1. Update `trackSignup` (lines 105-121)
Add `platform` and `app_version` to both event calls:
```typescript
export const trackSignup = (method: 'email' | 'google') => {
  const platform = getPlatform();
  const attribution = getStoredAttribution();
  
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
```

#### 2. Update `trackLogin` (lines 124-130)
Add platform tracking:
```typescript
export const trackLogin = (method: 'email' | 'google') => {
  const platform = getPlatform();
  ReactGA.event('login_complete', {
    method,
    platform,
    app_version: APP_VERSION,
  });
  console.log('[Analytics] Login:', { method, platform, app_version: APP_VERSION });
};
```

#### 3. Update `trackOnboardingComplete` (lines 509-519)
Add platform tracking:
```typescript
export const trackOnboardingComplete = () => {
  const platform = getPlatform();
  ReactGA.event('onboarding_complete', {
    completed: true,
    platform,
    app_version: APP_VERSION,
  });
  console.log('[Analytics] Onboarding complete:', { platform, app_version: APP_VERSION });
};
```

---

## Part 3: Enhanced Webhook Debugging (Optional)

If you want more visibility into webhook calls, I can add enhanced logging to capture:
- Full event payload (sanitized)
- Timestamp of each call
- Response status sent back to RevenueCat

---

## Verification Checklist

After implementation:

| Task | Status |
|------|--------|
| RevenueCat webhook URL configured | Manual check needed |
| Authorization header matches secret | Manual check needed |
| `trackSignup` has platform param | Will implement |
| `trackLogin` has platform param | Will implement |
| `trackOnboardingComplete` has platform param | Will implement |
| Debug logging active | Will implement |

---

## How to Verify Events in GA4

1. **Realtime**: GA4 → Reports → Realtime → Events
2. **Debug View**: GA4 → Admin → DebugView (requires enabling debug mode)
3. **Console Logs**: Check Safari Web Inspector on iOS or Chrome DevTools

Expected console output after changes:
```
[Analytics] Signup: { method: 'email', platform: 'ios', app_version: '1.0.3' }
[Analytics] Login: { method: 'google', platform: 'android', app_version: '1.0.3' }
[Analytics] Onboarding complete: { platform: 'ios', app_version: '1.0.3' }
```

---

## Technical Notes

- The webhook IS working - recent subscribers have populated subscription data
- The "no logs" issue is likely Supabase analytics log retention, not a webhook failure
- RevenueCat's authorization header is sent as the raw value (not Bearer format)
- All GA4 events from the webhook already include `platform` and `source: "revenuecat_webhook"`
