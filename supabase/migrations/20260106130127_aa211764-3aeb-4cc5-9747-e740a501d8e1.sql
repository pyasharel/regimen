-- Add interval_days column to compounds table for storing the "Every X days" interval value
ALTER TABLE public.compounds ADD COLUMN IF NOT EXISTS interval_days INTEGER;