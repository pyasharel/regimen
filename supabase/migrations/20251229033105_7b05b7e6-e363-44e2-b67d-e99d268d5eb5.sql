-- Add column to track when user started their current vial
ALTER TABLE public.compounds 
ADD COLUMN vial_started_at timestamp with time zone DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.compounds.vial_started_at IS 'Timestamp when user started their current vial. Used for calculating remaining doses.';