-- Add notes field to compounds table for tracking lot numbers, vendors, etc.
ALTER TABLE public.compounds 
ADD COLUMN IF NOT EXISTS notes TEXT;