-- Add activation tracking columns to profiles table
ALTER TABLE profiles 
ADD COLUMN first_compound_added_at TIMESTAMPTZ,
ADD COLUMN first_dose_logged_at TIMESTAMPTZ;