import { supabase } from "@/integrations/supabase/client";

/**
 * Generate a signed URL for a file in Supabase storage
 * Signed URLs provide secure, temporary access to private storage buckets
 * @param bucket - The storage bucket name
 * @param path - The file path within the bucket
 * @param expiresIn - URL expiry time in seconds (default: 1 hour)
 * @returns The signed URL or null if error
 */
export const getSignedUrl = async (
  bucket: 'progress-photos' | 'avatars',
  path: string,
  expiresIn: number = 3600 // 1 hour default
): Promise<string | null> => {
  if (!path) return null;
  
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);
    
    if (error) {
      console.error('Error creating signed URL:', error);
      return null;
    }
    
    return data.signedUrl;
  } catch (error) {
    console.error('Exception creating signed URL:', error);
    return null;
  }
};

/**
 * Generate signed URLs for multiple files at once
 * @param bucket - The storage bucket name
 * @param paths - Array of file paths
 * @param expiresIn - URL expiry time in seconds
 * @returns Array of signed URLs (null for failed items)
 */
export const getSignedUrls = async (
  bucket: 'progress-photos' | 'avatars',
  paths: string[],
  expiresIn: number = 3600
): Promise<(string | null)[]> => {
  return Promise.all(
    paths.map(path => getSignedUrl(bucket, path, expiresIn))
  );
};
