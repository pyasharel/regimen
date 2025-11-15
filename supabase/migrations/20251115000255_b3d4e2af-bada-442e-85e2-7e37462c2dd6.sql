-- Fix security gaps in SECURITY DEFINER functions by adding fixed search_path

-- Update cleanup_duplicate_doses function to include fixed search_path
CREATE OR REPLACE FUNCTION public.cleanup_duplicate_doses()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- Fix: Add fixed search_path to prevent privilege escalation
AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- Delete duplicate doses, keeping only the earliest created one for each unique combination
  WITH duplicates AS (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY compound_id, scheduled_date, scheduled_time 
             ORDER BY created_at ASC
           ) as rn
    FROM doses
  )
  DELETE FROM doses
  WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
  );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Ensure handle_new_user function has fixed search_path (update to latest version)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- Ensure fixed search_path is set
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'user_name'
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture'
    )
  );
  RETURN NEW;
END;
$$;