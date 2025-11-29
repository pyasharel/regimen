-- Create table to track welcome emails sent (idempotency)
CREATE TABLE IF NOT EXISTS public.welcome_emails_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL UNIQUE,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.welcome_emails_sent ENABLE ROW LEVEL SECURITY;

-- Only service role can manage this table
CREATE POLICY "Service role can manage welcome_emails_sent"
  ON public.welcome_emails_sent
  FOR ALL
  USING (auth.role() = 'service_role');