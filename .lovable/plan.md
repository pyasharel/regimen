

## Plan: Hybrid Partner Attribution with First-Year Revenue Tracking

### Overview
Replace the Safari redirect flow with native RevenueCat purchases while maintaining partner attribution. Track first-year revenue for quarterly partner payouts (25% cut).

---

### Phase 1: Database Schema Update

**Migration: Add first-year tracking fields to `partner_code_redemptions`**

Add columns:
- `first_year_end` (timestamptz) - 12 months after conversion, used to determine when to stop counting renewals
- `last_revenue_update` (timestamptz) - Timestamp of last revenue update from webhook

This allows the webhook to update `first_year_revenue` on each renewal until the first year is complete.

---

### Phase 2: Update validate-promo-code Edge Function

**File: `supabase/functions/validate-promo-code/index.ts`**

Changes:
- Add `useNativePurchase: true` flag for partner codes
- Remove `redemptionUrl` generation (no Safari redirect needed)
- Keep `partnerName` and `partnerCodeId` for attribution tracking

**Response for partner codes will change from:**
```json
{
  "valid": true,
  "isAppleOfferCode": true,
  "redemptionUrl": "https://apps.apple.com/redeem?...",
  ...
}
```

**To:**
```json
{
  "valid": true,
  "isPartnerCode": true,
  "useNativePurchase": true,
  "partnerName": "Research 1 Peptides",
  "partnerCodeId": "uuid-here",
  ...
}
```

---

### Phase 3: Update SubscriptionPaywall.tsx

**File: `src/components/SubscriptionPaywall.tsx`**

**Remove:**
- `AppleOfferCodePromo` interface and state
- `isAwaitingAppleReturn` state
- Safari resume listener (`handleAppResume`)
- Safari Browser.open flow for partner codes
- Code copy/clipboard UI

**Add:**
- Save partner attribution to `partner_code_redemptions` table when code is validated
- Display VIP welcome message: "Welcome from Research 1 Peptides!"
- Use standard `purchasePackage()` flow (same as organic users)
- Let plan selection remain user's choice (monthly or annual)

**New Partner Code Flow:**
```
1. User enters RESEARCH1 → Validate against partner_promo_codes
2. Show: "Welcome from Research 1 Peptides! Start your 14-day free trial"
3. Insert record into partner_code_redemptions (user_id, code_id, redeemed_at)
4. User taps "Start Trial" → Native Face ID purchase
5. RevenueCat webhook links subscription to redemption on INITIAL_PURCHASE
```

---

### Phase 4: Update OnboardingPaywallScreen.tsx

**File: `src/components/onboarding/screens/OnboardingPaywallScreen.tsx`**

Apply the same partner attribution logic:
- When promo code is validated as a partner code, save attribution
- Show VIP welcome message
- Use standard RevenueCat purchase flow

---

### Phase 5: Enhance RevenueCat Webhook for Revenue Tracking

**File: `supabase/functions/revenuecat-webhook/index.ts`**

**On INITIAL_PURCHASE:**
1. Look up pending redemption for user (where `converted_at` is null)
2. Calculate `first_year_revenue` based on plan:
   - Annual: $39.99 (minus Apple's 30% = ~$28)
   - Monthly: $4.99 (minus 30% = ~$3.50)
3. Set `first_year_end` = converted_at + 12 months
4. Mark as converted

**On RENEWAL:**
1. Check if user has a partner redemption
2. Check if current date is before `first_year_end`
3. If yes, add renewal revenue to `first_year_revenue`
4. Update `last_revenue_update` timestamp

---

### Phase 6: Partner Revenue Reporting Queries

After implementation, calculate quarterly partner payouts with:

```sql
-- Quarterly partner payout report
SELECT 
  ppc.partner_name,
  COUNT(DISTINCT pcr.user_id) as total_conversions,
  SUM(pcr.first_year_revenue) as total_first_year_revenue,
  ROUND(SUM(pcr.first_year_revenue) * 0.25, 2) as partner_payout_25_percent
FROM partner_code_redemptions pcr
JOIN partner_promo_codes ppc ON pcr.code_id = ppc.id
WHERE pcr.converted_at IS NOT NULL
  AND pcr.converted_at >= '2025-01-01'  -- Adjust quarter dates
  AND pcr.converted_at < '2025-04-01'
GROUP BY ppc.partner_name
ORDER BY partner_payout_25_percent DESC;
```

---

### Manual Steps After Implementation

**Delete Apple Custom Offer Codes (App Store Connect):**
- RESEARCH1
- TRYREGIMEN

These are no longer needed since partner users will use the standard 14-day trial flow.

**Keep Standard Introductory Offer:**
- 14-day free trial on both monthly and annual products (no changes needed)

---

### Files to Modify Summary

| File | Changes |
|------|---------|
| `partner_code_redemptions` table | Add `first_year_end`, `last_revenue_update` columns |
| `validate-promo-code/index.ts` | Add `useNativePurchase: true`, remove `redemptionUrl` |
| `SubscriptionPaywall.tsx` | Remove Safari flow, save attribution before purchase, show VIP message |
| `OnboardingPaywallScreen.tsx` | Add partner code handling with attribution |
| `revenuecat-webhook/index.ts` | Calculate and update first_year_revenue on renewals |

---

### User Experience Summary

**Organic Users (unchanged):**
1. See paywall with 14-day trial messaging
2. Select monthly ($4.99) or annual ($39.99)
3. Tap "Start Trial" → Face ID → Done

**Partner-Referred Users (simplified):**
1. Enter partner code (e.g., RESEARCH1)
2. See: "Welcome from Research 1 Peptides! Start your 14-day free trial"
3. Select monthly or annual plan
4. Tap "Start Trial" → Face ID → Done
5. Attribution tracked for partner payout

---

### Revenue Tracking Example

**Annual subscriber via RESEARCH1:**
- Converted: Jan 15, 2025
- First year revenue: $39.99 × 0.70 (after Apple cut) = ~$28
- Partner payout (25%): ~$7

**Monthly subscriber via RESEARCH1:**
- Converted: Jan 15, 2025
- Month 1: $4.99 × 0.70 = ~$3.50
- Month 6: Cumulative = ~$21
- Month 12: Cumulative = ~$42
- Partner payout after 12 months (25%): ~$10.50

