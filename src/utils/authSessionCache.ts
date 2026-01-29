/**
 * Fast, synchronous check for cached Supabase session data.
 * Supabase stores auth state in localStorage under a predictable key.
 * 
 * This enables instant navigation for users with valid cached sessions,
 * avoiding the slow async getSession() call during cold starts.
 */

// Supabase project ID from environment
const SUPABASE_PROJECT_ID = 'ywxhjnwaogsxtjwulyci';

interface CachedSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: {
    id: string;
    email?: string;
  };
}

/**
 * Reads the cached session from localStorage synchronously.
 * Returns the session if it exists and is not expired (with 5 min buffer).
 * Returns null if no valid session is cached.
 */
export const getCachedSession = (): CachedSession | null => {
  try {
    // Supabase stores auth state here
    const key = `sb-${SUPABASE_PROJECT_ID}-auth-token`;
    const cached = localStorage.getItem(key);
    
    if (!cached) {
      console.log('[AuthCache] No cached session found');
      return null;
    }
    
    const parsed = JSON.parse(cached);
    
    // Check if we have the required fields
    if (!parsed.access_token || !parsed.expires_at) {
      console.log('[AuthCache] Cached session missing required fields');
      return null;
    }
    
    // Check if token is expired (with 5 minute buffer for safety)
    const expiresAtMs = parsed.expires_at * 1000;
    const bufferMs = 5 * 60 * 1000; // 5 minutes
    const isExpired = expiresAtMs < Date.now() + bufferMs;
    
    if (isExpired) {
      console.log('[AuthCache] Cached session expired or expiring soon');
      return null;
    }
    
    console.log('[AuthCache] Valid cached session found, expires:', new Date(expiresAtMs).toISOString());
    return parsed as CachedSession;
  } catch (error) {
    console.warn('[AuthCache] Error reading cached session:', error);
    return null;
  }
};

/**
 * Checks if there's a valid cached session without returning the full data.
 * Faster for simple existence checks.
 */
export const hasCachedSession = (): boolean => {
  return getCachedSession() !== null;
};
