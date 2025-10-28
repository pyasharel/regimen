-- Add subscription fields to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'none' CHECK (subscription_status IN ('none', 'trialing', 'active', 'past_due', 'canceled', 'paused'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_type TEXT CHECK (subscription_type IN ('monthly', 'annual'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preview_mode_compound_added BOOLEAN DEFAULT FALSE;

-- Create index for faster subscription status lookups
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON public.profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON public.profiles(stripe_customer_id);