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
    
    // Check if token is expired (with 30 second buffer)
    // Trust Supabase to auto-refresh tokens that are about to expire
    const expiresAtMs = parsed.expires_at * 1000;
    const bufferMs = 30 * 1000; // 30 seconds - reduced from 5 min to allow more fast-path loads
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

/**
 * Returns cached session tokens for hydration attempts.
 * Does NOT check access_token expiry - we rely on setSession() to refresh.
 * Only returns null if there's genuinely no cached data.
 */
export const getCachedSessionForHydration = (): CachedSession | null => {
  try {
    const key = `sb-${SUPABASE_PROJECT_ID}-auth-token`;
    const cached = localStorage.getItem(key);
    
    if (!cached) {
      console.log('[AuthCache] No cached session found for hydration');
      return null;
    }
    
    const parsed = JSON.parse(cached);
    
    // Only require refresh_token - that's what setSession needs
    if (!parsed.refresh_token) {
      console.log('[AuthCache] No refresh token in cache');
      return null;
    }
    
    console.log('[AuthCache] Found cached tokens for hydration');
    return parsed as CachedSession;
  } catch (error) {
    console.warn('[AuthCache] Error reading cached session:', error);
    return null;
  }
};

/**
 * Constructs a Supabase-compatible Session object from the localStorage cache.
 * Returns null if cache is missing, invalid, or expired.
 * 
 * Use this to avoid calling supabase.auth.getSession() which can deadlock
 * when other auth calls are in progress (global auth lock contention).
 * 
 * This is the PRIMARY method for ProtectedRoute to use after Splash has
 * already validated the session via the fast-path.
 */
export const getCachedSessionAsSupabaseSession = (): {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  expires_in: number;
  token_type: string;
  user: {
    id: string;
    email?: string;
    aud: string;
    role?: string;
    app_metadata: Record<string, unknown>;
    user_metadata: Record<string, unknown>;
    created_at: string;
  };
} | null => {
  const cached = getCachedSession(); // Uses existing expiry check with 30s buffer
  
  if (!cached) {
    console.log('[AuthCache] No valid cached session for Session construction');
    return null;
  }
  
  console.log('[AuthCache] ✅ Constructing Session from cache, skipping auth calls');
  
  // Construct a Session-compatible object
  return {
    access_token: cached.access_token,
    refresh_token: cached.refresh_token,
    expires_at: cached.expires_at,
    expires_in: cached.expires_at - Math.floor(Date.now() / 1000),
    token_type: 'bearer',
    user: {
      id: cached.user.id,
      email: cached.user.email,
      aud: 'authenticated',
      role: 'authenticated',
      app_metadata: {},
      user_metadata: {},
      created_at: new Date().toISOString(), // Placeholder - not used by our app
    },
  };
};
