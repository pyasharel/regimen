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
 * Generate signed URLs for multiple files in a single API call
 * Much faster than calling getSignedUrl for each file individually
 * @param bucket - The storage bucket name
 * @param paths - Array of file paths
 * @param expiresIn - URL expiry time in seconds
 * @returns Map of path -> signedUrl for successful items
 */
export const getBatchSignedUrls = async (
  bucket: 'progress-photos' | 'avatars',
  paths: string[],
  expiresIn: number = 3600
): Promise<Map<string, string>> => {
  if (!paths || paths.length === 0) return new Map();
  
  // Filter out empty/null paths
  const validPaths = paths.filter(p => p && p.trim() !== '');
  if (validPaths.length === 0) return new Map();
  
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrls(validPaths, expiresIn);
    
    if (error) {
      console.error('[Storage] Batch signed URL error:', error);
      return new Map();
    }
    
    const urlMap = new Map<string, string>();
    data?.forEach((item, index) => {
      if (item.signedUrl) {
        urlMap.set(validPaths[index], item.signedUrl);
      }
    });
    return urlMap;
  } catch (error) {
    console.error('[Storage] Exception in batch signed URLs:', error);
    return new Map();
  }
};

/**
 * Generate signed URLs for multiple files at once (legacy - use getBatchSignedUrls for better performance)
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
