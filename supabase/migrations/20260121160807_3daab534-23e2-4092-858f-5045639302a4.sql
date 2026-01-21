-- Add apple_offer_code column to partner_promo_codes table
-- This column stores the Apple Offer Code string (same as 'code' by default)
-- The redemption URL is generated dynamically using this value

ALTER TABLE public.partner_promo_codes 
ADD COLUMN IF NOT EXISTS apple_offer_code text;

-- Set default value: apple_offer_code = code (same string)
UPDATE public.partner_promo_codes 
SET apple_offer_code = code 
WHERE apple_offer_code IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.partner_promo_codes.apple_offer_code IS 'The Apple Custom Offer Code configured in App Store Connect. Used to build the redemption URL.';