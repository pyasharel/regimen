import { useEffect, useRef } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { scheduleAllUpcomingDoses, setupNotificationActionHandlers, cancelAllNotifications } from '@/utils/notificationScheduler';
import { rescheduleAllCycleReminders } from '@/utils/cycleReminderScheduler';
import { checkAndRegenerateDoses } from '@/utils/doseRegeneration';
import { runFullCleanup } from '@/utils/doseCleanup';
import { trackWeeklyEngagementSnapshot } from '@/utils/analytics';
import { processPendingActions } from '@/utils/pendingDoseActions';
import { getUserIdWithFallback } from '@/utils/safeAuth';
import { withQueryTimeout, TimeoutError } from '@/utils/withTimeout';
import { persistentStorage } from '@/utils/persistentStorage';

// Debounce time to prevent rapid-fire sync during permission dialogs
const SYNC_DEBOUNCE_MS = 2000;
// Delay before starting heavy sync work on resume (lets webview/network stabilize)
// Increased to 1500ms to allow auth, theme, and subscription systems to settle first
const RESUME_DELAY_MS = 1500;
// Timeout for the entire sync operation
const SYNC_TIMEOUT_MS = 15000;

/**
 * Hook to sync notifications when app comes to foreground
 * This enables cross-platform sync - if you add medications on web,
 * opening the iPhone app will automatically schedule notifications
 */
export const useAppStateSync = () => {
  const lastSyncTime = useRef(0);
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const syncNotifications = async () => {
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

      // Skip if user is in onboarding flow - permissions will be asked at the right time
      if (window.location.pathname.includes('/onboarding')) {
        return;
      }

      inFlightRef.current = true;
      const syncStartTime = Date.now();
      console.log('[AppStateSync] 🚀 Starting sync...');
      
      try {
        // Use cached session to avoid slow/hanging getUser calls
        const userId = await getUserIdWithFallback(3000);
        if (!userId) {
          console.log('[AppStateSync] No user ID available, skipping sync');
          return;
        }

        // =====================================================
        // PROCESS PENDING NOTIFICATION ACTIONS FIRST
        // These were queued by the notification action handler
        // when the app wasn't fully ready
        // =====================================================
        try {
          const pendingResult = await processPendingActions(userId);
          if (pendingResult.processed > 0) {
            console.log(`📱 Processed ${pendingResult.processed} pending notification actions`);
          }
        } catch (pendingError) {
          console.warn('[AppStateSync] Error processing pending actions:', pendingError);
        }

        // Check subscription status to enable notification actions (with timeout)
        let isSubscribed = false;
        try {
          const { data: profile } = await withQueryTimeout(
            supabase
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

        // Run cleanup tasks first (removes duplicates and stale doses) - with timeout
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

        // Check if user has dose reminders enabled before scheduling
        const doseRemindersEnabled = await persistentStorage.getBoolean('doseReminders', true);
        const cycleRemindersEnabled = await persistentStorage.getBoolean('cycleReminders', true);
        
        console.log('[AppStateSync] Preferences:', { doseRemindersEnabled, cycleRemindersEnabled });

        // Fetch all upcoming doses - only from ACTIVE compounds (with timeout)
        try {
          // If dose reminders are disabled, cancel all and skip scheduling
          if (!doseRemindersEnabled) {
            console.log('[AppStateSync] Dose reminders disabled - skipping scheduling');
            await cancelAllNotifications();
          } else {
            const { data: allDoses } = await withQueryTimeout(
              supabase
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
              // Skip if compound is inactive
              if (dose.compounds?.is_active === false) return false;
              
              // Check if in off-cycle period
              if (dose.compounds?.has_cycles && dose.compounds?.cycle_weeks_on) {
                const startDate = new Date(dose.compounds.start_date + 'T00:00:00');
                const doseDate = new Date(dose.scheduled_date + 'T00:00:00');
                const daysSinceStart = Math.floor((doseDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                
                // Values are stored as DAYS in the database
                const daysOn = dose.compounds.cycle_weeks_on;
                
                if (dose.compounds.cycle_weeks_off) {
                  // Continuous cycling
                  const daysOff = dose.compounds.cycle_weeks_off;
                  const cycleLength = daysOn + daysOff;
                  const positionInCycle = daysSinceStart % cycleLength;
                  
                  // If in off period, skip this dose
                  if (positionInCycle >= daysOn) return false;
                } else {
                  // One-time cycle - after on period, skip
                  if (daysSinceStart >= daysOn) return false;
                }
              }
              
              return true;
            });
            
            const dosesWithCompoundName = activeDoses.map(dose => ({
              ...dose,
              compound_name: dose.compounds?.name || 'Medication'
            }));
              // Pass subscription status to enable notification actions
              await scheduleAllUpcomingDoses(dosesWithCompoundName, isSubscribed);
              
              console.log('✅ Dose notifications synced with isPremium:', isSubscribed);
            }
          }
          
          // Reschedule cycle reminders only if enabled
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
        
        // Weekly engagement snapshot tracking (non-critical, no timeout needed)
        await checkAndSendWeeklySnapshot(userId, isSubscribed ? 'active' : 'none');
        
        console.log(`[AppStateSync] ⏱️ Total sync took: ${Date.now() - syncStartTime}ms`);
      } catch (error) {
        console.error('❌ Error syncing notifications:', error);
      } finally {
        inFlightRef.current = false;
      }
    };
    
    // Check and send weekly engagement snapshot
    const checkAndSendWeeklySnapshot = async (userId: string, subscriptionStatus: string) => {
      try {
        const SNAPSHOT_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
        const SNAPSHOT_KEY = 'regimen_last_engagement_snapshot';
        const INSTALL_DATE_KEY = 'regimen_install_date';
        
        const lastSnapshotStr = localStorage.getItem(SNAPSHOT_KEY);
        const lastSnapshot = lastSnapshotStr ? parseInt(lastSnapshotStr, 10) : 0;
        const now = Date.now();
        
        // Only send snapshot if 7+ days since last one
        if (now - lastSnapshot < SNAPSHOT_INTERVAL_MS) {
          return;
        }
        
        // Get install date or set it
        let installDateStr = localStorage.getItem(INSTALL_DATE_KEY);
        if (!installDateStr) {
          installDateStr = now.toString();
          localStorage.setItem(INSTALL_DATE_KEY, installDateStr);
        }
        const installDate = parseInt(installDateStr, 10);
        const daysSinceInstall = Math.floor((now - installDate) / (24 * 60 * 60 * 1000));
        
        // Fetch engagement metrics
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const [compoundsResult, dosesResult, photosResult, statsResult] = await Promise.all([
          supabase.from('compounds').select('id', { count: 'exact', head: true }).eq('user_id', userId),
          supabase.from('doses').select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('taken', true)
            .gte('taken_at', thirtyDaysAgo.toISOString()),
          supabase.from('progress_entries').select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .not('photo_url', 'is', null),
          supabase.from('user_stats').select('current_streak').eq('user_id', userId).single(),
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

    // Sync when app comes to foreground
    let isMounted = true;
    let listener: { remove: () => void } | null = null;
    
    CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive && isMounted) {
        // Delay heavy sync slightly on resume to let webview/network stabilize
        setTimeout(() => {
          if (isMounted) {
            syncNotifications();
          }
        }, RESUME_DELAY_MS);
      }
    }).then((handle) => {
      if (isMounted) {
        listener = handle;
      } else {
        // Already unmounted, clean up immediately
        handle.remove();
      }
    }).catch(() => {
      // Not on native platform, ignore
    });

    // Run initial sync after a longer delay to ensure auth is fully hydrated
    // This was previously removed but is needed to schedule notifications on cold start
    // The 3-second delay ensures ProtectedRoute has finished hydrating the session
    const initialSyncTimer = setTimeout(() => {
      if (isMounted) {
        console.log('[AppStateSync] Running initial cold-start sync');
        syncNotifications();
      }
    }, 3000);

    // Set up notification action handlers
    setupNotificationActionHandlers();

    return () => {
      isMounted = false;
      listener?.remove();
      clearTimeout(initialSyncTimer);
    };
  }, []);
};
