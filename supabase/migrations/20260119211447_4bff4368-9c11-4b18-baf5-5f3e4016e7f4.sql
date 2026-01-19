-- First create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create partner_promo_codes table for storing promotional offer codes
CREATE TABLE public.partner_promo_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  partner_name TEXT NOT NULL,
  offer_identifier TEXT NOT NULL,
  plan_type TEXT NOT NULL DEFAULT 'annual',
  free_days INTEGER NOT NULL DEFAULT 30,
  is_active BOOLEAN NOT NULL DEFAULT true,
  max_redemptions INTEGER,
  redemption_count INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create partner_code_redemptions table for tracking redemptions
CREATE TABLE public.partner_code_redemptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code_id UUID NOT NULL REFERENCES public.partner_promo_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  redeemed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  offer_applied BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB,
  UNIQUE(code_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.partner_promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_code_redemptions ENABLE ROW LEVEL SECURITY;

-- Create indexes for fast lookups
CREATE INDEX idx_partner_promo_codes_code ON public.partner_promo_codes(code);
CREATE INDEX idx_partner_code_redemptions_user_id ON public.partner_code_redemptions(user_id);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_partner_promo_codes_updated_at
BEFORE UPDATE ON public.partner_promo_codes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial partner codes
INSERT INTO public.partner_promo_codes (code, partner_name, offer_identifier, plan_type, free_days, description)
VALUES 
  ('PEPTIDEGANG', 'Peptide Gang Telegram', 'partner_1mo_free_annual', 'annual', 30, '1 month free then $39.99/year'),
  ('STACKCOMMUNITY', 'Stack Community', 'partner_1mo_free_annual', 'annual', 30, '1 month free then $39.99/year');