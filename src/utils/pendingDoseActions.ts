/**
 * Pending Dose Actions Queue
 * 
 * Notification actions (take-now, skip) are queued here instead of
 * immediately hitting the backend. This prevents crashes/hangs when
 * the app isn't fully initialized.
 * 
 * Actions are processed safely when the app is in the foreground
 * and the user session is confirmed.
 */

import { Preferences } from '@capacitor/preferences';
import { supabase } from '@/integrations/supabase/client';

export interface PendingDoseAction {
  id: string;
  doseId: string;
  action: 'take-now' | 'skip';
  timestamp: string;
  metadata?: {
    compoundName?: string;
    doseAmount?: number;
    doseUnit?: string;
  };
}

const PENDING_ACTIONS_KEY = 'pendingDoseActions';

/**
 * Add a pending action to the queue
 * Called from notification action handlers (synchronous-safe)
 */
export const enqueuePendingAction = async (
  doseId: string,
  action: 'take-now' | 'skip',
  metadata?: PendingDoseAction['metadata']
): Promise<void> => {
  try {
    const existing = await getPendingActions();
    
    // Avoid duplicates for the same dose
    const filtered = existing.filter(a => a.doseId !== doseId);
    
    const newAction: PendingDoseAction = {
      id: `${doseId}-${Date.now()}`,
      doseId,
      action,
      timestamp: new Date().toISOString(),
      metadata,
    };
    
    filtered.push(newAction);
    
    await Preferences.set({
      key: PENDING_ACTIONS_KEY,
      value: JSON.stringify(filtered),
    });
    
    console.log(`[PendingActions] Enqueued ${action} for dose ${doseId}`);
  } catch (error) {
    console.error('[PendingActions] Failed to enqueue action:', error);
    
    // Fallback to localStorage if Preferences fails
    try {
      const existing = localStorage.getItem(PENDING_ACTIONS_KEY);
      const actions: PendingDoseAction[] = existing ? JSON.parse(existing) : [];
      actions.push({
        id: `${doseId}-${Date.now()}`,
        doseId,
        action,
        timestamp: new Date().toISOString(),
        metadata,
      });
      localStorage.setItem(PENDING_ACTIONS_KEY, JSON.stringify(actions));
    } catch (e) {
      console.error('[PendingActions] Fallback also failed:', e);
    }
  }
};

/**
 * Get all pending actions
 */
export const getPendingActions = async (): Promise<PendingDoseAction[]> => {
  try {
    const { value } = await Preferences.get({ key: PENDING_ACTIONS_KEY });
    if (!value) return [];
    
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('[PendingActions] Failed to get actions:', error);
    
    // Fallback to localStorage
    try {
      const existing = localStorage.getItem(PENDING_ACTIONS_KEY);
      return existing ? JSON.parse(existing) : [];
    } catch {
      return [];
    }
  }
};

/**
 * Clear all pending actions
 */
export const clearPendingActions = async (): Promise<void> => {
  try {
    await Preferences.remove({ key: PENDING_ACTIONS_KEY });
    localStorage.removeItem(PENDING_ACTIONS_KEY);
  } catch (error) {
    console.error('[PendingActions] Failed to clear actions:', error);
  }
};

/**
 * Process all pending actions against the backend
 * Call this when the app is fully initialized and user is authenticated
 */
export const processPendingActions = async (userId: string): Promise<{
  processed: number;
  failed: number;
}> => {
  const result = { processed: 0, failed: 0 };
  
  try {
    const actions = await getPendingActions();
    
    if (actions.length === 0) {
      return result;
    }
    
    console.log(`[PendingActions] Processing ${actions.length} pending actions...`);
    
    for (const action of actions) {
      try {
        if (action.action === 'take-now') {
          const { error } = await supabase
            .from('doses')
            .update({ 
              taken: true, 
              taken_at: action.timestamp // Use the time when user tapped "Take Now"
            })
            .eq('id', action.doseId)
            .eq('user_id', userId);
          
          if (error) {
            console.error(`[PendingActions] Failed to mark dose taken:`, error);
            result.failed++;
          } else {
            console.log(`[PendingActions] Marked dose ${action.doseId} as taken`);
            result.processed++;
          }
        } else if (action.action === 'skip') {
          const { error } = await supabase
            .from('doses')
            .update({ skipped: true })
            .eq('id', action.doseId)
            .eq('user_id', userId);
          
          if (error) {
            console.error(`[PendingActions] Failed to mark dose skipped:`, error);
            result.failed++;
          } else {
            console.log(`[PendingActions] Marked dose ${action.doseId} as skipped`);
            result.processed++;
          }
        }
      } catch (e) {
        console.error(`[PendingActions] Error processing action:`, e);
        result.failed++;
      }
    }
    
    // Clear the queue after processing
    await clearPendingActions();
    
    console.log(`[PendingActions] Completed: ${result.processed} processed, ${result.failed} failed`);
    
  } catch (error) {
    console.error('[PendingActions] Failed to process actions:', error);
  }
  
  return result;
};
