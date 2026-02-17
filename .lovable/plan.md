
# Add `last_active_date` to RevenueCat Attribute Sync

## What this does
Adds one new attribute -- `last_active_date` -- to the data synced to RevenueCat on every app open. This lets you filter customers in RevenueCat by when they last used the app (e.g., find subscribers who haven't opened the app in 14+ days for churn risk analysis).

## Technical details

**File:** `src/contexts/SubscriptionContext.tsx`

In the engagement attributes block (around line 854), add `last_active_date` from the profile's `last_active_at` field:

```typescript
// Inside the profile-based attributes section, after path_type:
if (profile.last_active_at) {
  engagementAttrs.last_active_date = profile.last_active_at.split('T')[0]; // YYYY-MM-DD
}
```

This is a single line addition. The `last_active_at` field already exists on the `profiles` table and is already being updated on app activity, so no database changes are needed. The attribute will backfill for all existing users on their next app open.
