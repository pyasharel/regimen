-- Add cycle reminders column to compounds table
ALTER TABLE public.compounds 
ADD COLUMN cycle_reminders_enabled boolean DEFAULT true;