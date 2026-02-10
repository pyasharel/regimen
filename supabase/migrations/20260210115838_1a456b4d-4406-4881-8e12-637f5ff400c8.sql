
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS signup_platform text,
  ADD COLUMN IF NOT EXISTS last_platform text,
  ADD COLUMN IF NOT EXISTS last_app_version text;
