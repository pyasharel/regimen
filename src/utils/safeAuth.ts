/**
 * Safe authentication helpers that avoid slow/hanging auth calls during
 * app resume or cold starts. Uses cached session data when available.
 */

import { getCachedSession, getCachedSessionForHydration } from './authSessionCache';
import { supabase } from '@/integrations/supabase/client';
import { withTimeout } from './withTimeout';
import { loadFromMirror, restoreSessionFromMirror } from './authTokenMirror';
import type { Session } from '@supabase/supabase-js';

// How long to wait for getSession before trying cache hydration
const GET_SESSION_TIMEOUT_MS = 4000;
// How long to wait for setSession during hydration
const SET_SESSION_TIMEOUT_MS = 2000;

/**
 * Synchronously returns the user ID from the cached session, if available.
 * Returns null if no valid cached session exists.
 *
 * Use this for non-critical operations where you want instant access
 * without waiting for network calls.
 */
export const getCachedUserId = (): string | null => {
  const session = getCachedSession();
  return session?.user?.id ?? null;
};

/**
 * Attempts to get a fully hydrated Supabase session.
 * 
 * Flow:
 * 1. Try supabase.auth.getSession() with timeout
 * 2. If that fails/times out, check for cached session tokens
 * 3. If we have cached tokens, call setSession to hydrate the client
 * 4. Verify hydration succeeded with a quick getSession
 * 
 * Returns a real Session object or null. Never returns a "fake" session.
 * This ensures RLS-protected queries will work correctly.
 */
export const hydrateSessionOrNull = async (
  timeoutMs: number = GET_SESSION_TIMEOUT_MS
): Promise<Session | null> => {
  const startTime = Date.now();
  
  // Step 1: Try the normal getSession path
  try {
    console.log('[SafeAuth] Attempting getSession...');
    const { data, error } = await withTimeout(
      supabase.auth.getSession(),
      timeoutMs,
      'getSession'
    );
    
    if (data?.session) {
      console.log('[SafeAuth] getSession succeeded in', Date.now() - startTime, 'ms');
      return data.session;
    }
    
    if (error) {
      console.warn('[SafeAuth] getSession returned error:', error.message);
    }
  } catch (e) {
    console.warn('[SafeAuth] getSession timed out or failed:', e);
  }
  
  // Step 2: Try to hydrate from cached tokens (doesn't check expiry - relies on refresh)
  console.log('[SafeAuth] Falling back to cache hydration...');
  const cached = getCachedSessionForHydration();
  
  if (cached?.refresh_token) {
    // Step 3: Call setSession to hydrate the Supabase client
    try {
      console.log('[SafeAuth] Calling setSession with cached tokens...');
      const { data: setData, error: setError } = await withTimeout(
        supabase.auth.setSession({
          access_token: cached.access_token,
          refresh_token: cached.refresh_token,
        }),
        SET_SESSION_TIMEOUT_MS,
        'setSession'
      );
      
      if (!setError && setData?.session) {
        console.log('[SafeAuth] Cache hydration succeeded in', Date.now() - startTime, 'ms');
        return setData.session;
      }
      
      if (setError) {
        console.warn('[SafeAuth] setSession failed:', setError.message);
      }
    } catch (e) {
      console.warn('[SafeAuth] setSession timed out:', e);
    }
  }
  
  // Step 4: Try native mirror restoration (Capacitor Preferences fallback)
  console.log('[SafeAuth] Trying native token mirror...');
  try {
    const mirroredSession = await restoreSessionFromMirror();
    if (mirroredSession) {
      console.log('[SafeAuth] Mirror restoration succeeded in', Date.now() - startTime, 'ms');
      return mirroredSession;
    }
  } catch (e) {
    console.warn('[SafeAuth] Mirror restoration failed:', e);
  }
  
  // Step 5: Final verification - one more quick getSession attempt
  try {
    console.log('[SafeAuth] Final verification getSession...');
    const { data } = await withTimeout(
      supabase.auth.getSession(),
      1500,
      'getSession-verify'
    );
    
    if (data?.session) {
      console.log('[SafeAuth] Verification succeeded, total time:', Date.now() - startTime, 'ms');
      return data.session;
    }
  } catch (e) {
    console.warn('[SafeAuth] Verification getSession failed:', e);
  }
  
  console.log('[SafeAuth] All hydration attempts failed, returning null');
  return null;
};

/**
 * Check if we have any auth tokens available (localStorage OR native mirror)
 * This is used to distinguish "no tokens anywhere" from "hydration failed"
 */
export const hasAnyAuthTokens = async (): Promise<boolean> => {
  // Check localStorage first
  const cached = getCachedSessionForHydration();
  if (cached?.refresh_token) {
    return true;
  }
  
  // Check native mirror
  const mirrored = await loadFromMirror();
  return !!mirrored?.refresh_token;
};

/**
 * Returns the user ID, trying cached session first, then falling back
 * to an async Supabase call with a timeout.
 *
 * This is the safest way to get a user ID during app resume when
 * network conditions might be unstable.
 *
 * @param timeoutMs - Maximum time to wait for auth call (default 3000ms)
 */
export const getUserIdWithFallback = async (
  timeoutMs: number = 3000
): Promise<string | null> => {
  // Try cached session first (synchronous, instant)
  const cachedUserId = getCachedUserId();
  if (cachedUserId) {
    console.log('[SafeAuth] Using cached user ID:', cachedUserId.slice(0, 8) + '...');
    return cachedUserId;
  }

  // Fall back to async call with timeout
  try {
    console.log('[SafeAuth] No cached session, fetching from Supabase...');
    const { data } = await withTimeout(
      supabase.auth.getUser(),
      timeoutMs,
      'getUser'
    );
    return data?.user?.id ?? null;
  } catch (error) {
    console.warn('[SafeAuth] Failed to get user ID:', error);
    return null;
  }
};

/**
 * Ensures the Supabase client has a hydrated session before proceeding.
 * 
 * Use this at the start of data-loading functions to guarantee that
 * RLS-protected queries will return the correct data (not empty arrays).
 * 
 * Returns the userId if session is ready, null otherwise.
 */
export const ensureAuthReady = async (): Promise<string | null> => {
  const session = await hydrateSessionOrNull();
  return session?.user?.id ?? null;
};
