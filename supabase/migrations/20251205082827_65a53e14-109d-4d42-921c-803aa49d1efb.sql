-- Update the streak calculation trigger to count skipped doses as activity
-- (intentional skipping = engagement, shouldn't break streak)

CREATE OR REPLACE FUNCTION public.update_user_stats_on_dose()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_current_streak INTEGER := 0;
  v_longest_streak INTEGER := 0;
  v_last_check_in DATE;
  v_dates_with_activity DATE[];
  v_date DATE;
  v_streak_count INTEGER := 0;
  v_prev_date DATE;
  v_today DATE := CURRENT_DATE;
BEGIN
  -- Get user_id from either NEW or OLD record
  v_user_id := COALESCE(NEW.user_id, OLD.user_id);
  
  -- Initialize or get existing stats
  INSERT INTO public.user_stats (user_id, current_streak, longest_streak, last_check_in_date, total_doses_logged)
  VALUES (v_user_id, 0, 0, NULL, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Get all unique dates where user has taken OR skipped at least one dose
  -- (skipping is intentional activity, doesn't break streak)
  SELECT ARRAY_AGG(scheduled_date ORDER BY scheduled_date DESC)
  INTO v_dates_with_activity
  FROM (
    SELECT DISTINCT scheduled_date
    FROM public.doses
    WHERE user_id = v_user_id AND (taken = true OR skipped = true)
  ) AS distinct_dates;
  
  -- Calculate current streak from most recent date backwards
  IF array_length(v_dates_with_activity, 1) > 0 THEN
    v_last_check_in := v_dates_with_activity[1];
    
    -- Current streak only counts if most recent check-in is today or yesterday
    IF v_last_check_in >= v_today - INTERVAL '1 day' THEN
      v_current_streak := 1;
      
      -- Count consecutive days backwards from most recent
      FOR i IN 2..array_length(v_dates_with_activity, 1) LOOP
        v_date := v_dates_with_activity[i];
        v_prev_date := v_dates_with_activity[i-1];
        
        -- Check if dates are consecutive (exactly 1 day apart)
        IF v_prev_date - v_date = 1 THEN
          v_current_streak := v_current_streak + 1;
        ELSE
          EXIT; -- Streak broken, stop counting
        END IF;
      END LOOP;
    ELSE
      v_current_streak := 0; -- Last check-in was too long ago
    END IF;
    
    -- Calculate longest streak by checking all sequences
    v_longest_streak := 0;
    v_streak_count := 1;
    
    FOR i IN 1..array_length(v_dates_with_activity, 1) LOOP
      IF i = 1 THEN
        v_streak_count := 1;
      ELSE
        v_date := v_dates_with_activity[i];
        v_prev_date := v_dates_with_activity[i-1];
        
        IF v_prev_date - v_date = 1 THEN
          v_streak_count := v_streak_count + 1;
        ELSE
          v_streak_count := 1; -- Reset streak count
        END IF;
      END IF;
      
      -- Track the longest streak seen
      IF v_streak_count > v_longest_streak THEN
        v_longest_streak := v_streak_count;
      END IF;
    END LOOP;
  END IF;
  
  -- Update stats (total_doses_logged only counts taken, not skipped)
  UPDATE public.user_stats
  SET 
    current_streak = v_current_streak,
    longest_streak = v_longest_streak,
    last_check_in_date = v_last_check_in,
    total_doses_logged = (SELECT COUNT(*) FROM public.doses WHERE user_id = v_user_id AND taken = true),
    updated_at = now()
  WHERE user_id = v_user_id;
  
  RETURN NEW;
END;
$function$;