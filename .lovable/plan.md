
# GA4 Analytics Improvement Plan (Updated)

## Summary

Add platform parameter to key events for better funnel analysis by iOS/Android/Web. Based on your suggestions and the current codebase, here's what makes sense:

## Events to Update

| Event | File | Change |
|-------|------|--------|
| `session_started` | `src/utils/analytics.ts` | Add `platform` and `app_version` parameters |
| `screen_view` / `pageview` | `src/utils/analytics.ts` | Add `platform` parameter |
| `compound_added` | `src/utils/analytics.ts` | Add `platform` parameter |
| `dose_logged` | `src/utils/analytics.ts` | Convert to GA4 format with `platform` parameter |
| `feature_first_use` | `src/utils/featureTracking.ts` | Add `platform` parameter |
| `onboarding_step` | `src/utils/analytics.ts` | Add `platform` parameter |

## Events Already Covered (No Changes Needed)

| Event | Why Skip |
|-------|----------|
| `subscription_purchased` | Already tracked with platform via `paywall_purchase_complete` and RevenueCat webhook |
| `subscription_trial_started` | Already tracked server-side via RevenueCat webhook with platform |

## Files to Modify

### 1. `src/utils/analytics.ts`

**Changes:**

- `trackSessionStart()` - Add platform and app_version parameters
- `trackPageView()` - Add platform parameter
- `trackCompoundAdded()` - Add platform parameter
- `trackDoseLogged()` - Convert from category/action format to GA4 event format with platform
- `trackOnboardingStep()` - Add platform parameter
- Add debug logging to key functions for troubleshooting

### 2. `src/utils/featureTracking.ts`

**Changes:**

- Import `getPlatform` from analytics
- Add platform parameter to `feature_first_use` event

### 3. `src/hooks/useAnalytics.tsx`

**Changes:**

- Add console log when GA4 initializes on native platforms
- Add console log when session starts with platform info

---

## Technical Details

### Updated Event Formats

**`trackDoseLogged` (Before):**
```typescript
ReactGA.event({
  category: 'Dose',
  action: completed ? 'Marked Complete' : 'Marked Incomplete',
  label: compoundName,
});
```

**`trackDoseLogged` (After):**
```typescript
ReactGA.event('dose_logged', {
  compound_name: compoundName,
  completed: completed,
  platform: getPlatform(),
  app_version: APP_VERSION,
});
```

**`trackSessionStart` (Before):**
```typescript
ReactGA.event({
  category: 'Session',
  action: 'Started',
});
```

**`trackSessionStart` (After):**
```typescript
ReactGA.event('session_started', {
  platform: getPlatform(),
  app_version: APP_VERSION,
});
```

**`feature_first_use` (After):**
```typescript
ReactGA.event('feature_first_use', {
  feature_name: featureKey,
  features_used_count: usedFeatures.length,
  features_remaining: FEATURE_KEYS.length - usedFeatures.length,
  platform: getPlatform(),
});
```

### Debug Logging

Adding console logs to verify events fire on native:

```typescript
console.log('[Analytics] Session started:', { platform, app_version });
console.log('[Analytics] Dose logged:', { compound, completed, platform });
console.log('[Analytics] Feature first use:', { feature, platform });
```

---

## GA4 Visibility After Implementation

Once deployed, you'll be able to:

1. **Event Reports**: Go to Reports > Engagement > Events and click any event to see breakdown by `platform` parameter
2. **Explorations**: Create funnels filtering by `platform = ios` vs `platform = android`
3. **Comparisons**: Compare conversion rates between platforms

## Timeline

- Code changes: ~10 minutes
- Deployment: Automatic with next build
- Data visible: 24-48 hours after users update to new version
