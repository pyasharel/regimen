/**
 * Auth Token Mirror - Persists session tokens to native storage
 * 
 * This provides a backup copy of auth tokens in Capacitor Preferences
 * (native storage) that survives webview localStorage issues, ensuring
 * users don't get kicked to sign-in during cold starts or Xcode builds.
 */

import { supabase } from '@/integrations/supabase/client';
import { persistentStorage } from './persistentStorage';
import { Capacitor } from '@capacitor/core';
import { withTimeout } from './withTimeout';
import type { Session } from '@supabase/supabase-js';

const MIRROR_KEY = 'authTokenMirror';

// Timeouts for mirror operations - keep short to fail fast on iOS resume hangs
// REDUCED to ensure total hydration stays under 8s watchdog budget
const MIRROR_LOAD_TIMEOUT_MS = 800;
const MIRROR_RESTORE_TIMEOUT_MS = 1500;

interface MirroredSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user_id: string;
  saved_at: number;
}

/**
 * Save session tokens to native storage
 */
const saveToMirror = async (session: Session): Promise<void> => {
  if (!session?.access_token || !session?.refresh_token) return;
  
  try {
    const mirrored: MirroredSession = {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at || 0,
      user_id: session.user?.id || '',
      saved_at: Date.now(),
    };
    
    await persistentStorage.set(MIRROR_KEY, JSON.stringify(mirrored));
    console.log('[AuthMirror] Session saved to mirror');
  } catch (error) {
    console.warn('[AuthMirror] Failed to save to mirror:', error);
  }
};

/**
 * Clear the mirrored session
 */
const clearMirror = async (): Promise<void> => {
  try {
    await persistentStorage.remove(MIRROR_KEY);
    console.log('[AuthMirror] Mirror cleared');
  } catch (error) {
    console.warn('[AuthMirror] Failed to clear mirror:', error);
  }
};

/**
 * Load mirrored session tokens (for hydration fallback)
 * Now wrapped with a timeout to prevent indefinite hangs on iOS resume
 */
export const loadFromMirror = async (): Promise<MirroredSession | null> => {
  try {
    // Wrap the native storage read with a timeout
    const stored = await withTimeout(
      persistentStorage.get(MIRROR_KEY),
      MIRROR_LOAD_TIMEOUT_MS,
      'loadFromMirror'
    );
    
    if (!stored) return null;
    
    const parsed = JSON.parse(stored) as MirroredSession;
    
    // Basic validation
    if (!parsed.access_token || !parsed.refresh_token) {
      console.log('[AuthMirror] Invalid mirror data, clearing');
      await clearMirror();
      return null;
    }
    
    return parsed;
  } catch (error) {
    // Log timeout specifically
    if (error instanceof Error && error.name === 'TimeoutError') {
      console.warn('[AuthMirror] loadFromMirror timed out - iOS bridge may be suspended');
    } else {
      console.warn('[AuthMirror] Failed to load from mirror:', error);
    }
    return null;
  }
};

/**
 * Check if we have any mirrored tokens (sync check via flag)
 * Now with timeout protection
 */
export const hasMirroredTokens = async (): Promise<boolean> => {
  try {
    const mirrored = await loadFromMirror();
    return !!mirrored?.refresh_token;
  } catch {
    return false;
  }
};

/**
 * Attempt to restore session from mirrored tokens
 * Returns the restored session or null if restoration failed
 * 
 * Now with strict timeouts on both mirror read and setSession
 * to prevent indefinite hangs on iOS resume
 */
export const restoreSessionFromMirror = async (): Promise<Session | null> => {
  const startTime = Date.now();
  
  try {
    // Step 1: Load from mirror (with timeout via loadFromMirror)
    const mirrored = await loadFromMirror();
    
    if (!mirrored?.refresh_token) {
      console.log('[AuthMirror] No mirrored tokens available');
      return null;
    }
    
    console.log('[AuthMirror] Attempting session restoration from mirror...');
    
    // Step 2: Call setSession with a timeout
    const { data, error } = await withTimeout(
      supabase.auth.setSession({
        access_token: mirrored.access_token,
        refresh_token: mirrored.refresh_token,
      }),
      MIRROR_RESTORE_TIMEOUT_MS,
      'setSession-mirror'
    );
    
    if (error) {
      console.warn('[AuthMirror] setSession failed:', error.message);
      // If refresh token is invalid, clear the mirror
      if (error.message.includes('refresh') || error.message.includes('invalid')) {
        await clearMirror();
      }
      return null;
    }
    
    if (data?.session) {
      console.log('[AuthMirror] Session restored in', Date.now() - startTime, 'ms');
      return data.session;
    }
    
    return null;
  } catch (error) {
    // Log timeout specifically
    if (error instanceof Error && error.name === 'TimeoutError') {
      console.warn('[AuthMirror] restoreSessionFromMirror timed out at', Date.now() - startTime, 'ms');
    } else {
      console.warn('[AuthMirror] Restoration error:', error);
    }
    return null;
  }
};

// Track if listener is registered
let listenerRegistered = false;

/**
 * Initialize the auth token mirror listener
 * Call this once at app startup to keep the mirror in sync
 */
export const initAuthTokenMirror = (): void => {
  if (listenerRegistered) {
    console.log('[AuthMirror] Listener already registered');
    return;
  }
  
  // Only useful on native platforms where localStorage can be unreliable
  if (!Capacitor.isNativePlatform()) {
    console.log('[AuthMirror] Skipping mirror on web platform');
    return;
  }
  
  listenerRegistered = true;
  console.log('[AuthMirror] Initializing auth token mirror listener');
  
  supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('[AuthMirror] Auth state change:', event);
    
    switch (event) {
      case 'SIGNED_IN':
      case 'TOKEN_REFRESHED':
        if (session) {
          await saveToMirror(session);
        }
        break;
        
      case 'SIGNED_OUT':
        await clearMirror();
        break;
        
      case 'INITIAL_SESSION':
        // Also save on initial session if we have one
        if (session) {
          await saveToMirror(session);
        }
        break;
    }
  });
};
