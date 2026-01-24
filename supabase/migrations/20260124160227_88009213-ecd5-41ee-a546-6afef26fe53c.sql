-- Add attribution columns to profiles table for cohort and conversion analysis
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS utm_source TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS utm_medium TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS utm_campaign TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS utm_content TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referrer TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS landing_page TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS attributed_at TIMESTAMPTZ;

-- Add index for common attribution queries
CREATE INDEX IF NOT EXISTS idx_profiles_utm_source ON profiles(utm_source) WHERE utm_source IS NOT NULL;