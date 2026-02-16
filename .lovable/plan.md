

# Fix: Partner Promo Code "Already Redeemed" Block

## Problem
The `validate-promo-code` edge function has a duplicate redemption check that blocks users who previously entered the code but never completed the purchase. Your test account (`4ebf2b38`) has a stale redemption record from the first test where `offer_applied = false` (purchase was never completed), so the code now rejects TRYREGIMEN.

## Fix (2 parts)

### 1. Clean Up Stale Test Data
Delete the existing redemption record for your test account so you can re-test immediately.

### 2. Fix Edge Function Logic
Update the duplicate check in `validate-promo-code` so that if a user has a redemption record but `offer_applied` is still `false`, they are allowed to retry. Only block users who have already completed the purchase (`offer_applied = true`).

Current (broken) logic:
```
If any redemption exists -> block with "already used"
```

Fixed logic:
```
If redemption exists AND offer_applied = true -> block
If redemption exists AND offer_applied = false -> delete stale record, allow retry
If no redemption exists -> allow
```

### Technical Changes

**File: `supabase/functions/validate-promo-code/index.ts`**
- In `savePartnerAttribution`, change the duplicate check to look at `offer_applied` status
- If `offer_applied = false`, delete the stale record and allow a fresh redemption
- If `offer_applied = true`, block as before

**Database cleanup:**
- Delete the stale row from `partner_code_redemptions` for user `4ebf2b38`
- Reset `redemption_count` on the TRYREGIMEN partner code back to 0

After these changes, you can immediately re-test the TRYREGIMEN flow on your phone without changing anything else.

