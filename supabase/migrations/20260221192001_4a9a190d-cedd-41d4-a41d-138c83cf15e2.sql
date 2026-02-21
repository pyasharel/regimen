ALTER TABLE progress_entries DROP CONSTRAINT IF EXISTS unique_user_date;
CREATE UNIQUE INDEX IF NOT EXISTS idx_progress_entries_unique_daily
  ON progress_entries (user_id, entry_date, category);