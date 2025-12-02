import { useEffect } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { scheduleAllUpcomingDoses, setupNotificationActionHandlers } from '@/utils/notificationScheduler';
import { rescheduleAllCycleReminders } from '@/utils/cycleReminderScheduler';
import { checkAndRegenerateDoses } from '@/utils/doseRegeneration';
import { runFullCleanup } from '@/utils/doseCleanup';

/**
 * Hook to sync notifications when app comes to foreground
 * This enables cross-platform sync - if you add medications on web,
 * opening the iPhone app will automatically schedule notifications
 */
export const useAppStateSync = () => {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const syncNotifications = async () => {
      console.log('🔄 App resumed - syncing notifications...');
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

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

        // Fetch all upcoming doses
        const { data: allDoses } = await supabase
          .from('doses')
          .select('*, compounds(name)')
          .eq('user_id', user.id)
          .eq('taken', false);
        
        if (allDoses) {
          const dosesWithCompoundName = allDoses.map(dose => ({
            ...dose,
            compound_name: dose.compounds?.name || 'Medication'
          }));
          // Pass subscription status to enable notification actions
          await scheduleAllUpcomingDoses(dosesWithCompoundName, isSubscribed);
          
          // Also reschedule cycle reminders
          await rescheduleAllCycleReminders();
          
          console.log('✅ Notifications synced successfully with isPremium:', isSubscribed);
        }
      } catch (error) {
        console.error('❌ Error syncing notifications:', error);
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
