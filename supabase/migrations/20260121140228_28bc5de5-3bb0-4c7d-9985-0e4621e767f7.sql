-- Add conversion tracking fields to partner_code_redemptions
ALTER TABLE public.partner_code_redemptions 
  ADD COLUMN IF NOT EXISTS platform TEXT,
  ADD COLUMN IF NOT EXISTS converted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS first_year_revenue NUMERIC;

-- Add index for revenue reporting queries
CREATE INDEX IF NOT EXISTS idx_partner_redemptions_converted 
  ON public.partner_code_redemptions(converted_at) 
  WHERE converted_at IS NOT NULL;

-- Add index for partner code lookups
CREATE INDEX IF NOT EXISTS idx_partner_redemptions_code_user 
  ON public.partner_code_redemptions(code_id, user_id);