-- Drop trigger first, then function
DROP TRIGGER IF EXISTS on_dose_taken ON public.doses;
DROP TRIGGER IF EXISTS update_stats_on_dose_change ON public.doses;
DROP FUNCTION IF EXISTS public.update_user_stats_on_dose() CASCADE;

-- Create improved function that handles retroactive check-ins properly
CREATE OR REPLACE FUNCTION public.update_user_stats_on_dose()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_current_streak INTEGER := 0;
  v_longest_streak INTEGER := 0;
  v_last_check_in DATE;
  v_dates_with_doses DATE[];
  v_date DATE;
  v_streak_count INTEGER := 0;
  v_prev_date DATE;
BEGIN
  -- Only process if dose is marked as taken
  IF NEW.taken = true AND (OLD.taken IS NULL OR OLD.taken = false) THEN
    v_user_id := NEW.user_id;
    
    -- Initialize or get existing stats
    INSERT INTO public.user_stats (user_id, current_streak, longest_streak, last_check_in_date, total_doses_logged)
    VALUES (v_user_id, 0, 0, NULL, 0)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Get all unique dates where user has taken at least one dose
    SELECT ARRAY_AGG(DISTINCT scheduled_date ORDER BY scheduled_date DESC)
    INTO v_dates_with_doses
    FROM public.doses
    WHERE user_id = v_user_id AND taken = true;
    
    -- Calculate current streak from most recent date backwards
    IF array_length(v_dates_with_doses, 1) > 0 THEN
      v_last_check_in := v_dates_with_doses[1];
      v_current_streak := 1;
      
      FOR i IN 2..array_length(v_dates_with_doses, 1) LOOP
        v_date := v_dates_with_doses[i];
        v_prev_date := v_dates_with_doses[i-1];
        
        -- Check if consecutive days
        IF v_prev_date - v_date = 1 THEN
          v_current_streak := v_current_streak + 1;
        ELSE
          EXIT; -- Streak broken
        END IF;
      END LOOP;
      
      -- Calculate longest streak by checking all sequences
      v_longest_streak := v_current_streak;
      v_streak_count := 1;
      
      FOR i IN 2..array_length(v_dates_with_doses, 1) LOOP
        v_date := v_dates_with_doses[i];
        v_prev_date := v_dates_with_doses[i-1];
        
        IF v_prev_date - v_date = 1 THEN
          v_streak_count := v_streak_count + 1;
          IF v_streak_count > v_longest_streak THEN
            v_longest_streak := v_streak_count;
          END IF;
        ELSE
          v_streak_count := 1;
        END IF;
      END LOOP;
    END IF;
    
    -- Update stats
    UPDATE public.user_stats
    SET 
      current_streak = v_current_streak,
      longest_streak = v_longest_streak,
      last_check_in_date = v_last_check_in,
      total_doses_logged = (SELECT COUNT(*) FROM public.doses WHERE user_id = v_user_id AND taken = true),
      updated_at = now()
    WHERE user_id = v_user_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recreate trigger
CREATE TRIGGER on_dose_taken
  AFTER INSERT OR UPDATE ON public.doses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_stats_on_dose();