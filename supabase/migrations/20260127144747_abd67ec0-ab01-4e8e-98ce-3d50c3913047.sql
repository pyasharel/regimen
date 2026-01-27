-- Add country tracking columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country_code TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS detected_locale TEXT;

COMMENT ON COLUMN profiles.country_code IS 'Two-letter country code detected from browser locale (e.g., US, GB, CA)';
COMMENT ON COLUMN profiles.detected_locale IS 'Full browser locale string (e.g., en-US, fr-FR)';