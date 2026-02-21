/**
 * useAppActive - Single source of truth for app readiness
 * 
 * The app is "ready for network" when:
 * 1. Capacitor says isActive = true (not in background)
 * 2. document.visibilityState === 'visible'
 * 
 * This prevents the race condition where JS timers fire
 * before iOS has fully resumed the WebView networking stack.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { trace } from '@/utils/bootTracer';
import { useHealthKit } from '@/hooks/useHealthKit';

interface AppActiveState {
  /** True when both Capacitor and document visibility confirm app is active */
  isAppReadyForNetwork: boolean;
  /** True after the first time isAppReadyForNetwork becomes true */
  hasBeenReady: boolean;
  /** Force a re-check of ready state */
  recheckReady: () => void;
}

// Global state that persists across hook instances
let globalIsActive = true; // Assume active until proven otherwise
let globalIsVisible = typeof document !== 'undefined' ? document.visibilityState === 'visible' : true;
let globalHasBeenReady = false;
const listeners = new Set<() => void>();

const notifyListeners = () => {
  listeners.forEach(listener => listener());
};

// Initialize Capacitor listener once at module load
let capacitorListenerInitialized = false;

const initCapacitorListener = () => {
  if (capacitorListenerInitialized || !Capacitor.isNativePlatform()) return;
  capacitorListenerInitialized = true;
  
  // Get initial state
  CapacitorApp.getState().then(({ isActive }) => {
    console.log('[AppActive] Initial Capacitor state:', isActive);
    globalIsActive = isActive;
    if (isActive && globalIsVisible) {
      globalHasBeenReady = true;
      trace('APP_ACTIVE_INITIAL_READY');
    }
    notifyListeners();
  }).catch(() => {
    // Not on native, assume active
    globalIsActive = true;
  });
  
  // Listen for state changes
  CapacitorApp.addListener('appStateChange', ({ isActive }) => {
    console.log('[AppActive] Capacitor appStateChange:', isActive);
    globalIsActive = isActive;
    if (isActive && globalIsVisible) {
      globalHasBeenReady = true;
      trace('APP_BECAME_ACTIVE_VISIBLE');
    }
    notifyListeners();
  });
};

// Initialize visibility listener once at module load
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    const isVisible = document.visibilityState === 'visible';
    console.log('[AppActive] visibilitychange:', isVisible);
    globalIsVisible = isVisible;
    if (isVisible && globalIsActive) {
      globalHasBeenReady = true;
      trace('APP_BECAME_VISIBLE_ACTIVE');
    }
    notifyListeners();
  });
}

export const useAppActive = (): AppActiveState => {
  // Force re-render when global state changes
  const [, forceUpdate] = useState({});
  const isMountedRef = useRef(true);
  
  useEffect(() => {
    initCapacitorListener();
    
    const listener = () => {
      if (isMountedRef.current) {
        forceUpdate({});
      }
    };
    
    listeners.add(listener);
    
    return () => {
      isMountedRef.current = false;
      listeners.delete(listener);
    };
  }, []);
  
  const recheckReady = useCallback(() => {
    // Force a re-evaluation (useful after client recreation)
    notifyListeners();
  }, []);
  
  const isAppReadyForNetwork = globalIsActive && globalIsVisible;
  
  // On web, always ready
  if (!Capacitor.isNativePlatform()) {
    return {
      isAppReadyForNetwork: true,
      hasBeenReady: true,
      recheckReady,
    };
  }
  
  return {
    isAppReadyForNetwork,
    hasBeenReady: globalHasBeenReady,
    recheckReady,
  };
};

/**
 * Get current app ready state synchronously (for non-hook contexts)
 */
export const getAppReadyState = (): { isActive: boolean; isVisible: boolean; isReady: boolean } => {
  return {
    isActive: globalIsActive,
    isVisible: globalIsVisible,
    isReady: globalIsActive && globalIsVisible,
  };
};

/**
 * Wait for app to become ready (Promise-based, for async flows)
 * Returns immediately if already ready, otherwise waits up to timeoutMs
 */
export const waitForAppReady = (timeoutMs: number = 5000): Promise<boolean> => {
  return new Promise((resolve) => {
    // Already ready
    if (globalIsActive && globalIsVisible) {
      resolve(true);
      return;
    }
    
    // Not on native - always ready
    if (!Capacitor.isNativePlatform()) {
      resolve(true);
      return;
    }
    
    const startTime = Date.now();
    
    const checkReady = () => {
      if (globalIsActive && globalIsVisible) {
        listeners.delete(checkReady);
        resolve(true);
        return;
      }
      
      if (Date.now() - startTime > timeoutMs) {
        listeners.delete(checkReady);
        console.warn('[AppActive] Timed out waiting for app ready');
        resolve(false);
        return;
      }
    };
    
    listeners.add(checkReady);
    
    // Also set a timeout as backup
    setTimeout(() => {
      listeners.delete(checkReady);
      resolve(globalIsActive && globalIsVisible);
    }, timeoutMs);
  });
};

// --- HealthKit foreground sync (iOS only, gated by user preference and 15‑min throttle) ---

const HEALTHKIT_ENABLED_KEY = 'healthkit_enabled';
const HEALTHKIT_LAST_SYNC_KEY = 'healthkit_lastSyncTimestamp';
const HEALTHKIT_SYNC_THROTTLE_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Syncs HealthKit data to progress_entries when the app comes to the foreground,
 * only if: iOS native, healthkit_enabled is true, and we haven't synced in the last 15 minutes.
 * Call this hook from a component that is always mounted (e.g. App / AnalyticsWrapper).
 */
export const useHealthKitForegroundSync = () => {
  const { syncToProgress } = useHealthKit();
  const wasActiveRef = useRef<boolean | null>(null);
  const listenerHandleRef = useRef<{ remove: () => Promise<void> } | null>(null);

  useEffect(() => {
    if (Capacitor.getPlatform() !== 'ios' || !Capacitor.isNativePlatform()) return;

    const handleAppStateChange = async ({ isActive }: { isActive: boolean }) => {
      const wasActive = wasActiveRef.current;
      wasActiveRef.current = isActive;

      // Run only when transitioning to foreground (not on initial mount)
      if (!isActive || wasActive === true) return;
      if (wasActive === null) {
        // First run: don't sync, just record state
        return;
      }

      if (localStorage.getItem(HEALTHKIT_ENABLED_KEY) !== 'true') return;

      const lastSyncRaw = localStorage.getItem(HEALTHKIT_LAST_SYNC_KEY);
      if (lastSyncRaw) {
        const elapsed = Date.now() - parseInt(lastSyncRaw, 10);
        if (elapsed < HEALTHKIT_SYNC_THROTTLE_MS) return;
      }

      try {
        await syncToProgress();
        localStorage.setItem(HEALTHKIT_LAST_SYNC_KEY, Date.now().toString());
      } catch (e) {
        console.warn('[AppActive] HealthKit foreground sync failed:', e);
      }
    };

    CapacitorApp.getState()
      .then((state) => {
        wasActiveRef.current = state.isActive;
        return CapacitorApp.addListener('appStateChange', handleAppStateChange);
      })
      .then((h) => {
        listenerHandleRef.current = h;
      })
      .catch(() => {});

    return () => {
      listenerHandleRef.current?.remove?.();
      listenerHandleRef.current = null;
    };
  }, [syncToProgress]);
};
