/**
 * Boot Tracer - Captures timestamped diagnostic events during app startup
 * 
 * View the trace log in Settings → Help → "View Boot Trace" 
 * This helps diagnose the "empty data" bug on iOS by showing exactly where boot stalls.
 */

interface TraceEntry {
  timestamp: number;
  elapsedMs: number;
  label: string;
  details?: string;
}

const MAX_ENTRIES = 200;
const STORAGE_KEY = 'regimen_boot_trace';

let bootStartTime: number | null = null;
let traceEntries: TraceEntry[] = [];
let isTracing = false;

/**
 * Start a new boot trace. Call this at the very beginning of app mount.
 */
export const startBootTrace = (): void => {
  bootStartTime = Date.now();
  traceEntries = [];
  isTracing = true;
  
  // Load previous trace for comparison
  const previousTrace = localStorage.getItem(STORAGE_KEY);
  if (previousTrace) {
    try {
      localStorage.setItem(STORAGE_KEY + '_previous', previousTrace);
    } catch { /* ignore */ }
  }
  
  trace('BOOT_START', `Started at ${new Date(bootStartTime).toISOString()}`);
};

/**
 * Add a trace entry with automatic elapsed time calculation
 */
export const trace = (label: string, details?: string): void => {
  if (!isTracing || !bootStartTime) return;
  
  const now = Date.now();
  const entry: TraceEntry = {
    timestamp: now,
    elapsedMs: now - bootStartTime,
    label,
    details,
  };
  
  traceEntries.push(entry);
  
  // Also log to console for remote debugging
  console.log(`[TRACE +${entry.elapsedMs}ms] ${label}${details ? `: ${details}` : ''}`);
  
  // Trim if too long
  if (traceEntries.length > MAX_ENTRIES) {
    traceEntries = traceEntries.slice(-MAX_ENTRIES);
  }
  
  // Persist after each entry (so we don't lose data on crash)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      startTime: bootStartTime,
      entries: traceEntries,
      savedAt: now,
    }));
  } catch { /* ignore quota errors */ }
};

/**
 * Mark boot as complete
 */
export const endBootTrace = (success: boolean): void => {
  trace('BOOT_END', success ? 'SUCCESS' : 'FAILED');
  isTracing = false;
};

/**
 * Get the current boot trace as formatted text
 */
export const getBootTraceText = (): string => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return 'No boot trace available.';
  
  try {
    const data = JSON.parse(stored);
    const entries = data.entries as TraceEntry[];
    
    let text = `=== Boot Trace ===\n`;
    text += `Started: ${new Date(data.startTime).toISOString()}\n`;
    text += `Entries: ${entries.length}\n\n`;
    
    for (const entry of entries) {
      const ms = entry.elapsedMs.toString().padStart(6, ' ');
      text += `[+${ms}ms] ${entry.label}`;
      if (entry.details) {
        text += `: ${entry.details}`;
      }
      text += '\n';
    }
    
    // Also include previous trace if available
    const previousStored = localStorage.getItem(STORAGE_KEY + '_previous');
    if (previousStored) {
      try {
        const prevData = JSON.parse(previousStored);
        const prevEntries = prevData.entries as TraceEntry[];
        text += `\n\n=== Previous Boot Trace ===\n`;
        text += `Started: ${new Date(prevData.startTime).toISOString()}\n`;
        text += `Entries: ${prevEntries.length}\n\n`;
        for (const entry of prevEntries) {
          const ms = entry.elapsedMs.toString().padStart(6, ' ');
          text += `[+${ms}ms] ${entry.label}`;
          if (entry.details) {
            text += `: ${entry.details}`;
          }
          text += '\n';
        }
      } catch { /* ignore */ }
    }
    
    return text;
  } catch {
    return 'Error parsing boot trace.';
  }
};

/**
 * Clear boot trace data
 */
export const clearBootTrace = (): void => {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(STORAGE_KEY + '_previous');
  traceEntries = [];
};

/**
 * Check if last boot completed successfully
 */
export const didLastBootSucceed = (): boolean => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return true; // No trace = assume OK
  
  try {
    const data = JSON.parse(stored);
    const entries = data.entries as TraceEntry[];
    const lastEntry = entries[entries.length - 1];
    return lastEntry?.label === 'BOOT_END' && lastEntry?.details === 'SUCCESS';
  } catch {
    return true;
  }
};

/**
 * Get summary of last boot for quick diagnosis
 */
export const getLastBootSummary = (): string => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return 'No boot trace';
  
  try {
    const data = JSON.parse(stored);
    const entries = data.entries as TraceEntry[];
    const lastEntry = entries[entries.length - 1];
    const totalTime = lastEntry?.elapsedMs || 0;
    const success = lastEntry?.label === 'BOOT_END' && lastEntry?.details === 'SUCCESS';
    
    // Find notable events
    const hasEmptyData = entries.some(e => e.label.includes('EMPTY') || e.details?.includes('empty'));
    const hasTimeout = entries.some(e => e.label.includes('TIMEOUT') || e.details?.includes('timeout'));
    const hasAuthFail = entries.some(e => e.label.includes('AUTH_FAIL') || e.details?.includes('no session'));
    
    let summary = `Boot: ${success ? '✓' : '✗'} ${totalTime}ms`;
    if (hasEmptyData) summary += ' [EMPTY]';
    if (hasTimeout) summary += ' [TIMEOUT]';
    if (hasAuthFail) summary += ' [AUTH_FAIL]';
    
    return summary;
  } catch {
    return 'Parse error';
  }
};
