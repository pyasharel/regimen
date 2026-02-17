
## Fix Trial Status Override + Streak Badge Cutoff

### Problem 1: Trial status keeps getting overwritten

The `check-subscription` edge function queries Stripe, finds no subscription for TestyTester, and writes `subscription_status: 'none'`, `trial_end_date: null` back to the profile. This happens every time the app loads or resumes. So even after we set the profile to `trialing`, the next edge function call wipes it.

**Fix:** Update the edge function to NOT overwrite `subscription_status` and `trial_end_date` when the profile already has an active trial that hasn't expired. Before writing `none`, it will check if the profile has `subscription_status = 'trialing'` with a `trial_end_date` in the future. If so, it preserves that status and returns `subscribed: true, status: 'trialing'`.

This also enables a general-purpose "manual trial grant" workflow: set the profile fields in the database and the edge function respects them.

| File | Change |
|------|--------|
| `supabase/functions/check-subscription/index.ts` | Before writing `none` (in both the "no customer" and "no active subscription" branches), check if profile has `subscription_status = 'trialing'` AND `trial_end_date > now()`. If so, return the trial status instead of overwriting to `none`. |

After deploying, re-apply the trial status to TestyTester's profile:
- `subscription_status` = `'trialing'`
- `trial_end_date` = 7 days from now
- `subscription_type` = `'monthly'`

### Problem 2: Streak badge getting cut off

The greeting row layout doesn't constrain the left side properly. The name text pushes outward and the StreakBadge overflows off-screen.

**Fix:** Add `min-w-0` and `overflow-hidden` to the inner greeting div so the `truncate` on the h2 actually works, and add `flex-shrink-0` to the StreakBadge wrapper so it never gets squeezed.

| File | Change |
|------|--------|
| `src/components/TodayScreen.tsx` (line ~1412) | Add `min-w-0` to the inner `div.flex.items-center.gap-3` so the truncated name respects boundaries |

### Test Plan

After these changes:
1. Reload the app -- TestyTester should show as "trialing" (no free plan banner)
2. The streak badge should be fully visible next to the greeting, even with a long name
3. The edge function will no longer wipe manually-set trial statuses

### Technical Details

**Edge function change (check-subscription/index.ts):**

In both "no Stripe customer found" and "no active subscription found" code paths, before updating the profile to `none`, add a check:

```text
// Fetch current profile status
const { data: currentProfile } = await supabaseClient
  .from('profiles')
  .select('subscription_status, trial_end_date')
  .eq('user_id', user.id)
  .maybeSingle();

// Preserve manually-granted trials
if (currentProfile?.subscription_status === 'trialing' && 
    currentProfile?.trial_end_date && 
    new Date(currentProfile.trial_end_date) > new Date()) {
  // Don't overwrite -- return the existing trial status
  return Response with { subscribed: true, status: 'trialing', ... }
}
```

**TodayScreen.tsx layout fix (line ~1412):**

```text
// Before:
<div className="flex items-center gap-3">

// After:
<div className="flex items-center gap-3 min-w-0">
```

This ensures CSS truncation works on the greeting text and the streak badge stays visible.
