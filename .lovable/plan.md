

# Add SOG Partner Promo Code

## What's Being Done
Insert a new partner promo code "SOG" (Shades of Grey) into the `partner_promo_codes` database table. No code changes needed -- the existing partner promo flow will automatically recognize and handle this code.

## Database Change
Insert one row into `partner_promo_codes`:
- **code:** SOG
- **partner_name:** Shades of Grey
- **offer_identifier:** partner-1mo-free (reuses existing Google Play offer)
- **apple_offer_code:** SOG (you'll create this in App Store Connect)
- **free_days:** 30
- **plan_type:** annual
- **description:** 1 month free via Shades of Grey

## Manual Step (You)
Create a "SOG" Offer Code in App Store Connect, same configuration as TRYREGIMEN:
- Subscription: Annual
- Offer type: Free trial / introductory
- Duration: 1 month

## No Changes Needed
- No landing page (handled in helloregimen.com project)
- No Android setup (partner-1mo-free offer already exists)
- No code changes (existing validate-promo-code edge function handles it automatically)

