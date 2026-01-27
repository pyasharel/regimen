
# Plan: Simple TestFlight Sunset

## Summary

Based on my analysis, the situation is simpler than expected:

1. **Nicholas is the ONLY sandbox user** currently in your database with the "loophole" (1-day subscription duration). He already has 1-year beta access, so no cleanup needed for him.

2. **All other active subscribers have 14+ day durations** - these are legitimate production subscriptions with 2-week trials, not sandbox purchases.

3. **The webhook has no sandbox filtering** - this is the real vulnerability that needs fixing.

## The Plan (3 Simple Steps)

### Step 1: Fix the Webhook (Prevent Future Issues)

Add a single check at the top of the RevenueCat webhook to skip sandbox events:

**File:** `supabase/functions/revenuecat-webhook/index.ts`

After line 293 (after the anonymous user check), add:

```typescript
// Skip sandbox events - they should not update production profiles
// TestFlight purchases are test-only and don't represent real payments
if (event.environment === 'SANDBOX') {
  console.log("[REVENUECAT-WEBHOOK] Skipping sandbox event:", event.type, "for user:", userId);
  return new Response(JSON.stringify({ 
    success: true, 
    skipped: true, 
    reason: 'sandbox_event' 
  }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
```

This ensures:
- Future TestFlight "purchases" won't update production subscription status
- Real App Store purchases continue working normally
- The loophole is closed

### Step 2: Re-enable Migration Modal (with Fixed Messaging)

Update the existing `TestFlightMigrationModal.tsx` to:
- Remove the broken App Store link
- Instruct users to search "Regimen" in the App Store instead
- Explain that TestFlight purchases were test-only (no charges)
- Mention the build will expire soon

**Updated Modal Copy:**

```
Title: "Your TestFlight Version is Expiring"

Body: "This test version will stop working soon. Please search 
'Regimen' in the App Store to download the official version 
with automatic updates.

Important: Any previous purchases in TestFlight were for testing 
only - you were never charged. You'll need to subscribe in the 
App Store to unlock full access.

Your data is safe. Sign in with the same account and all your 
compounds, doses, and progress will be there."

Button: "Got It" (dismisses modal)
Secondary: "Maybe Later"
```

### Step 3: Add Modal Back to TodayScreen

Re-integrate the modal in `TodayScreen.tsx`:

```typescript
import { TestFlightMigrationModal } from '@/components/TestFlightMigrationModal';
import { TestFlightDetector } from '@/plugins/TestFlightDetectorPlugin';

// In component:
const [isTestFlight, setIsTestFlight] = useState(false);

useEffect(() => {
  TestFlightDetector.isTestFlight()
    .then(result => setIsTestFlight(result.isTestFlight))
    .catch(() => setIsTestFlight(false));
}, []);

// In render:
<TestFlightMigrationModal isTestFlight={isTestFlight} />
```

## What This Accomplishes

| Goal | How It's Addressed |
|------|-------------------|
| Close the loophole | Webhook ignores sandbox events |
| Inform TestFlight users | Modal explains situation clearly |
| No broken links | User searches App Store manually |
| Data preservation | All compounds/doses remain intact |
| No database changes | No new columns or cleanup needed |

## Edge Cases Handled

**Q: What if a TestFlight user makes another "purchase" after the fix?**
A: The webhook will ignore it (sandbox check). Their status stays as-is.

**Q: What if they stay on TestFlight?**
A: The build expires in 90 days. The modal reminds them to move.

**Q: What about their data when they switch?**
A: Preserved completely. Same Supabase account, same data. They just can't add new compounds until they subscribe.

**Q: What about Nicholas?**
A: He already has beta access until 2027. No action needed.

## Why No Database Cleanup Needed

I originally suggested SQL cleanup for "sandbox users," but after querying your database:
- Nicholas (the only 1-day duration user) already has beta access
- All other active users have 14+ day durations (legitimate 2-week trial subscriptions)

There are no other sandbox subscriptions to clean up.

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/revenuecat-webhook/index.ts` | Add sandbox event filter |
| `src/components/TestFlightMigrationModal.tsx` | Update messaging, remove broken link |
| `src/components/TodayScreen.tsx` | Re-add modal with TestFlight detection |

## TestFlight User Management

**Should you remove TestFlight users?** No need. Here's why:
- TestFlight is useful for future beta testing
- Builds expire naturally (90 days)
- You can still publish builds for internal testers when needed
- The modal will guide external testers to the App Store

**Best practice:** Keep the TestFlight group but stop publishing new builds to external testers. Internal testers can still receive builds for testing new features before App Store release.
