-- Update RLS policies to require authentication and filter by user_id

-- Drop existing public policies
DROP POLICY IF EXISTS "Allow public access to compounds" ON compounds;
DROP POLICY IF EXISTS "Allow public access to doses" ON doses;
DROP POLICY IF EXISTS "Allow public access to progress" ON progress_entries;

-- Compounds: Users can only see and manage their own compounds
CREATE POLICY "Users can view own compounds"
ON compounds FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own compounds"
ON compounds FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own compounds"
ON compounds FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own compounds"
ON compounds FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Doses: Users can only see and manage their own doses
CREATE POLICY "Users can view own doses"
ON doses FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own doses"
ON doses FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own doses"
ON doses FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own doses"
ON doses FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Progress Entries: Users can only see and manage their own progress
CREATE POLICY "Users can view own progress"
ON progress_entries FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
ON progress_entries FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
ON progress_entries FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own progress"
ON progress_entries FOR DELETE
TO authenticated
USING (auth.uid() = user_id);