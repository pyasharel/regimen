-- Add onboarding questionnaire fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS goals text[],
ADD COLUMN IF NOT EXISTS biggest_challenge text;