import { LocalNotifications } from '@capacitor/local-notifications';
import { supabase } from "@/integrations/supabase/client";

export type EngagementNotificationType = 
  | 'first_dose'
  | 'streak_3'
  | 'streak_7'
  | 'streak_14'
  | 'streak_30'
  | 'missed_dose'
  | 'weekly_checkin'
  | 'reengage'
  | 'photo_reminder'
  | 'all_done'
  | 'first_week';

// Fixed notification IDs for each type to prevent duplicates
const ENGAGEMENT_NOTIFICATION_IDS: Record<EngagementNotificationType, number> = {
  first_dose: 90001,
  streak_3: 90003,
  streak_7: 90007,
  streak_14: 90014,
  streak_30: 90031,
  missed_dose: 90010,
  weekly_checkin: 90020,
  reengage: 90030,
  photo_reminder: 90040,
  all_done: 90050,
  first_week: 90060,
};

// LocalStorage keys for throttling
const THROTTLE_KEYS: Record<EngagementNotificationType, string> = {
  first_dose: 'regimen_notif_first_dose',
  streak_3: 'regimen_notif_streak_3',
  streak_7: 'regimen_notif_streak_7',
  streak_14: 'regimen_notif_streak_14',
  streak_30: 'regimen_notif_streak_30',
  missed_dose: 'regimen_notif_missed_dose',
  weekly_checkin: 'regimen_notif_weekly_checkin',
  reengage: 'regimen_notif_reengage',
  photo_reminder: 'regimen_notif_photo_reminder',
  all_done: 'regimen_notif_all_done',
  first_week: 'regimen_notif_first_week',
};

// How often each notification type can be sent (in days)
const THROTTLE_DAYS: Record<EngagementNotificationType, number> = {
  first_dose: 9999, // Only once ever
  streak_3: 30,     // Once per month (streak resets)
  streak_7: 30,     // Once per month
  streak_14: 60,    // Once every 2 months
  streak_30: 90,    // Once every 3 months
  missed_dose: 3,   // Every 3 days max
  weekly_checkin: 7, // Once per week
  reengage: 3,       // Every 3 days max
  photo_reminder: 7, // Once per week
  all_done: 1,       // Once per day
  first_week: 9999,  // Only once ever
};

const ENGAGEMENT_NOTIFICATIONS: Record<EngagementNotificationType, { title: string; body: string }> = {
  first_dose: {
    title: "✅ Great start!",
    body: "You've logged your first dose. You're on your way to transformation!",
  },
  streak_3: {
    title: "🔥 3-Day Streak!",
    body: "You're building momentum! Three days of consistency.",
  },
  streak_7: {
    title: "🎯 One Week Strong!",
    body: "Seven days of dedication! You're unstoppable.",
  },
  streak_14: {
    title: "💪 Two Weeks Strong!",
    body: "14 days of consistency — you're building a real habit!",
  },
  streak_30: {
    title: "🏆 30 Days! Champion Status!",
    body: "One month of dedication. You're in the top tier.",
  },
  missed_dose: {
    title: "💪 Quick check-in?",
    body: "You have unchecked doses from earlier today.",
  },
  weekly_checkin: {
    title: "📊 Weekly Check-in",
    body: "Another week in the books! Keep up the great work.",
  },
  reengage: {
    title: "🌟 Ready to continue?",
    body: "Your transformation journey awaits. Log your doses today!",
  },
  photo_reminder: {
    title: "📸 Track your transformation!",
    body: "A quick progress photo helps you see how far you've come.",
  },
  all_done: {
    title: "🎉 All doses complete!",
    body: "Everything checked off for today. Consistency builds results.",
  },
  first_week: {
    title: "🎂 One Week Anniversary!",
    body: "It's been one week since you started. Great commitment!",
  },
};

/**
 * Check if a notification type is throttled (recently sent)
 */
const isThrottled = (type: EngagementNotificationType): boolean => {
  const key = THROTTLE_KEYS[type];
  const lastSent = localStorage.getItem(key);
  
  if (!lastSent) return false;
  
  const lastSentDate = new Date(lastSent);
  const now = new Date();
  const daysSince = Math.floor((now.getTime() - lastSentDate.getTime()) / (1000 * 60 * 60 * 24));
  
  return daysSince < THROTTLE_DAYS[type];
};

/**
 * Mark a notification type as sent (for throttling)
 */
const markAsSent = (type: EngagementNotificationType): void => {
  const key = THROTTLE_KEYS[type];
  localStorage.setItem(key, new Date().toISOString());
};

/**
 * Schedule an engagement notification with deduplication
 */
export const scheduleEngagementNotification = async (
  type: EngagementNotificationType,
  scheduledTime: Date
): Promise<void> => {
  try {
    // Check throttle
    if (isThrottled(type)) {
      console.log(`Skipping ${type} notification - throttled`);
      return;
    }
    
    const notification = ENGAGEMENT_NOTIFICATIONS[type];
    const notificationId = ENGAGEMENT_NOTIFICATION_IDS[type];
    
    // Cancel any existing notification with the same ID first
    try {
      await LocalNotifications.cancel({ notifications: [{ id: notificationId }] });
    } catch (e) {
      // Ignore errors from canceling non-existent notifications
    }
    
    await LocalNotifications.schedule({
      notifications: [
        {
          id: notificationId,
          title: notification.title,
          body: notification.body,
          schedule: { at: scheduledTime },
          extra: {
            type: 'engagement',
            subType: type,
          },
        },
      ],
    });
    
    // Mark as sent for throttling
    markAsSent(type);

    console.log(`Scheduled ${type} engagement notification for ${scheduledTime}`);
  } catch (error) {
    console.error(`Failed to schedule ${type} engagement notification:`, error);
  }
};

/**
 * Cancel the missed dose notification (ID 90010)
 * Call this when all scheduled doses for the day are marked as taken.
 */
export const cancelMissedDoseNotification = async (): Promise<void> => {
  try {
    await LocalNotifications.cancel({ 
      notifications: [{ id: ENGAGEMENT_NOTIFICATION_IDS.missed_dose }] 
    });
    console.log('Cancelled missed_dose notification');
  } catch (error) {
    console.error('Failed to cancel missed_dose notification:', error);
  }
};

/**
 * Schedule the "all done" celebration notification 30 minutes from now
 */
export const scheduleAllDoneCelebration = async (): Promise<void> => {
  try {
    const scheduledTime = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now
    await scheduleEngagementNotification('all_done', scheduledTime);
  } catch (error) {
    console.error('Failed to schedule all_done celebration:', error);
  }
};

/**
 * Reschedule re-engagement notification 3 days from now.
 * Call this each time the user logs a dose to keep pushing it forward.
 */
export const rescheduleReengagement = async (): Promise<void> => {
  try {
    const notificationId = ENGAGEMENT_NOTIFICATION_IDS.reengage;
    
    // Cancel any existing re-engagement notification
    try {
      await LocalNotifications.cancel({ notifications: [{ id: notificationId }] });
    } catch (e) { /* ignore */ }
    
    // Schedule 3 days from now at 2 PM
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 3);
    futureDate.setHours(14, 0, 0, 0);
    
    await LocalNotifications.schedule({
      notifications: [{
        id: notificationId,
        title: ENGAGEMENT_NOTIFICATIONS.reengage.title,
        body: ENGAGEMENT_NOTIFICATIONS.reengage.body,
        schedule: { at: futureDate },
        extra: { type: 'engagement', subType: 'reengage' },
      }],
    });
    
    console.log(`Rescheduled re-engagement notification to ${futureDate}`);
  } catch (error) {
    console.error('Failed to reschedule re-engagement:', error);
  }
};

/**
 * Check and schedule streak notifications (3, 7, 14, 30 day milestones)
 */
export const checkAndScheduleStreakNotifications = async (): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: stats } = await supabase
      .from('user_stats')
      .select('current_streak, last_check_in_date')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!stats) return;

    const currentStreak = stats.current_streak || 0;

    const milestones: { streak: number; type: EngagementNotificationType }[] = [
      { streak: 3, type: 'streak_3' },
      { streak: 7, type: 'streak_7' },
      { streak: 14, type: 'streak_14' },
      { streak: 30, type: 'streak_30' },
    ];

    for (const { streak, type } of milestones) {
      if (currentStreak === streak) {
        const today = new Date();
        const notificationTime = new Date(today);
        notificationTime.setHours(20, 0, 0, 0); // 8 PM
        
        if (notificationTime > new Date()) {
          await scheduleEngagementNotification(type, notificationTime);
        }
      } else if (currentStreak > streak) {
        // Cancel any pending milestone notification if streak already passed it
        try {
          await LocalNotifications.cancel({ 
            notifications: [{ id: ENGAGEMENT_NOTIFICATION_IDS[type] }] 
          });
        } catch (e) { /* ignore */ }
      }
    }
  } catch (error) {
    console.error('Failed to check streak notifications:', error);
  }
};

/**
 * Schedule missed dose notification (3 PM if unchecked doses)
 * Only for doses that are NOT taken AND NOT skipped
 */
export const scheduleMissedDoseNotification = async (): Promise<void> => {
  try {
    // Check throttle FIRST before doing database queries
    if (isThrottled('missed_dose')) {
      console.log('Skipping missed dose check - throttled');
      return;
    }
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // If it's already past 3 PM, don't schedule (it would fire immediately or in the past)
    if (today.getHours() >= 15) {
      console.log('Skipping missed dose notification - already past 3 PM');
      return;
    }

    // Check if there are unchecked doses for today
    const { data: doses } = await supabase
      .from('doses')
      .select('id, scheduled_time, skipped')
      .eq('user_id', user.id)
      .eq('scheduled_date', todayStr)
      .eq('taken', false);

    if (doses && doses.length > 0) {
      // Filter out skipped doses
      const unskippedDoses = doses.filter(dose => dose.skipped !== true);
      
      if (unskippedDoses.length === 0) {
        console.log('All untaken doses are skipped - no missed dose notification needed');
        return;
      }
      
      // Check if any dose time has passed
      const currentTime = today.getHours() * 60 + today.getMinutes();
      const hasMissedDose = unskippedDoses.some(dose => {
        const [hours, minutes] = dose.scheduled_time.split(':').map(Number);
        const doseTime = hours * 60 + minutes;
        return doseTime < currentTime;
      });

      if (hasMissedDose) {
        const notificationTime = new Date(today);
        notificationTime.setHours(15, 0, 0, 0); // 3 PM
        
        if (notificationTime > new Date()) {
          await scheduleEngagementNotification('missed_dose', notificationTime);
        }
      }
    }
  } catch (error) {
    console.error('Failed to schedule missed dose notification:', error);
  }
};

/**
 * Schedule weekly check-in notification (Sunday 7 PM)
 * Skips if user already logged doses today (they're engaged)
 */
export const scheduleWeeklyCheckin = async (): Promise<void> => {
  try {
    // Check throttle first
    if (isThrottled('weekly_checkin')) {
      console.log('Skipping weekly check-in - already scheduled this week');
      return;
    }

    // Check if user has logged any doses today — if so, skip
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const todayStr = new Date().toISOString().split('T')[0];
      const { data: todayDoses } = await supabase
        .from('doses')
        .select('id')
        .eq('user_id', user.id)
        .eq('scheduled_date', todayStr)
        .eq('taken', true)
        .limit(1);
      
      if (todayDoses && todayDoses.length > 0) {
        console.log('Skipping weekly check-in - user already active today');
        return;
      }
    }
    
    const today = new Date();
    const dayOfWeek = today.getDay();
    
    // Calculate days until next Sunday
    const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
    
    const nextSunday = new Date(today);
    nextSunday.setDate(today.getDate() + daysUntilSunday);
    nextSunday.setHours(19, 0, 0, 0); // 7 PM

    // Try to build a dynamic message with stats
    if (user) {
      const { data: stats } = await supabase
        .from('user_stats')
        .select('current_streak, total_doses_logged')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (stats && stats.current_streak && stats.current_streak > 0) {
        // Schedule with dynamic body
        const notificationId = ENGAGEMENT_NOTIFICATION_IDS.weekly_checkin;
        try {
          await LocalNotifications.cancel({ notifications: [{ id: notificationId }] });
        } catch (e) { /* ignore */ }
        
        await LocalNotifications.schedule({
          notifications: [{
            id: notificationId,
            title: "📊 Weekly Check-in",
            body: `${stats.current_streak}-day streak! You've logged ${stats.total_doses_logged || 0} total doses. Keep it up! 🔥`,
            schedule: { at: nextSunday },
            extra: { type: 'engagement', subType: 'weekly_checkin' },
          }],
        });
        markAsSent('weekly_checkin');
        console.log(`Scheduled dynamic weekly check-in for ${nextSunday}`);
        return;
      }
    }

    await scheduleEngagementNotification('weekly_checkin', nextSunday);
  } catch (error) {
    console.error('Failed to schedule weekly check-in:', error);
  }
};

/**
 * Schedule photo reminder notification (Saturday 10 AM)
 * Only for users who have taken at least 1 photo
 */
export const schedulePhotoReminder = async (): Promise<void> => {
  try {
    // Check throttle first
    if (isThrottled('photo_reminder')) {
      console.log('Skipping photo reminder - already scheduled this week');
      return;
    }
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check if user has taken at least 1 photo
    const { count } = await supabase
      .from('progress_entries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .not('photo_url', 'is', null);

    if (!count || count < 1) {
      console.log('User has no photos - skipping photo reminder');
      return;
    }

    const today = new Date();
    const dayOfWeek = today.getDay();
    
    const daysUntilSaturday = dayOfWeek === 6 ? 7 : (6 - dayOfWeek);
    
    const nextSaturday = new Date(today);
    nextSaturday.setDate(today.getDate() + daysUntilSaturday);
    nextSaturday.setHours(10, 0, 0, 0); // 10 AM

    await scheduleEngagementNotification('photo_reminder', nextSaturday);
  } catch (error) {
    console.error('Failed to schedule photo reminder:', error);
  }
};

/**
 * Schedule re-engagement notification proactively 3 days from now.
 * This replaces the old "check if 3+ days inactive" approach.
 */
export const scheduleReengagementNotification = async (): Promise<void> => {
  try {
    // Simply schedule 3 days from now at 2 PM
    // Each time the user opens the app, this gets rescheduled further out
    await rescheduleReengagement();
  } catch (error) {
    console.error('Failed to schedule re-engagement notification:', error);
  }
};

/**
 * Schedule first week anniversary notification
 */
export const scheduleFirstWeekAnniversary = async (): Promise<void> => {
  try {
    const alreadySent = localStorage.getItem(THROTTLE_KEYS.first_week);
    if (alreadySent) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('created_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profile?.created_at) return;

    const signupDate = new Date(profile.created_at);
    const now = new Date();
    const daysSinceSignup = Math.floor((now.getTime() - signupDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceSignup < 7) {
      // Schedule for exactly 7 days after signup at 10 AM
      const anniversaryDate = new Date(signupDate);
      anniversaryDate.setDate(signupDate.getDate() + 7);
      anniversaryDate.setHours(10, 0, 0, 0);

      if (anniversaryDate > now) {
        await scheduleEngagementNotification('first_week', anniversaryDate);
      }
    }
    // If already past 7 days, don't send retroactively
  } catch (error) {
    console.error('Failed to schedule first week anniversary:', error);
  }
};

/**
 * Initialize all engagement notifications
 * Uses throttling to prevent duplicate scheduling
 */
export const initializeEngagementNotifications = async (): Promise<void> => {
  try {
    // Schedule weekly check-in (throttled to once per week)
    await scheduleWeeklyCheckin();
    
    // Check for missed doses (throttled to once every 3 days)
    await scheduleMissedDoseNotification();
    
    // Schedule re-engagement 3 days from now (resets on each app open)
    await scheduleReengagementNotification();
    
    // Schedule photo reminder (throttled to once per week, only for users with 1+ photos)
    await schedulePhotoReminder();

    // Schedule first week anniversary (once ever)
    await scheduleFirstWeekAnniversary();
    
    // Streak notifications are triggered on dose completion
  } catch (error) {
    console.error('Failed to initialize engagement notifications:', error);
  }
};
