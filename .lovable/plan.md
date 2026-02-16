
# Fix Partner Promo Code UX on Paywall

## Problems Identified
1. **Welcome message is hidden** -- it appears at the very top of the modal, but the user just applied the code at the bottom, so they never see it without scrolling up
2. **Partner name is "Generic Partner"** -- the TRYREGIMEN code has `partner_name = 'Generic Partner'` in the database; it should say "Regimen"
3. **Button still says "Start My 14-Day Free Trial"** -- should say something like "Get My 1 Month Free"
4. **Plan selection still shows monthly + annual** -- partner promo locks to annual, so the monthly option should be hidden or disabled
5. **Timeline still shows 14-day trial steps** -- should reflect the 1-month free period

## Changes

### 1. Database: Update partner name for TRYREGIMEN
Update the `partner_promo_codes` row so `partner_name` = `'Regimen'` instead of `'Generic Partner'`.

### 2. Move welcome message next to the promo code input (SubscriptionPaywall.tsx)
- Remove the VIP partner welcome banner from the top header area (lines 566-572)
- Add it directly below the promo code section (after line 784), so it appears right where the user just applied the code

### 3. Update button text for partner promos (SubscriptionPaywall.tsx)
In `getButtonText()` (line 522), change the partner promo text from "Start My 14-Day Free Trial" to "Get My 1 Month Free".

### 4. Lock plan to annual when partner promo is active (SubscriptionPaywall.tsx)
- Auto-select annual plan when partner promo is set (`setSelectedPlan('annual')` in the apply handler -- this already happens implicitly since annual is default, but we should enforce it)
- Hide or disable the monthly pricing card when `partnerPromo` is active, so only the annual option is visible

### 5. Update timeline for partner promos (SubscriptionPaywall.tsx)
When `partnerPromo` is set, change the timeline steps:
- TODAY: "Unlock all features -- 1 month free from [partner]"
- IN 29 DAYS: "We'll send a reminder that your free month is ending"
- IN 30 DAYS: "Billing starts at $39.99/year. Cancel anytime."

### 6. Update price text for partner promos (SubscriptionPaywall.tsx)
In `getPriceText()`, when `partnerPromo` is active, show "1 month free, then $39.99/year ($3.33/month)" instead of the 14-day trial text.

### 7. Update header text for partner promos (SubscriptionPaywall.tsx)
Change the header from "Start your 14-day FREE trial" to "Get 1 month FREE" when a partner promo is active.

## Technical Notes
- All UI changes are in `src/components/SubscriptionPaywall.tsx`
- One database update to `partner_promo_codes` table for the TRYREGIMEN partner name
- No edge function changes needed -- this is purely UI/UX
- The purchase flow logic itself remains unchanged (it already correctly triggers the Google Play partner offer)
