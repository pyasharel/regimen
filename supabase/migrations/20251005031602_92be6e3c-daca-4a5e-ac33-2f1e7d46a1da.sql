-- Create storage bucket for progress photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'progress-photos',
  'progress-photos',
  false,
  5242880, -- 5MB limit per photo
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
);

-- Storage RLS policies for progress photos
CREATE POLICY "Users can upload their own progress photos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'progress-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own progress photos"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'progress-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own progress photos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'progress-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own progress photos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'progress-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Update progress_entries table to ensure one entry per user per day
ALTER TABLE progress_entries
ADD CONSTRAINT unique_user_date UNIQUE (user_id, entry_date);