/**
 * Auth Token Mirror - Persists session tokens to native storage
 * 
 * This provides a backup copy of auth tokens in Capacitor Preferences
 * (native storage) that survives webview localStorage issues, ensuring
 * users don't get kicked to sign-in during cold starts or Xcode builds.
 * 
 * Build 44: Now mirrors the FULL Supabase token blob (not just access/refresh)
 * so it can be written back byte-for-byte to localStorage before client creation.
 */

import { supabase } from '@/integrations/supabase/client';
import { persistentStorage } from './persistentStorage';
import { Capacitor } from '@capacitor/core';
import { withTimeout } from './withTimeout';
import type { Session } from '@supabase/supabase-js';

const MIRROR_KEY = 'authTokenMirror';
// The exact localStorage key Supabase uses for this project
const SUPABASE_AUTH_TOKEN_KEY = 'sb-ywxhjnwaogsxtjwulyci-auth-token';

// Timeouts for mirror operations - keep short to fail fast on iOS resume hangs
const MIRROR_LOAD_TIMEOUT_MS = 800;
const MIRROR_RESTORE_TIMEOUT_MS = 1500;

/**
 * Save the FULL Supabase auth token blob from localStorage to native storage.
 * This captures the complete object Supabase stores, so we can restore it
 * byte-for-byte and the recreated client picks it up immediately.
 */
const saveFullBlobToMirror = async (): Promise<void> => {
  try {
    const blob = localStorage.getItem(SUPABASE_AUTH_TOKEN_KEY);
    if (!blob) return;
    
    await persistentStorage.set(MIRROR_KEY, blob);
    console.log('[AuthMirror] Full token blob saved to mirror');
  } catch (error) {
    console.warn('[AuthMirror] Failed to save blob to mirror:', error);
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
 * Write the mirrored token blob back into localStorage.
 * Call this BEFORE recreateSupabaseClient() so the new client
 * immediately finds the session and auto-refreshes it.
 * 
 * Returns true if a blob was restored, false otherwise.
 */
export const writeBackToLocalStorage = async (): Promise<boolean> => {
  try {
    // Check if localStorage already has a valid token — skip if so
    const existing = localStorage.getItem(SUPABASE_AUTH_TOKEN_KEY);
    if (existing) {
      try {
        const parsed = JSON.parse(existing);
        if (parsed?.refresh_token) {
          console.log('[AuthMirror] localStorage already has token, skipping write-back');
          return false;
        }
      } catch {
        // Invalid JSON in localStorage, overwrite it
      }
    }

    // Load from native mirror with timeout
    const blob = await withTimeout(
      persistentStorage.get(MIRROR_KEY),
      MIRROR_LOAD_TIMEOUT_MS,
      'writeBackToLocalStorage'
    );

    if (!blob) {
      console.log('[AuthMirror] No mirror blob to restore');
      return false;
    }

    // Validate it has a refresh token
    try {
      const parsed = JSON.parse(blob);
      if (!parsed?.refresh_token) {
        console.log('[AuthMirror] Mirror blob invalid (no refresh_token), clearing');
        await clearMirror();
        return false;
      }
    } catch {
      console.log('[AuthMirror] Mirror blob is not valid JSON, clearing');
      await clearMirror();
      return false;
    }

    // Write the blob back to localStorage
    localStorage.setItem(SUPABASE_AUTH_TOKEN_KEY, blob);
    console.log('[AuthMirror] ✅ Token blob restored to localStorage from mirror');
    return true;
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      console.warn('[AuthMirror] writeBackToLocalStorage timed out - iOS bridge may be suspended');
    } else {
      console.warn('[AuthMirror] writeBackToLocalStorage error:', error);
    }
    return false;
  }
};

/**
 * Load mirrored session tokens (legacy, for hydration fallback)
 */
export const loadFromMirror = async (): Promise<{ access_token: string; refresh_token: string; expires_at: number; user_id: string; saved_at: number } | null> => {
  try {
    const stored = await withTimeout(
      persistentStorage.get(MIRROR_KEY),
      MIRROR_LOAD_TIMEOUT_MS,
      'loadFromMirror'
    );
    
    if (!stored) return null;
    
    const parsed = JSON.parse(stored);
    
    // Handle both old format (access_token/refresh_token) and new format (full blob)
    const accessToken = parsed.access_token;
    const refreshToken = parsed.refresh_token;
    
    if (!accessToken || !refreshToken) {
      console.log('[AuthMirror] Invalid mirror data, clearing');
      await clearMirror();
      return null;
    }
    
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: parsed.expires_at || 0,
      user_id: parsed.user?.id || parsed.user_id || '',
      saved_at: parsed.saved_at || 0,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      console.warn('[AuthMirror] loadFromMirror timed out - iOS bridge may be suspended');
    } else {
      console.warn('[AuthMirror] Failed to load from mirror:', error);
    }
    return null;
  }
};

/**
 * Check if we have any mirrored tokens
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
 */
export const restoreSessionFromMirror = async (): Promise<Session | null> => {
  const startTime = Date.now();
  
  try {
    const mirrored = await loadFromMirror();
    
    if (!mirrored?.refresh_token) {
      console.log('[AuthMirror] No mirrored tokens available');
      return null;
    }
    
    console.log('[AuthMirror] Attempting session restoration from mirror...');
    
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
      case 'INITIAL_SESSION':
        if (session) {
          // Save the full blob from localStorage (most complete representation)
          await saveFullBlobToMirror();
        }
        break;
        
      case 'SIGNED_OUT':
        await clearMirror();
        break;
    }
  });
};
