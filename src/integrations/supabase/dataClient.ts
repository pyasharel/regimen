/**
 * Auth-Lock-Resistant Data Client (v2 - with abort + recreation support)
 * 
 * This Supabase client is used ONLY for database queries (not auth operations).
 * It bypasses supabase.auth.getSession() which can deadlock when the global
 * auth lock is held by another operation.
 * 
 * Key features in v2:
 * 1. Abortable fetch - all requests can be cancelled on app resume
 * 2. Proxy pattern - allows client recreation without breaking imports
 * 3. Token caching - reads tokens from localStorage/native mirror
 * 
 * Use this for all data-fetching in boot-critical paths.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { Capacitor } from '@capacitor/core';
import { persistentStorage } from '@/utils/persistentStorage';
import { createAbortableFetch } from '@/utils/abortableFetch';
import { trace } from '@/utils/bootTracer';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const SUPABASE_PROJECT_ID = 'ywxhjnwaogsxtjwulyci';
const MIRROR_KEY = 'authTokenMirror';

// Default timeout for data queries (8 seconds)
const DATA_QUERY_TIMEOUT_MS = 8000;

// Create abortable fetch instance for this client
const abortableFetchInstance = createAbortableFetch({
  defaultTimeoutMs: DATA_QUERY_TIMEOUT_MS,
  tag: 'DataClient',
});

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
 */
let mirroredTokenCache: string | null = null;
let mirrorCacheTime = 0;
const MIRROR_CACHE_TTL_MS = 5000;

const getAccessTokenFromMirror = async (): Promise<string | null> => {
  if (mirroredTokenCache && Date.now() - mirrorCacheTime < MIRROR_CACHE_TTL_MS) {
    return mirroredTokenCache;
  }
  
  try {
    const stored = await persistentStorage.get(MIRROR_KEY);
    if (!stored) return null;
    
    const parsed = JSON.parse(stored);
    if (!parsed.access_token) return null;
    
    if (parsed.expires_at) {
      const expiresAtMs = parsed.expires_at * 1000;
      if (expiresAtMs < Date.now() + 30000) {
        return null;
      }
    }
    
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
 */
const getAccessToken = async (): Promise<string | null> => {
  const cachedToken = getAccessTokenFromCache();
  if (cachedToken) {
    return cachedToken;
  }
  
  if (Capacitor.isNativePlatform()) {
    console.log('[DataClient] No localStorage token, trying native mirror...');
    return await getAccessTokenFromMirror();
  }
  
  return null;
};

/**
 * Create a fresh data client instance with abortable fetch.
 */
const createDataClientInstance = (): SupabaseClient<Database> => {
  return createClient<Database>(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        fetch: async (url: RequestInfo | URL, options: RequestInit = {}) => {
          const token = await getAccessToken();
          
          const headers = new Headers(options.headers);
          
          if (token) {
            headers.set('Authorization', `Bearer ${token}`);
          }
          
          headers.set('apikey', SUPABASE_PUBLISHABLE_KEY);
          
          // Use abortable fetch to allow cancellation
          return abortableFetchInstance.fetch(url, {
            ...options,
            headers,
          });
        },
      },
    }
  );
};

// Mutable instance - can be recreated on app resume
let dataClientInstance = createDataClientInstance();

/**
 * Recreate the data client with a fresh instance.
 * Also aborts all inflight requests from the previous instance.
 */
export const recreateDataClient = (): SupabaseClient<Database> => {
  const abortedCount = abortableFetchInstance.abortAll();
  trace('DATA_CLIENT_RECREATED', `aborted ${abortedCount} requests`);
  console.log('[DataClient] Recreating client instance (aborted', abortedCount, 'inflight requests)');
  
  dataClientInstance = createDataClientInstance();
  return dataClientInstance;
};

/**
 * Abort all inflight data client requests.
 * Call this before recreation or during recovery.
 */
export const abortDataClientRequests = (): number => {
  return abortableFetchInstance.abortAll();
};

/**
 * Proxy that forwards all property access to the current instance.
 * This allows the underlying client to be swapped without breaking imports.
 */
export const dataClient: SupabaseClient<Database> = new Proxy({} as SupabaseClient<Database>, {
  get: (_, prop: keyof SupabaseClient<Database>) => {
    return (dataClientInstance as any)[prop];
  },
});

/**
 * Check if the data client has a valid token available.
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

/**
 * Get count of active inflight requests
 */
export const getDataClientActiveRequestCount = (): number => {
  return abortableFetchInstance.getActiveCount();
};
