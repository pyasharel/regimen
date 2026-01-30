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
