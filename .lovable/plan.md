

## Dual-Track Activation Event Recording

### Problem
Database confirms 10+ users triggered activation, but GA4 only shows 1 event. `ReactGA.event()` calls from Capacitor's native WebView are unreliable -- events may not flush before the app backgrounds.

### Solution
Add a database write to the `user_activity` table alongside every GA4 event call, giving you a reliable server-side record you can query directly.

### Changes

**1. `src/utils/analytics.ts` -- Add database writes inside both tracking functions**

Update `trackFirstCompoundAdded()` to also insert into `user_activity`:
- `event_type: 'funnel'`
- `event_name: 'first_compound_added'`
- `metadata: { time_since_signup_hours, added_during_onboarding, platform, app_version }`

Update `trackActivationComplete()` to also insert into `user_activity`:
- `event_type: 'funnel'`
- `event_name: 'activation_complete'`
- `metadata: { time_since_signup_hours, time_since_first_compound_hours, logged_during_onboarding, platform, app_version }`

Both functions will need the user ID passed in as a new parameter. The database write will be fire-and-forget (no await blocking the UI).

**2. `src/components/TodayScreen.tsx` -- Pass userId to `trackActivationComplete()`**

Add `userId` to the call at ~line 816.

**3. `src/components/AddCompoundScreen.tsx` -- Pass userId to `trackFirstCompoundAdded()`**

Add `userId` to the call at ~line 1491.

**4. `src/components/onboarding/screens/AccountCreationScreen.tsx` -- Pass userId to `trackFirstCompoundAdded()`**

Add `userId` to the call at ~line 327.

### No schema or migration changes needed
The `user_activity` table already exists with the right columns and RLS policies.

### Result
You can query your activation funnel directly:
```sql
SELECT event_name, COUNT(*), MIN(created_at), MAX(created_at)
FROM user_activity
WHERE event_name IN ('activation_complete', 'first_compound_added')
GROUP BY event_name
```

