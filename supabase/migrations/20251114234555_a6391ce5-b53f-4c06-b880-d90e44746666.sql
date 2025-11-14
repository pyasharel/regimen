-- Make storage buckets private for security
-- This prevents direct URL access to sensitive photos
UPDATE storage.buckets 
SET public = false 
WHERE id IN ('progress-photos', 'avatars');