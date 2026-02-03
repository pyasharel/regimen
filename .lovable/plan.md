
# Subscription Status Improvements Plan

## Overview
Update the RevenueCat webhook to properly distinguish between trial users and paid subscribers, matching the behavior already implemented for Stripe subscriptions.

## Changes

### 1. Update RevenueCat Webhook to Track Trial Status

**File:** `supabase/functions/revenuecat-webhook/index.ts`

Modify the `INITIAL_PURCHASE` handler to check `event.period_type`:

```text
Current behavior:
  INITIAL_PURCHASE → subscription_status = 'active'

New behavior:
  INITIAL_PURCHASE + period_type = 'TRIAL' → subscription_status = 'trialing'
  INITIAL_PURCHASE + period_type != 'TRIAL' → subscription_status = 'active'
```

**Technical details:**
- RevenueCat sends `period_type` field with values: `TRIAL`, `INTRO`, `NORMAL`
- Check if `event.period_type === 'TRIAL' || event.period_type === 'INTRO'` 
- Set `subscription_status = 'trialing'` for trial period
- Set `trial_end_date` from `event.expiration_at_ms` for trial users

### 2. Handle Trial-to-Paid Conversion Event

When a trial converts to paid, RevenueCat sends a `RENEWAL` event. Update the webhook to:
- For `RENEWAL` events where previous period was trial → set `subscription_status = 'active'`
- Clear `trial_end_date` when transitioning from trial to paid

### 3. Update GA4 Events for Better Analytics

The webhook already tracks `is_trial` in GA4 events, but ensure this is consistent across all event types:
- `subscription_started` - already has `is_trial` ✓
- `subscription_cancelled` - already has `was_trial` ✓
- Add trial info to renewal events to track trial-to-paid conversions

## What This Enables

After implementation, you'll be able to:

1. **In your database:**
   - Query `subscription_status = 'trialing'` → all trial users
   - Query `subscription_status = 'active'` → all paid users
   - Query `subscription_status IN ('active', 'trialing')` → all users with access

2. **In RevenueCat:**
   - Continue using "Active Subscription" filter
   - Sort by "Total Spent" to see paid users at top
   - Use Charts → Conversions for trial-to-paid funnel

3. **In GA4:**
   - Filter `subscription_started` events by `is_trial = true/false`
   - Track trial conversion rate over time

## Implementation Notes

- This is a non-breaking change - existing users with `active` status remain valid
- The frontend already handles `trialing` status correctly (from Stripe)
- Banners and UI will work immediately without changes

## Files Modified

1. `supabase/functions/revenuecat-webhook/index.ts` - Add trial detection logic
