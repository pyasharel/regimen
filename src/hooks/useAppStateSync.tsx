import { useEffect, useRef, useCallback } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { supabase, recreateSupabaseClient } from '@/integrations/supabase/client';
import { dataClient, recreateDataClient, abortDataClientRequests } from '@/integrations/supabase/dataClient';
import { scheduleAllUpcomingDoses, setupNotificationActionHandlers, cancelAllNotifications } from '@/utils/notificationScheduler';
import { rescheduleAllCycleReminders } from '@/utils/cycleReminderScheduler';
import { checkAndRegenerateDoses } from '@/utils/doseRegeneration';
import { runFullCleanup } from '@/utils/doseCleanup';
import { trackWeeklyEngagementSnapshot } from '@/utils/analytics';
import { processPendingActions } from '@/utils/pendingDoseActions';
import { getUserIdWithFallback } from '@/utils/safeAuth';
import { withQueryTimeout, TimeoutError } from '@/utils/withTimeout';
import { persistentStorage } from '@/utils/persistentStorage';
import { waitForAppReady, getAppReadyState } from '@/hooks/useAppActive';
import { trace } from '@/utils/bootTracer';

// Debounce time to prevent rapid-fire sync during permission dialogs
const SYNC_DEBOUNCE_MS = 2000;
// Delay before starting heavy sync work on resume (lets webview/network stabilize)
const RESUME_DELAY_MS = 1500;

/**
 * Hook to sync notifications when app comes to foreground
 * 
 * Build 25 changes:
 * - Gates all network work on app being truly active+visible
 * - Recreates BOTH auth and data clients on resume
 * - Aborts inflight requests before recreation
 * - Removes blind 3s timer; waits for app ready instead
 */
export const useAppStateSync = () => {
  const lastSyncTime = useRef(0);
  const inFlightRef = useRef(false);
  const hasRunInitialSync = useRef(false);

  const syncNotifications = useCallback(async () => {
    // Single-flight protection: prevent overlapping syncs
    if (inFlightRef.current) {
      console.log('[AppStateSync] Sync already in flight, skipping');
      return;
    }

    // Debounce: prevent rapid execution during iOS permission dialogs
    const now = Date.now();
    if (now - lastSyncTime.current < SYNC_DEBOUNCE_MS) {
      console.log('[AppStateSync] Debounced - too soon since last sync');
      return;
    }
    lastSyncTime.current = now;

    // Skip if user is in onboarding flow
    if (window.location.pathname.includes('/onboarding')) {
      return;
    }

    inFlightRef.current = true;
    const syncStartTime = Date.now();
    trace('APPSYNC_START');
    console.log('[AppStateSync] 🚀 Starting sync...');
    
    try {
      // Use cached session to avoid slow/hanging getUser calls
      const userId = await getUserIdWithFallback(3000);
      if (!userId) {
        console.log('[AppStateSync] No user ID available, skipping sync');
        return;
      }

      // Process pending notification actions first
      try {
        const pendingResult = await processPendingActions(userId);
        if (pendingResult.processed > 0) {
          console.log(`📱 Processed ${pendingResult.processed} pending notification actions`);
        }
      } catch (pendingError) {
        console.warn('[AppStateSync] Error processing pending actions:', pendingError);
      }

      // Check subscription status (with timeout)
      let isSubscribed = false;
      try {
        const { data: profile } = await withQueryTimeout(
          dataClient
            .from('profiles')
            .select('subscription_status, beta_access_end_date')
            .eq('user_id', userId)
            .maybeSingle(),
          'profile-subscription',
          5000
        );
        
        const betaAccessEndDate = profile?.beta_access_end_date ? new Date(profile.beta_access_end_date) : null;
        const hasBetaAccess = betaAccessEndDate && betaAccessEndDate > new Date();
        isSubscribed = hasBetaAccess || 
          profile?.subscription_status === 'active' || 
          profile?.subscription_status === 'trialing';
        
        console.log('📱 Subscription status for notifications:', { isSubscribed, status: profile?.subscription_status });
      } catch (profileError) {
        if (profileError instanceof TimeoutError) {
          console.warn('[AppStateSync] Profile fetch timed out, continuing with isSubscribed=false');
        } else {
          console.warn('[AppStateSync] Profile fetch error:', profileError);
        }
      }

      // Run cleanup tasks first (with timeout)
      try {
        const cleanup = await withQueryTimeout(
          runFullCleanup(userId),
          'cleanup',
          5000
        );
        if (cleanup.duplicates > 0 || cleanup.stale > 0) {
          console.log(`🧹 Cleanup complete: ${cleanup.duplicates} duplicates, ${cleanup.stale} stale doses removed`);
        }
      } catch (cleanupError) {
        if (cleanupError instanceof TimeoutError) {
          console.warn('[AppStateSync] Cleanup timed out, skipping');
        } else {
          console.warn('[AppStateSync] Cleanup error:', cleanupError);
        }
      }

      // Check and regenerate doses if needed (with timeout)
      try {
        await withQueryTimeout(
          checkAndRegenerateDoses(userId),
          'regenerateDoses',
          5000
        );
      } catch (regenError) {
        if (regenError instanceof TimeoutError) {
          console.warn('[AppStateSync] Dose regeneration timed out, skipping');
        } else {
          console.warn('[AppStateSync] Dose regeneration error:', regenError);
        }
      }

      // Check user preferences
      const doseRemindersEnabled = await persistentStorage.getBoolean('doseReminders', true);
      const cycleRemindersEnabled = await persistentStorage.getBoolean('cycleReminders', true);
      
      console.log('[AppStateSync] Preferences:', { doseRemindersEnabled, cycleRemindersEnabled });

      // Fetch and schedule dose notifications
      try {
        if (!doseRemindersEnabled) {
          console.log('[AppStateSync] Dose reminders disabled - skipping scheduling');
          await cancelAllNotifications();
        } else {
          const { data: allDoses } = await withQueryTimeout(
            dataClient
              .from('doses')
              .select('*, compounds(name, is_active, has_cycles, cycle_weeks_on, cycle_weeks_off, start_date)')
              .eq('user_id', userId)
              .eq('taken', false),
            'fetchDoses',
            5000
          );
          
          if (allDoses) {
            // Filter out doses from inactive compounds and those in off-cycle periods
            const activeDoses = allDoses.filter(dose => {
              if (dose.compounds?.is_active === false) return false;
              
              if (dose.compounds?.has_cycles && dose.compounds?.cycle_weeks_on) {
                const startDate = new Date(dose.compounds.start_date + 'T00:00:00');
                const doseDate = new Date(dose.scheduled_date + 'T00:00:00');
                const daysSinceStart = Math.floor((doseDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                
                const daysOn = dose.compounds.cycle_weeks_on;
                
                if (dose.compounds.cycle_weeks_off) {
                  const daysOff = dose.compounds.cycle_weeks_off;
                  const cycleLength = daysOn + daysOff;
                  const positionInCycle = daysSinceStart % cycleLength;
                  if (positionInCycle >= daysOn) return false;
                } else {
                  if (daysSinceStart >= daysOn) return false;
                }
              }
              
              return true;
            });
            
            const dosesWithCompoundName = activeDoses.map(dose => ({
              ...dose,
              compound_name: dose.compounds?.name || 'Medication'
            }));
            
            await scheduleAllUpcomingDoses(dosesWithCompoundName, isSubscribed);
            console.log('✅ Dose notifications synced with isPremium:', isSubscribed);
          }
        }
        
        if (cycleRemindersEnabled) {
          await rescheduleAllCycleReminders();
          console.log('✅ Cycle reminders synced');
        }
      } catch (dosesError) {
        if (dosesError instanceof TimeoutError) {
          console.warn('[AppStateSync] Doses fetch timed out');
        } else {
          console.warn('[AppStateSync] Doses fetch error:', dosesError);
        }
      }
      
      // Weekly engagement snapshot tracking
      await checkAndSendWeeklySnapshot(userId, isSubscribed ? 'active' : 'none');
      
      trace('APPSYNC_DONE', `${Date.now() - syncStartTime}ms`);
      console.log(`[AppStateSync] ⏱️ Total sync took: ${Date.now() - syncStartTime}ms`);
    } catch (error) {
      console.error('❌ Error syncing notifications:', error);
    } finally {
      inFlightRef.current = false;
    }
  }, []);
  
  // Check and send weekly engagement snapshot
  const checkAndSendWeeklySnapshot = async (userId: string, subscriptionStatus: string) => {
    try {
      const SNAPSHOT_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
      const SNAPSHOT_KEY = 'regimen_last_engagement_snapshot';
      const INSTALL_DATE_KEY = 'regimen_install_date';
      
      const lastSnapshotStr = localStorage.getItem(SNAPSHOT_KEY);
      const lastSnapshot = lastSnapshotStr ? parseInt(lastSnapshotStr, 10) : 0;
      const now = Date.now();
      
      if (now - lastSnapshot < SNAPSHOT_INTERVAL_MS) {
        return;
      }
      
      let installDateStr = localStorage.getItem(INSTALL_DATE_KEY);
      if (!installDateStr) {
        installDateStr = now.toString();
        localStorage.setItem(INSTALL_DATE_KEY, installDateStr);
      }
      const installDate = parseInt(installDateStr, 10);
      const daysSinceInstall = Math.floor((now - installDate) / (24 * 60 * 60 * 1000));
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const [compoundsResult, dosesResult, photosResult, statsResult] = await Promise.all([
        dataClient.from('compounds').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        dataClient.from('doses').select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('taken', true)
          .gte('taken_at', thirtyDaysAgo.toISOString()),
        dataClient.from('progress_entries').select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .not('photo_url', 'is', null),
        dataClient.from('user_stats').select('current_streak').eq('user_id', userId).single(),
      ]);
      
      trackWeeklyEngagementSnapshot({
        compounds_count: compoundsResult.count || 0,
        doses_last_30d: dosesResult.count || 0,
        photos_count: photosResult.count || 0,
        current_streak: statsResult.data?.current_streak || 0,
        days_since_install: daysSinceInstall,
        subscription_status: subscriptionStatus,
      });
      
      localStorage.setItem(SNAPSHOT_KEY, now.toString());
      console.log('📊 Weekly engagement snapshot sent');
    } catch (error) {
      console.error('Error sending weekly engagement snapshot:', error);
    }
  };

  /**
   * Called when app becomes active - recreates clients and schedules sync
   */
  const handleAppBecameActive = useCallback(async () => {
    trace('APP_BECAME_ACTIVE_HANDLER');
    console.log('[AppStateSync] 🔄 App became active - preparing clients...');
    
    // Step 1: Abort any stuck inflight requests
    const abortedCount = abortDataClientRequests();
    if (abortedCount > 0) {
      console.log(`[AppStateSync] Aborted ${abortedCount} stuck requests`);
    }
    
    // Step 2: Recreate BOTH clients to clear corrupted state
    recreateSupabaseClient();
    recreateDataClient();
    trace('CLIENTS_RECREATED_ON_RESUME');
    console.log('[AppStateSync] ✅ All clients recreated');
    
    // Step 3: Wait for network to stabilize, then sync
    await new Promise(resolve => setTimeout(resolve, RESUME_DELAY_MS));
    
    // Step 4: Run sync
    syncNotifications();
  }, [syncNotifications]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let isMounted = true;
    let listener: { remove: () => void } | null = null;
    
    // Listen for app state changes
    CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive && isMounted) {
        handleAppBecameActive();
      }
    }).then((handle) => {
      if (isMounted) {
        listener = handle;
      } else {
        handle.remove();
      }
    }).catch(() => {
      // Not on native platform
    });

    // Initial sync: wait for app to be truly ready, then sync
    // This replaces the old blind 3-second timer
    const runInitialSync = async () => {
      if (hasRunInitialSync.current) return;
      hasRunInitialSync.current = true;
      
      trace('INITIAL_SYNC_WAITING_FOR_READY');
      console.log('[AppStateSync] Waiting for app to be ready...');
      
      // Check if already ready
      const { isReady } = getAppReadyState();
      
      if (isReady) {
        // Already ready - just wait a small delay for stability
        trace('INITIAL_SYNC_ALREADY_READY');
        console.log('[AppStateSync] App already ready, scheduling initial sync');
        await new Promise(resolve => setTimeout(resolve, RESUME_DELAY_MS));
      } else {
        // Wait for app to become ready (max 5 seconds)
        const becameReady = await waitForAppReady(5000);
        if (!becameReady) {
          console.warn('[AppStateSync] App never became ready, running sync anyway');
        }
        trace('INITIAL_SYNC_READY_AFTER_WAIT', becameReady ? 'ready' : 'timeout');
      }
      
      if (isMounted) {
        console.log('[AppStateSync] Running initial cold-start sync');
        syncNotifications();
      }
    };

    runInitialSync();

    // Set up notification action handlers
    setupNotificationActionHandlers();

    return () => {
      isMounted = false;
      listener?.remove();
    };
  }, [handleAppBecameActive, syncNotifications]);
};
