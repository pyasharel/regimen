import { LocalNotifications } from '@capacitor/local-notifications';
import { supabase } from "@/integrations/supabase/client";

export type EngagementNotificationType = 
  | 'first_dose'
  | 'streak_3'
  | 'streak_7'
  | 'missed_dose'
  | 'weekly_checkin'
  | 'reengage';

// Fixed notification IDs for each type to prevent duplicates
const ENGAGEMENT_NOTIFICATION_IDS: Record<EngagementNotificationType, number> = {
  first_dose: 90001,
  streak_3: 90003,
  streak_7: 90007,
  missed_dose: 90010,
  weekly_checkin: 90020,
  reengage: 90030,
};

// LocalStorage keys for throttling
const THROTTLE_KEYS: Record<EngagementNotificationType, string> = {
  first_dose: 'regimen_notif_first_dose',
  streak_3: 'regimen_notif_streak_3',
  streak_7: 'regimen_notif_streak_7',
  missed_dose: 'regimen_notif_missed_dose',
  weekly_checkin: 'regimen_notif_weekly_checkin',
  reengage: 'regimen_notif_reengage',
};

// How often each notification type can be sent (in days)
const THROTTLE_DAYS: Record<EngagementNotificationType, number> = {
  first_dose: 9999, // Only once ever
  streak_3: 30,     // Once per month (streak resets)
  streak_7: 30,     // Once per month
  missed_dose: 3,   // Every 3 days max
  weekly_checkin: 7, // Once per week
  reengage: 3,       // Every 3 days max
};

const ENGAGEMENT_NOTIFICATIONS = {
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
          id: notificationId, // Use fixed ID to prevent duplicates
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
 * Check and schedule streak notifications (3-day, 7-day)
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

    // Schedule 3-day streak notification at 8 PM today if they just hit 3 days
    if (currentStreak === 3) {
      const today = new Date();
      const notificationTime = new Date(today);
      notificationTime.setHours(20, 0, 0, 0); // 8 PM
      
      if (notificationTime > new Date()) {
        await scheduleEngagementNotification('streak_3', notificationTime);
      }
    }

    // Schedule 7-day streak notification at 8 PM today if they just hit 7 days
    if (currentStreak === 7) {
      const today = new Date();
      const notificationTime = new Date(today);
      notificationTime.setHours(20, 0, 0, 0); // 8 PM
      
      if (notificationTime > new Date()) {
        await scheduleEngagementNotification('streak_7', notificationTime);
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Check if there are unchecked AND non-skipped doses for today
    const { data: doses } = await supabase
      .from('doses')
      .select('id, scheduled_time, skipped')
      .eq('user_id', user.id)
      .eq('scheduled_date', todayStr)
      .eq('taken', false)
      .eq('skipped', false); // Exclude skipped doses!

    if (doses && doses.length > 0) {
      // Check if any dose time has passed
      const currentTime = today.getHours() * 60 + today.getMinutes();
      const hasMissedDose = doses.some(dose => {
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
 */
export const scheduleWeeklyCheckin = async (): Promise<void> => {
  try {
    // Check throttle first - no need to calculate if already sent this week
    if (isThrottled('weekly_checkin')) {
      console.log('Skipping weekly check-in - already scheduled this week');
      return;
    }
    
    const today = new Date();
    const dayOfWeek = today.getDay();
    
    // Calculate days until next Sunday
    const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
    
    const nextSunday = new Date(today);
    nextSunday.setDate(today.getDate() + daysUntilSunday);
    nextSunday.setHours(19, 0, 0, 0); // 7 PM

    await scheduleEngagementNotification('weekly_checkin', nextSunday);
  } catch (error) {
    console.error('Failed to schedule weekly check-in:', error);
  }
};

/**
 * Schedule re-engagement notification (2 PM, 3 days after last activity)
 */
export const scheduleReengagementNotification = async (): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: stats } = await supabase
      .from('user_stats')
      .select('last_check_in_date')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!stats || !stats.last_check_in_date) return;

    const lastCheckIn = new Date(stats.last_check_in_date);
    const today = new Date();
    const daysSinceLastCheckIn = Math.floor((today.getTime() - lastCheckIn.getTime()) / (1000 * 60 * 60 * 24));

    // Schedule re-engagement if it's been 3+ days since last check-in
    if (daysSinceLastCheckIn >= 3) {
      const notificationTime = new Date();
      notificationTime.setHours(14, 0, 0, 0); // 2 PM
      
      if (notificationTime > new Date()) {
        await scheduleEngagementNotification('reengage', notificationTime);
      }
    }
  } catch (error) {
    console.error('Failed to schedule re-engagement notification:', error);
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
    
    // Check for re-engagement (throttled to once every 3 days)
    await scheduleReengagementNotification();
    
    // Streak notifications are triggered on dose completion
  } catch (error) {
    console.error('Failed to initialize engagement notifications:', error);
  }
};
