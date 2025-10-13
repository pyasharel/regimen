-- Add mL calculator fields to compounds table
ALTER TABLE public.compounds 
ADD COLUMN calculated_ml DECIMAL,
ADD COLUMN concentration DECIMAL;

-- Add mL calculator fields to doses table
ALTER TABLE public.doses 
ADD COLUMN calculated_ml DECIMAL,
ADD COLUMN concentration DECIMAL;