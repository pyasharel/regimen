import { LocalNotifications } from '@capacitor/local-notifications';
import { supabase } from "@/integrations/supabase/client";

export type EngagementNotificationType = 
  | 'first_dose'
  | 'streak_3'
  | 'streak_7'
  | 'missed_dose'
  | 'weekly_checkin'
  | 'reengage';

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
 * Schedule an engagement notification
 */
export const scheduleEngagementNotification = async (
  type: EngagementNotificationType,
  scheduledTime: Date
): Promise<void> => {
  try {
    const notification = ENGAGEMENT_NOTIFICATIONS[type];
    
    await LocalNotifications.schedule({
      notifications: [
        {
          id: Math.floor(Math.random() * 100000) + 50000, // Random ID between 50000-150000
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
 */
export const scheduleMissedDoseNotification = async (): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Check if there are unchecked doses for today
    const { data: doses } = await supabase
      .from('doses')
      .select('id, scheduled_time')
      .eq('user_id', user.id)
      .eq('scheduled_date', todayStr)
      .eq('taken', false);

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

    // Schedule re-engagement if it's been 3 days
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
 */
export const initializeEngagementNotifications = async (): Promise<void> => {
  try {
    // Schedule weekly check-in
    await scheduleWeeklyCheckin();
    
    // Check for missed doses
    await scheduleMissedDoseNotification();
    
    // Check for re-engagement
    await scheduleReengagementNotification();
    
    // Streak notifications are triggered on dose completion
  } catch (error) {
    console.error('Failed to initialize engagement notifications:', error);
  }
};
