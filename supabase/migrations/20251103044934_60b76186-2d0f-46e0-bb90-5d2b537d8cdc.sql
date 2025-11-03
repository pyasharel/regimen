-- Add beta access tracking to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS beta_access_end_date timestamp with time zone;

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.beta_access_end_date IS 'End date for beta tester access (90 days from activation, no credit card required)';
