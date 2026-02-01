/**
 * Auth Tracer - Lightweight diagnostic events for login flow
 * 
 * Similar to BootTracer but focused on auth transitions.
 * Helps diagnose "stuck on loading" issues after sign-in.
 */

interface AuthTraceEntry {
  timestamp: number;
  elapsedMs: number;
  label: string;
  details?: string;
}

const MAX_ENTRIES = 50;
const STORAGE_KEY = 'regimen_auth_trace';

let authStartTime: number | null = null;
let traceEntries: AuthTraceEntry[] = [];

/**
 * Start a new auth trace session (call on SIGNED_IN event)
 */
export const startAuthTrace = (): void => {
  authStartTime = Date.now();
  traceEntries = [];
  
  // Save previous trace for comparison
  const previousTrace = localStorage.getItem(STORAGE_KEY);
  if (previousTrace) {
    try {
      localStorage.setItem(STORAGE_KEY + '_previous', previousTrace);
    } catch { /* ignore */ }
  }
  
  authTrace('AUTH_STARTED', `Started at ${new Date(authStartTime).toISOString()}`);
};

/**
 * Add an auth trace entry
 */
export const authTrace = (label: string, details?: string): void => {
  const now = Date.now();
  const entry: AuthTraceEntry = {
    timestamp: now,
    elapsedMs: authStartTime ? now - authStartTime : 0,
    label,
    details,
  };
  
  traceEntries.push(entry);
  
  // Log to console for remote debugging
  console.log(`[AUTH +${entry.elapsedMs}ms] ${label}${details ? `: ${details}` : ''}`);
  
  // Trim if too long
  if (traceEntries.length > MAX_ENTRIES) {
    traceEntries = traceEntries.slice(-MAX_ENTRIES);
  }
  
  // Persist after each entry
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      startTime: authStartTime,
      entries: traceEntries,
      savedAt: now,
    }));
  } catch { /* ignore quota errors */ }
};

/**
 * Mark auth flow as complete
 */
export const endAuthTrace = (success: boolean, destination?: string): void => {
  authTrace('AUTH_COMPLETE', success ? `SUCCESS → ${destination || '/today'}` : 'FAILED');
};

/**
 * Get the auth trace as formatted text
 */
export const getAuthTraceText = (): string => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return 'No auth trace available.';
  
  try {
    const data = JSON.parse(stored);
    const entries = data.entries as AuthTraceEntry[];
    
    let text = `=== Auth Trace ===\n`;
    text += `Started: ${new Date(data.startTime).toISOString()}\n`;
    text += `Entries: ${entries.length}\n\n`;
    
    for (const entry of entries) {
      const ms = entry.elapsedMs.toString().padStart(5, ' ');
      text += `[+${ms}ms] ${entry.label}`;
      if (entry.details) {
        text += `: ${entry.details}`;
      }
      text += '\n';
    }
    
    return text;
  } catch {
    return 'Error parsing auth trace.';
  }
};

/**
 * Get summary of last auth flow for quick diagnosis
 */
export const getLastAuthSummary = (): string => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return 'No auth trace';
  
  try {
    const data = JSON.parse(stored);
    const entries = data.entries as AuthTraceEntry[];
    const lastEntry = entries[entries.length - 1];
    const totalTime = lastEntry?.elapsedMs || 0;
    const success = lastEntry?.label === 'AUTH_COMPLETE' && lastEntry?.details?.includes('SUCCESS');
    
    // Find notable events
    const hasTimeout = entries.some(e => e.label.includes('TIMEOUT') || e.details?.includes('timeout'));
    const hasError = entries.some(e => e.label.includes('ERROR') || e.details?.includes('error'));
    
    let summary = `Auth: ${success ? '✓' : '✗'} ${totalTime}ms`;
    if (hasTimeout) summary += ' [TIMEOUT]';
    if (hasError) summary += ' [ERROR]';
    
    return summary;
  } catch {
    return 'Parse error';
  }
};

/**
 * Clear auth trace data
 */
export const clearAuthTrace = (): void => {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(STORAGE_KEY + '_previous');
  traceEntries = [];
  authStartTime = null;
};
