/**
 * Safe authentication helpers that avoid slow/hanging auth calls during
 * app resume or cold starts. Uses cached session data when available.
 */

import { getCachedSession } from './authSessionCache';
import { supabase } from '@/integrations/supabase/client';
import { withTimeout } from './withTimeout';

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
