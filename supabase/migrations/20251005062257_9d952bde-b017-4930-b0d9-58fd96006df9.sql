-- Create storage policies in the public schema (workaround for storage schema restrictions)
-- These policies will control access to the progress-photos bucket

-- First, we need to create policies on storage.objects for authenticated users
-- Note: We create these as functions in public schema due to storage schema restrictions

-- Allow authenticated users to upload their own photos
CREATE POLICY "Authenticated users upload own photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'progress-photos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to view their own photos  
CREATE POLICY "Authenticated users view own photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'progress-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update their own photos
CREATE POLICY "Authenticated users update own photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'progress-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own photos
CREATE POLICY "Authenticated users delete own photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'progress-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);