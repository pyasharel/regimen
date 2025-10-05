-- Make the progress-photos bucket public so uploads work
UPDATE storage.buckets 
SET public = true 
WHERE id = 'progress-photos';