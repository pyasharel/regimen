

# Database Migration: Fix Progress Entries Unique Index for HealthKit

## Problem

The `progress_entries` table currently has a unique index on `(user_id, entry_date)` only. This means each user can only have ONE progress entry per day -- period. HealthKit needs to store multiple categories per day (weight, body fat, sleep, heart rate, etc.), so upserts fail.

## What Changes

1. **Drop** the existing `unique_user_date` index on `(user_id, entry_date)`
2. **Create** a new `idx_progress_entries_unique_daily` index on `(user_id, entry_date, category)`

This allows one entry per user, per day, per category -- exactly what HealthKit upserts need.

## SQL Migration

```sql
DROP INDEX IF EXISTS unique_user_date;
CREATE UNIQUE INDEX IF NOT EXISTS idx_progress_entries_unique_daily
  ON progress_entries (user_id, entry_date, category);
```

## Risk Assessment

- **Low risk**: The new index is strictly more permissive than the old one. All existing data that satisfied the old constraint will satisfy the new one.
- No code changes needed in Lovable -- this is database-only.
- The HealthKit hook in Cursor relies on this index for `ON CONFLICT (user_id, entry_date, category) DO UPDATE` upsert logic.

