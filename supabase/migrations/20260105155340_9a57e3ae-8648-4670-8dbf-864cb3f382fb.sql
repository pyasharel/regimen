-- Add onboarding-related columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS path_type text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS experience_level text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pain_points text[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_weight numeric;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_weight_unit text DEFAULT 'lb';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS goal_weight numeric;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS height_feet integer;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS height_inches integer;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS height_cm numeric;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS height_unit text DEFAULT 'ft';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamp with time zone;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_permission_asked boolean DEFAULT false;

-- Grandfather existing users who have completed onboarding
UPDATE profiles 
SET onboarding_completed_at = created_at 
WHERE onboarding_completed = true 
AND onboarding_completed_at IS NULL;