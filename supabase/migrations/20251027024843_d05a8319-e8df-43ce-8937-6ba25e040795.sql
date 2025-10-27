-- Function to remove duplicate doses (keeping the one created first)
CREATE OR REPLACE FUNCTION cleanup_duplicate_doses()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Execute the cleanup
SELECT cleanup_duplicate_doses();