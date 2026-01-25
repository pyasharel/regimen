-- Add first-year tracking fields to partner_code_redemptions
ALTER TABLE public.partner_code_redemptions 
ADD COLUMN first_year_end timestamptz,
ADD COLUMN last_revenue_update timestamptz;