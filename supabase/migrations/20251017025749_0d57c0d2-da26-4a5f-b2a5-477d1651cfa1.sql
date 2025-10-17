-- Create user_stats table for tracking streaks and engagement
CREATE TABLE IF NOT EXISTS public.user_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_check_in_date DATE,
  total_doses_logged INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own stats"
  ON public.user_stats
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stats"
  ON public.user_stats
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stats"
  ON public.user_stats
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to update user stats when a dose is logged
CREATE OR REPLACE FUNCTION public.update_user_stats_on_dose()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_last_check_in DATE;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
  v_streak_broken BOOLEAN := false;
BEGIN
  -- Get user_id from the dose
  v_user_id := NEW.user_id;
  
  -- Initialize or get existing stats
  INSERT INTO public.user_stats (user_id, current_streak, longest_streak, last_check_in_date, total_doses_logged)
  VALUES (v_user_id, 0, 0, NULL, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Get current stats
  SELECT last_check_in_date, current_streak, longest_streak
  INTO v_last_check_in, v_current_streak, v_longest_streak
  FROM public.user_stats
  WHERE user_id = v_user_id;
  
  -- Only update if dose is marked as taken
  IF NEW.taken = true AND (OLD.taken IS NULL OR OLD.taken = false) THEN
    -- Check if this is a new day check-in
    IF v_last_check_in IS NULL OR NEW.scheduled_date > v_last_check_in THEN
      -- Calculate streak
      IF v_last_check_in IS NULL THEN
        v_current_streak := 1;
      ELSIF NEW.scheduled_date = v_last_check_in + INTERVAL '1 day' THEN
        v_current_streak := v_current_streak + 1;
      ELSIF NEW.scheduled_date > v_last_check_in + INTERVAL '1 day' THEN
        -- Streak broken (missed days in between)
        v_current_streak := 1;
        v_streak_broken := true;
      ELSE
        -- Retroactive check-in (same day or earlier), don't change streak
        RETURN NEW;
      END IF;
      
      -- Update longest streak if current exceeds it
      IF v_current_streak > v_longest_streak THEN
        v_longest_streak := v_current_streak;
      END IF;
      
      -- Update stats
      UPDATE public.user_stats
      SET 
        current_streak = v_current_streak,
        longest_streak = v_longest_streak,
        last_check_in_date = GREATEST(COALESCE(last_check_in_date, NEW.scheduled_date), NEW.scheduled_date),
        total_doses_logged = total_doses_logged + 1,
        updated_at = now()
      WHERE user_id = v_user_id;
    ELSE
      -- Same day or retroactive, just increment total
      UPDATE public.user_stats
      SET 
        total_doses_logged = total_doses_logged + 1,
        updated_at = now()
      WHERE user_id = v_user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on doses table
CREATE TRIGGER update_stats_on_dose_change
  AFTER INSERT OR UPDATE OF taken ON public.doses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_stats_on_dose();

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON public.user_stats(user_id);