
-- Create password_reset_codes table for in-app code-based password reset
CREATE TABLE public.password_reset_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookup by email
CREATE INDEX idx_password_reset_codes_email ON public.password_reset_codes (email);

-- Index for cleanup of expired codes
CREATE INDEX idx_password_reset_codes_expires_at ON public.password_reset_codes (expires_at);

-- Enable RLS with NO public policies (only edge functions via service role)
ALTER TABLE public.password_reset_codes ENABLE ROW LEVEL SECURITY;

-- Block all user access
CREATE POLICY "No user access to password reset codes"
ON public.password_reset_codes
FOR ALL
USING (false);

-- Allow service role full access
CREATE POLICY "Service role can manage password_reset_codes"
ON public.password_reset_codes
FOR ALL
USING (auth.role() = 'service_role'::text);
