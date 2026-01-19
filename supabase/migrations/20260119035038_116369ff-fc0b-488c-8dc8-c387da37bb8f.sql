-- Add is_lifetime_access column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_lifetime_access boolean DEFAULT false;

-- Create lifetime_codes table for VIP codes
CREATE TABLE public.lifetime_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  redeemed_at timestamp with time zone,
  redeemed_by uuid REFERENCES public.profiles(user_id),
  notes text
);

-- Enable RLS on lifetime_codes
ALTER TABLE public.lifetime_codes ENABLE ROW LEVEL SECURITY;

-- Only service role can manage lifetime codes (for edge functions)
CREATE POLICY "Service role can manage lifetime_codes"
ON public.lifetime_codes
FOR ALL
USING (auth.role() = 'service_role');

-- Generate 50 unique VIP codes with format VIP-REGIMEN-XXXX
INSERT INTO public.lifetime_codes (code) VALUES
  ('VIP-REGIMEN-4827'),
  ('VIP-REGIMEN-9163'),
  ('VIP-REGIMEN-2058'),
  ('VIP-REGIMEN-7341'),
  ('VIP-REGIMEN-5692'),
  ('VIP-REGIMEN-8104'),
  ('VIP-REGIMEN-3576'),
  ('VIP-REGIMEN-6239'),
  ('VIP-REGIMEN-1485'),
  ('VIP-REGIMEN-9720'),
  ('VIP-REGIMEN-4063'),
  ('VIP-REGIMEN-7518'),
  ('VIP-REGIMEN-2894'),
  ('VIP-REGIMEN-6157'),
  ('VIP-REGIMEN-3042'),
  ('VIP-REGIMEN-8736'),
  ('VIP-REGIMEN-5291'),
  ('VIP-REGIMEN-1648'),
  ('VIP-REGIMEN-9305'),
  ('VIP-REGIMEN-4872'),
  ('VIP-REGIMEN-7129'),
  ('VIP-REGIMEN-2563'),
  ('VIP-REGIMEN-6984'),
  ('VIP-REGIMEN-3417'),
  ('VIP-REGIMEN-8250'),
  ('VIP-REGIMEN-5793'),
  ('VIP-REGIMEN-1026'),
  ('VIP-REGIMEN-9471'),
  ('VIP-REGIMEN-4638'),
  ('VIP-REGIMEN-7905'),
  ('VIP-REGIMEN-2179'),
  ('VIP-REGIMEN-6542'),
  ('VIP-REGIMEN-3816'),
  ('VIP-REGIMEN-8093'),
  ('VIP-REGIMEN-5367'),
  ('VIP-REGIMEN-1724'),
  ('VIP-REGIMEN-9058'),
  ('VIP-REGIMEN-4291'),
  ('VIP-REGIMEN-7684'),
  ('VIP-REGIMEN-2937'),
  ('VIP-REGIMEN-6410'),
  ('VIP-REGIMEN-3753'),
  ('VIP-REGIMEN-8526'),
  ('VIP-REGIMEN-5069'),
  ('VIP-REGIMEN-1392'),
  ('VIP-REGIMEN-9845'),
  ('VIP-REGIMEN-4178'),
  ('VIP-REGIMEN-7601'),
  ('VIP-REGIMEN-2034'),
  ('VIP-REGIMEN-6857');