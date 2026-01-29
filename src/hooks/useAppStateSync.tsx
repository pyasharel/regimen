import { useEffect, useRef } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { scheduleAllUpcomingDoses, setupNotificationActionHandlers } from '@/utils/notificationScheduler';
import { rescheduleAllCycleReminders } from '@/utils/cycleReminderScheduler';
import { checkAndRegenerateDoses } from '@/utils/doseRegeneration';
import { runFullCleanup } from '@/utils/doseCleanup';
import { trackWeeklyEngagementSnapshot } from '@/utils/analytics';
import { processPendingActions } from '@/utils/pendingDoseActions';

// Debounce time to prevent rapid-fire sync during permission dialogs
const SYNC_DEBOUNCE_MS = 2000;

/**
 * Hook to sync notifications when app comes to foreground
 * This enables cross-platform sync - if you add medications on web,
 * opening the iPhone app will automatically schedule notifications
 */
export const useAppStateSync = () => {
  const lastSyncTime = useRef(0);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const syncNotifications = async () => {
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
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // =====================================================
        // PROCESS PENDING NOTIFICATION ACTIONS FIRST
        // These were queued by the notification action handler
        // when the app wasn't fully ready
        // =====================================================
        const pendingResult = await processPendingActions(user.id);
        if (pendingResult.processed > 0) {
          console.log(`📱 Processed ${pendingResult.processed} pending notification actions`);
        }

        // Check subscription status to enable notification actions
        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_status, beta_access_end_date')
          .eq('user_id', user.id)
          .maybeSingle();
        
        const betaAccessEndDate = profile?.beta_access_end_date ? new Date(profile.beta_access_end_date) : null;
        const hasBetaAccess = betaAccessEndDate && betaAccessEndDate > new Date();
        const isSubscribed = hasBetaAccess || 
          profile?.subscription_status === 'active' || 
          profile?.subscription_status === 'trialing';
        
        console.log('📱 Subscription status for notifications:', { isSubscribed, status: profile?.subscription_status });

        // Run cleanup tasks first (removes duplicates and stale doses)
        const cleanup = await runFullCleanup(user.id);
        if (cleanup.duplicates > 0 || cleanup.stale > 0) {
          console.log(`🧹 Cleanup complete: ${cleanup.duplicates} duplicates, ${cleanup.stale} stale doses removed`);
        }

        // Check and regenerate doses if needed
        await checkAndRegenerateDoses(user.id);

        // Fetch all upcoming doses - only from ACTIVE compounds
        const { data: allDoses } = await supabase
          .from('doses')
          .select('*, compounds(name, is_active, has_cycles, cycle_weeks_on, cycle_weeks_off, start_date)')
          .eq('user_id', user.id)
          .eq('taken', false);
        
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
          
          // Also reschedule cycle reminders
          await rescheduleAllCycleReminders();
          
          console.log('✅ Notifications synced successfully with isPremium:', isSubscribed);
        }
        
        // Weekly engagement snapshot tracking
        await checkAndSendWeeklySnapshot(user.id, profile?.subscription_status || 'none');
      } catch (error) {
        console.error('❌ Error syncing notifications:', error);
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
    let listener: any;
    CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        syncNotifications();
      }
    }).then(handle => {
      listener = handle;
    });

    // Also sync on initial mount
    syncNotifications();

    // Set up notification action handlers
    setupNotificationActionHandlers();

    return () => {
      listener?.remove();
    };
  }, []);
};
