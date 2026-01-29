// ========================================
// STARTUP PREFLIGHT - MUST RUN FIRST
// ========================================
// This validates localStorage before anything else loads.
// Prevents "poison pill" scenarios that cause black screen.
import { runStartupPreflight } from './utils/startupPreflight';

// Run preflight immediately, before any other imports execute their side effects
const preflightReport = runStartupPreflight();

// ========================================
// BOOT TIMEOUT FALLBACK
// ========================================
// If the app doesn't render within 6 seconds, show recovery UI
const BOOT_TIMEOUT_MS = 6000;

declare global {
  interface Window {
    __bootTimeoutId?: ReturnType<typeof setTimeout>;
  }
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
        background: #000;
        color: #fff;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        padding: 24px;
        text-align: center;
      ">
        <h1 style="font-size: 20px; margin-bottom: 12px;">Unable to Load</h1>
        <p style="font-size: 14px; opacity: 0.7; margin-bottom: 24px;">
          The app couldn't start properly. This usually fixes itself with a reset.
        </p>
        <button onclick="localStorage.clear(); sessionStorage.clear(); window.location.reload();" style="
          background: #8B5CF6;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 16px;
          cursor: pointer;
          margin-bottom: 12px;
        ">Reset &amp; Retry</button>
        <button onclick="window.location.reload();" style="
          background: transparent;
          color: #8B5CF6;
          border: 1px solid #8B5CF6;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 16px;
          cursor: pointer;
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
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

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
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;
if (GA_MEASUREMENT_ID) {
  initGA(GA_MEASUREMENT_ID);
}

// ========================================
// THEME BOOTSTRAP (NATIVE PLATFORMS)
// ========================================
// Read theme from Capacitor Preferences BEFORE React renders
// This prevents theme "flash" or reversion to dark mode on cold starts
const bootstrapTheme = async (): Promise<void> => {
  if (!Capacitor.isNativePlatform()) return;
  
  try {
    const [themeResult, variantResult] = await Promise.all([
      Preferences.get({ key: 'vite-ui-theme' }),
      Preferences.get({ key: 'vite-ui-theme-variant' }),
    ]);
    
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
    
    console.log('[ThemeBootstrap] Applied theme:', theme, 'variant:', variant);
  } catch (e) {
    console.warn('[ThemeBootstrap] Failed:', e);
  }
};

// Bootstrap theme, then render React app
// Use .finally() to ensure app renders even if bootstrap fails
bootstrapTheme().finally(() => {
  createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <App />
        </ThemeProvider>
      </QueryClientProvider>
    </React.StrictMode>
  );
});
