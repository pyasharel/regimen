// ========================================
// BOOT TRACER - START IMMEDIATELY
// ========================================
import { startBootTrace, trace, endBootTrace } from './utils/bootTracer';
startBootTrace();
console.log('🚀 [BUILD STAMP] build=47 bannerguard=v5 timestamp=2026-02-20');

// ========================================
// SUPABASE CLIENT RECREATION - EVERY NATIVE COLD START
// ========================================
// Import early so we can recreate the client before any auth operations
import { recreateSupabaseClient } from './integrations/supabase/client';
import { recreateDataClient } from './integrations/supabase/dataClient';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

// Build 44: Pre-hydrate localStorage from Capacitor Preferences BEFORE client creation
// Android WebView can wipe localStorage after extended idle, causing sign-outs.
// This restores the auth token blob so the recreated client finds it immediately.
const SUPABASE_AUTH_TOKEN_KEY = 'sb-ywxhjnwaogsxtjwulyci-auth-token';
const MIRROR_KEY = 'authTokenMirror';

const preHydrateAuthFromMirror = async (): Promise<void> => {
  try {
    // Skip if localStorage already has a valid token
    const existing = localStorage.getItem(SUPABASE_AUTH_TOKEN_KEY);
    if (existing) {
      try {
        const parsed = JSON.parse(existing);
        if (parsed?.refresh_token) {
          console.log('[BOOT] localStorage auth token intact, skipping mirror restore');
          return;
        }
      } catch { /* invalid JSON, overwrite */ }
    }

    // Read from native Preferences with a 600ms timeout
    const result = await Promise.race([
      Preferences.get({ key: MIRROR_KEY }),
      new Promise<{ value: null }>((resolve) => setTimeout(() => resolve({ value: null }), 600))
    ]);

    const blob = result.value;
    if (!blob) {
      console.log('[BOOT] No mirror blob available');
      return;
    }

    // Validate it has a refresh token
    try {
      const parsed = JSON.parse(blob);
      if (!parsed?.refresh_token) return;
    } catch { return; }

    localStorage.setItem(SUPABASE_AUTH_TOKEN_KEY, blob);
    console.log('[BOOT] ✅ Auth token restored from mirror to localStorage');
    trace('AUTH_MIRROR_RESTORED');
  } catch (e) {
    console.warn('[BOOT] Mirror pre-hydration failed:', e);
  }
};

// ALWAYS recreate BOTH Supabase clients on native cold start
// But FIRST restore auth tokens from mirror if localStorage was wiped
if (Capacitor.isNativePlatform()) {
  console.log('[BOOT] Native platform detected - pre-hydrating auth and recreating clients');
  // Note: We use top-level await pattern via .then() since main.tsx is a module
  // The client recreation happens synchronously after the async mirror restore
  preHydrateAuthFromMirror().finally(() => {
    recreateSupabaseClient();
    recreateDataClient();
    trace('SUPABASE_CLIENTS_RECREATED_NATIVE');
    console.log('[BOOT] ✅ All clients recreated after mirror pre-hydration');
  });
} else {
  // Web doesn't need mirror restore
  trace('SUPABASE_CLIENTS_WEB_SKIP');
}

// ========================================
// FAILED BOOT DETECTION - MUST RUN FIRST
// ========================================
// If the previous boot didn't complete, clear suspect keys that may cause hangs.
// This runs before ANY other code to break the poison-data cycle.
// IMPORTANT: We preserve the auth token to prevent unwanted sign-outs after updates.

// The auth token key we must NEVER delete - this is the user's active session
const AUTH_TOKEN_KEY = 'sb-ywxhjnwaogsxtjwulyci-auth-token';

const lastBootStatus = localStorage.getItem('REGIMEN_BOOT_STATUS');
const lastBootTime = localStorage.getItem('REGIMEN_BOOT_TIME');
const bootAge = lastBootTime ? Date.now() - parseInt(lastBootTime, 10) : Infinity;

// Only treat as failed if status is STARTING and it's been stuck for >30 seconds
// This prevents false positives from app updates or quick restarts
const isReallyFailed = lastBootStatus === 'STARTING' && bootAge > 30000;

if (isReallyFailed) {
  console.warn('[BOOT] Previous boot failed (stuck for', Math.round(bootAge / 1000), 's). Clearing suspect keys.');
  trace('FAILED_BOOT_DETECTED', `Boot stuck for ${Math.round(bootAge / 1000)}s`);
  
  // Clear keys most likely to cause boot issues
  const suspectKeys = [
    'selectedLevelsCompound',
    'medicationLevelsCollapsed',
    'cachedEntitlement',
    'pendingDoseActions',
  ];
  
  // Keys to NEVER delete — preserves notification prefs across recovery
  const preserveKeys = new Set([
    AUTH_TOKEN_KEY,
    'notificationPermissionPromptLastShownAt',
    'regimen_notification_prompt_last',
    'doseReminders',
    'cycleReminders',
  ]);
  
  suspectKeys.forEach(key => {
    try { localStorage.removeItem(key); } catch {}
  });
  
  // Clear potentially corrupted Supabase keys, but PRESERVE critical keys
  const keysToCheck = Object.keys(localStorage);
  keysToCheck.forEach(key => {
    // CRITICAL: Never delete preserved keys
    if (preserveKeys.has(key)) {
      console.log(`[BOOT] Preserving key during recovery: ${key}`);
      return;
    }
    
    // Clear other Supabase keys (code verifier, provider token, etc.)
    if (key.includes('sb-') || key.includes('supabase')) {
      try { localStorage.removeItem(key); } catch {}
    }
  });
  
  // Note: Supabase client already recreated at top of file for native platforms
  
  localStorage.setItem('REGIMEN_BOOT_STATUS', 'RECOVERED');
  trace('FAILED_BOOT_KEYS_CLEARED');
  console.log('[BOOT] Suspect keys cleared (auth preserved), status set to RECOVERED');
} else if (lastBootStatus === 'STARTING') {
  // Boot status is STARTING but not long enough to be a real failure
  // This is likely a quick restart or app update - don't clear anything
  console.log('[BOOT] Previous boot incomplete but recent (' + Math.round(bootAge / 1000) + 's) - skipping cleanup');
  trace('BOOT_STATUS_RECENT', `${Math.round(bootAge / 1000)}s ago`);
}

// Mark that we're starting boot - if this remains 'STARTING' on next launch, boot failed
localStorage.setItem('REGIMEN_BOOT_STATUS', 'STARTING');
localStorage.setItem('REGIMEN_BOOT_TIME', Date.now().toString());
trace('BOOT_STATUS_SET', 'STARTING');

// Update boot stage indicator
(window as any).updateBootStage?.('failed-boot-check-done');

// ========================================
// STARTUP PREFLIGHT
// ========================================
// This validates localStorage before anything else loads.
// Prevents "poison pill" scenarios that cause black screen.
import { runStartupPreflight } from './utils/startupPreflight';

(window as any).updateBootStage?.('preflight-start');
trace('PREFLIGHT_START');

// Run preflight immediately, before any other imports execute their side effects
const preflightReport = runStartupPreflight();
trace('PREFLIGHT_DONE', preflightReport.errors.length > 0 ? `${preflightReport.errors.length} errors` : 'clean');

(window as any).updateBootStage?.('preflight-done');

// ========================================
// BOOT TIMEOUT FALLBACK
// ========================================
// If the app doesn't render within 6s (native) or 4s (web), show recovery UI
// Native gets extra time for Android cold starts with slower JS parsing
const BOOT_TIMEOUT_MS = Capacitor.isNativePlatform() ? 6000 : 4000;

declare global {
  interface Window {
    __bootTimeoutId?: ReturnType<typeof setTimeout>;
    __bootNetworkReady?: boolean;
    updateBootStage?: (stage: string) => void;
  }
}

// ========================================
// BUILD 27: REDUCED DELAY (noOpLock handles deadlock)
// ========================================
// The noOpLock fix in Supabase clients prevents navigator.locks deadlock.
// We keep a small 500ms delay as a safety buffer for iOS networking stack.
const NATIVE_BOOT_DELAY_MS = 500;

if (Capacitor.isNativePlatform()) {
  window.__bootNetworkReady = false;
  console.log('[BOOT] Native cold start - waiting 500ms safety buffer...');
  trace('NATIVE_BOOT_DELAY_START');
  
  setTimeout(() => {
    window.__bootNetworkReady = true;
    trace('NATIVE_BOOT_DELAY_DONE');
    console.log('[BOOT] ✅ Network ready flag set after 500ms');
  }, NATIVE_BOOT_DELAY_MS);
} else {
  // Web is always ready immediately
  window.__bootNetworkReady = true;
}

window.__bootTimeoutId = setTimeout(() => {
  console.error('[BOOT] Timeout reached, showing recovery UI');
  
  // Try to hide native splash
  import('@capacitor/splash-screen').then(({ SplashScreen }) => {
    SplashScreen.hide().catch(() => {});
  }).catch(() => {});
  
  const root = document.getElementById('root');
  if (root && root.children.length === 0) {
    root.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        background: #0a0a0a;
        color: #fff;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        padding: 24px;
        text-align: center;
      ">
        <img src="/regimen-wordmark-transparent.png" alt="Regimen" style="height: 32px; width: auto; margin-bottom: 32px; opacity: 0.9;" />
        <div style="
          width: 36px; height: 36px;
          border: 3px solid rgba(139,92,246,0.25);
          border-top-color: #8B5CF6;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-bottom: 24px;
        "></div>
        <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
        <p style="font-size: 15px; opacity: 0.55; margin-bottom: 36px; max-width: 260px; line-height: 1.5;">
          Taking longer than expected…
        </p>
        <button onclick="localStorage.clear(); sessionStorage.clear(); window.location.reload();" style="
          background: #8B5CF6;
          color: white;
          border: none;
          padding: 13px 28px;
          border-radius: 10px;
          font-size: 15px;
          cursor: pointer;
          margin-bottom: 12px;
          width: 220px;
        ">Reset &amp; Retry</button>
        <button onclick="window.location.reload();" style="
          background: transparent;
          color: #8B5CF6;
          border: 1px solid rgba(139,92,246,0.5);
          padding: 13px 28px;
          border-radius: 10px;
          font-size: 15px;
          cursor: pointer;
          width: 220px;
        ">Try Again</button>
      </div>
    `;
  }
}, BOOT_TIMEOUT_MS);

// Set up global error handlers early to catch catastrophic failures
window.addEventListener('error', (event) => {
  console.error('[GlobalError]', event.error);
  try {
    localStorage.setItem('regimen_last_boot_stage', 'global_error');
    localStorage.setItem('regimen_last_error', JSON.stringify({
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      timestamp: new Date().toISOString(),
    }));
  } catch {
    // Storage might be full or inaccessible
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[UnhandledRejection]', event.reason);
  try {
    localStorage.setItem('regimen_last_boot_stage', 'unhandled_rejection');
  } catch {
    // Storage might be full or inaccessible
  }
});

// ========================================
// NORMAL APP IMPORTS
// ========================================
window.updateBootStage?.('imports-start');

import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import App from "./App.tsx";
import "./index.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { initGA } from './utils/analytics';
import { captureAttribution } from './utils/attribution';
import { setInstallDate } from './utils/featureTracking';
// Capacitor and Preferences already imported at top of file for client recreation

window.updateBootStage?.('imports-done');

// Mark that imports completed successfully
try {
  localStorage.setItem('regimen_last_boot_stage', 'imports_complete');
} catch {
  // Ignore storage errors
}

// Capture UTM attribution on app entry (before GA4 init so we can set user properties)
captureAttribution();

// Set install date for days-since-install tracking
setInstallDate();

// Initialize Google Analytics 4
// On native platforms, delay GA4 init slightly to ensure Capacitor bridge is ready
// This prevents incorrect "web" platform detection on iOS cold start
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;
if (GA_MEASUREMENT_ID) {
  if (Capacitor.isNativePlatform()) {
    // Delay GA4 init on native to ensure accurate platform detection
    // The Capacitor bridge needs time to fully initialize on cold start
    setTimeout(() => {
      initGA(GA_MEASUREMENT_ID);
      console.log('[BOOT] GA4 initialized after native bridge ready');
    }, 100);
  } else {
    initGA(GA_MEASUREMENT_ID);
  }
}

// ========================================
// THEME BOOTSTRAP (NATIVE PLATFORMS)
// ========================================
// Read theme from Capacitor Preferences BEFORE React renders
// This prevents theme "flash" or reversion to dark mode on cold starts
// Theme bootstrap with timeout to prevent blocking app startup on cold boot
// If Capacitor Preferences is slow (common on iOS cold start after theme change),
// we fall back to localStorage values to avoid delays
const THEME_BOOTSTRAP_TIMEOUT_MS = 500;

const bootstrapTheme = async (): Promise<void> => {
  if (!Capacitor.isNativePlatform()) return;
  
  try {
    // Race against timeout to prevent slow Capacitor reads from blocking boot
    const result = await Promise.race([
      Promise.all([
        Preferences.get({ key: 'vite-ui-theme' }),
        Preferences.get({ key: 'vite-ui-theme-variant' }),
      ]),
      new Promise<null>((resolve) => 
        setTimeout(() => resolve(null), THEME_BOOTSTRAP_TIMEOUT_MS)
      )
    ]);
    
    // If we got results from Capacitor Preferences
    if (result && Array.isArray(result)) {
      const [themeResult, variantResult] = result;
      const theme = themeResult.value || 'dark';
      const variant = variantResult.value || 'refined';
      
      // Sync to localStorage so ThemeProvider picks it up immediately
      try {
        localStorage.setItem('vite-ui-theme', theme);
        localStorage.setItem('vite-ui-theme-variant', variant);
      } catch {
        // Ignore storage errors
      }
      
      // Apply to document immediately (before React paints)
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
    document.documentElement.classList.remove('design-classic', 'design-refined');
    document.documentElement.classList.add(`design-${variant}`);
    
    // Mark that we've bootstrapped the theme (prevents ThemeProvider from re-reading Capacitor)
    try {
      localStorage.setItem('theme_bootstrapped_session', 'true');
    } catch { /* ignore */ }
      
      console.log('[ThemeBootstrap] Applied theme from Capacitor:', theme, 'variant:', variant);
    } else {
      // Timeout reached - use localStorage values (already set by ThemeProvider on last run)
      console.log('[ThemeBootstrap] Capacitor timed out, using localStorage fallback');
      const theme = localStorage.getItem('vite-ui-theme') || 'dark';
      const variant = localStorage.getItem('vite-ui-theme-variant') || 'refined';
      
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(theme);
      document.documentElement.classList.remove('design-classic', 'design-refined');
      document.documentElement.classList.add(`design-${variant}`);
    
    // Mark that we've bootstrapped the theme (prevents ThemeProvider from re-reading Capacitor)
    try {
      localStorage.setItem('theme_bootstrapped_session', 'true');
    } catch { /* ignore */ }
      
      console.log('[ThemeBootstrap] Applied theme from localStorage:', theme, 'variant:', variant);
    }
  } catch (e) {
    console.warn('[ThemeBootstrap] Failed:', e);
    // Apply default dark theme on error
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add('dark');
  }
};

// Bootstrap theme, then render React app
// Use .finally() to ensure app renders even if bootstrap fails
window.updateBootStage?.('theme-bootstrap-start');
trace('THEME_BOOTSTRAP_START');

bootstrapTheme().finally(() => {
  trace('THEME_BOOTSTRAP_DONE');
  window.updateBootStage?.('rendering');
  trace('REACT_RENDER_START');
  
  createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <App />
        </ThemeProvider>
      </QueryClientProvider>
    </React.StrictMode>
  );
  
  trace('REACT_RENDER_QUEUED');
  window.updateBootStage?.('rendered');
});
