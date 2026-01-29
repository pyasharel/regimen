// ========================================
// STARTUP PREFLIGHT - MUST RUN FIRST
// ========================================
// This validates localStorage before anything else loads.
// Prevents "poison pill" scenarios that cause black screen.
import { runStartupPreflight } from './utils/startupPreflight';

// Run preflight immediately, before any other imports execute their side effects
const preflightReport = runStartupPreflight();

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

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <App />
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
