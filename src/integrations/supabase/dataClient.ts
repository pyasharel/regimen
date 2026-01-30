/**
 * Auth-Lock-Resistant Data Client
 * 
 * This Supabase client is used ONLY for database queries (not auth operations).
 * It bypasses supabase.auth.getSession() which can deadlock when the global
 * auth lock is held by another operation (e.g., getUser() during permission dialogs).
 * 
 * How it works:
 * 1. Uses the `accessToken` callback option in createClient
 * 2. Reads the access token directly from localStorage (or native mirror)
 * 3. Does NOT call any auth.* methods, so it can't be blocked by the auth lock
 * 
 * Use this for all data-fetching in boot-critical paths like:
 * - TodayScreen
 * - MyStackScreen
 * - ProgressScreen
 * - AppStateSync
 * 
 * Keep using the regular `supabase` client for:
 * - signIn / signUp / signOut
 * - onAuthStateChange listeners
 * - functions.invoke (when auth header is auto-added)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { Capacitor } from '@capacitor/core';
import { persistentStorage } from '@/utils/persistentStorage';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const SUPABASE_PROJECT_ID = 'ywxhjnwaogsxtjwulyci';
const MIRROR_KEY = 'authTokenMirror';

/**
 * Read the access token directly from localStorage.
 * This is the same cache that the regular Supabase client writes to.
 */
const getAccessTokenFromCache = (): string | null => {
  try {
    const key = `sb-${SUPABASE_PROJECT_ID}-auth-token`;
    const cached = localStorage.getItem(key);
    
    if (!cached) {
      return null;
    }
    
    const parsed = JSON.parse(cached);
    
    // Check if we have a valid access token
    if (!parsed.access_token) {
      return null;
    }
    
    // Check if token is expired (with 30 second buffer)
    if (parsed.expires_at) {
      const expiresAtMs = parsed.expires_at * 1000;
      const bufferMs = 30 * 1000;
      const isExpired = expiresAtMs < Date.now() + bufferMs;
      
      if (isExpired) {
        console.log('[DataClient] Cached token expired');
        return null;
      }
    }
    
    return parsed.access_token;
  } catch (error) {
    console.warn('[DataClient] Error reading cached token:', error);
    return null;
  }
};

/**
 * Fallback: Try to get token from native mirror (Capacitor Preferences).
 * This is a synchronous-ish check that reads from an in-memory cache if available.
 */
let mirroredTokenCache: string | null = null;
let mirrorCacheTime = 0;
const MIRROR_CACHE_TTL_MS = 5000; // Cache mirror read for 5 seconds

const getAccessTokenFromMirror = async (): Promise<string | null> => {
  // Use in-memory cache to avoid async call on every request
  if (mirroredTokenCache && Date.now() - mirrorCacheTime < MIRROR_CACHE_TTL_MS) {
    return mirroredTokenCache;
  }
  
  try {
    const stored = await persistentStorage.get(MIRROR_KEY);
    if (!stored) return null;
    
    const parsed = JSON.parse(stored);
    if (!parsed.access_token) return null;
    
    // Check expiry
    if (parsed.expires_at) {
      const expiresAtMs = parsed.expires_at * 1000;
      if (expiresAtMs < Date.now() + 30000) {
        return null;
      }
    }
    
    // Cache it
    mirroredTokenCache = parsed.access_token;
    mirrorCacheTime = Date.now();
    
    return parsed.access_token;
  } catch (error) {
    console.warn('[DataClient] Error reading mirror token:', error);
    return null;
  }
};

/**
 * Get access token for the data client.
 * Prioritizes localStorage (faster), falls back to native mirror on Capacitor.
 */
const getAccessToken = async (): Promise<string | null> => {
  // Try localStorage first (synchronous, fast)
  const cachedToken = getAccessTokenFromCache();
  if (cachedToken) {
    return cachedToken;
  }
  
  // On native platforms, try the mirror
  if (Capacitor.isNativePlatform()) {
    console.log('[DataClient] No localStorage token, trying native mirror...');
    return await getAccessTokenFromMirror();
  }
  
  return null;
};

/**
 * Create the data client with accessToken callback.
 * This client skips auth.getSession() on every request.
 */
export const dataClient: SupabaseClient<Database> = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      // Don't persist session in this client - we read tokens manually
      persistSession: false,
      // Don't auto-refresh - the main client handles that
      autoRefreshToken: false,
      // Provide the access token directly
      // This bypasses getSession() entirely
    },
    global: {
      fetch: async (url: RequestInfo | URL, options: RequestInit = {}) => {
        const token = await getAccessToken();
        
        const headers = new Headers(options.headers);
        
        if (token) {
          headers.set('Authorization', `Bearer ${token}`);
        }
        
        // Also ensure apikey header is set
        headers.set('apikey', SUPABASE_PUBLISHABLE_KEY);
        
        return fetch(url, {
          ...options,
          headers,
        });
      },
    },
  }
);

/**
 * Check if the data client has a valid token available.
 * Use this before making queries to avoid anonymous results.
 */
export const hasDataClientToken = async (): Promise<boolean> => {
  const token = await getAccessToken();
  return !!token;
};

/**
 * Clear the mirror token cache (call on sign-out)
 */
export const clearDataClientCache = (): void => {
  mirroredTokenCache = null;
  mirrorCacheTime = 0;
};
