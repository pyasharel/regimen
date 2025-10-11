-- Update profiles table to store multiple challenges
ALTER TABLE public.profiles
DROP COLUMN IF EXISTS biggest_challenge,
ADD COLUMN IF NOT EXISTS challenges text[];