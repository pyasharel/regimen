import { LocalNotifications } from '@capacitor/local-notifications';
import { supabase } from "@/integrations/supabase/client";
import { toLocalDateString } from "@/utils/dateUtils";

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
  | 'nudge_add_compound'
  | 'nudge_add_compound_2'
  | 'encourage_add_more';

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
  nudge_add_compound: 90050,
  nudge_add_compound_2: 90051,
  encourage_add_more: 90052,
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
  nudge_add_compound: 'regimen_notif_nudge_add_compound',
  nudge_add_compound_2: 'regimen_notif_nudge_add_compound_2',
  encourage_add_more: 'regimen_notif_encourage_add_more',
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
  nudge_add_compound: 9999, // Only once ever
  nudge_add_compound_2: 9999, // Only once ever
  encourage_add_more: 30, // Once per month
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
  nudge_add_compound: {
    title: "💊 Your protocol tracker is ready",
    body: "Add your first compound to start tracking.",
  },
  nudge_add_compound_2: {
    title: "⚡ It takes 30 seconds",
    body: "Add a compound and never miss a dose.",
  },
  encourage_add_more: {
    title: "📋 Track your full protocol",
    body: "You can track unlimited compounds on your plan. Add another to get the full experience.",
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
 * Calculate the longest expected gap (in days) between doses based on user's compounds.
 * Returns the max gap across all active compounds, capped at 10 days.
 * Falls back to 3 days if no compounds or query fails.
 */
const calculateLongestDosingGap = async (): Promise<number> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 3;

    const { data: compounds } = await supabase
      .from('compounds')
      .select('schedule_type, interval_days, schedule_days')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (!compounds || compounds.length === 0) return 3;

    let longestGap = 1; // daily default

    for (const compound of compounds) {
      let gap = 1;
      
      switch (compound.schedule_type) {
        case 'daily':
          gap = 1;
          break;
        case 'weekly':
          gap = 7;
          break;
        case 'interval':
          gap = compound.interval_days || 3;
          break;
        case 'specific_days':
          // Calculate max gap between scheduled days of the week
          if (compound.schedule_days && compound.schedule_days.length > 0) {
            const dayIndices = compound.schedule_days
              .map(d => ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'].indexOf(d.toLowerCase()))
              .filter(i => i >= 0)
              .sort((a, b) => a - b);
            
            if (dayIndices.length === 1) {
              gap = 7; // once a week
            } else {
              let maxDayGap = 0;
              for (let i = 1; i < dayIndices.length; i++) {
                maxDayGap = Math.max(maxDayGap, dayIndices[i] - dayIndices[i - 1]);
              }
              // Wrap-around gap (last day to first day of next week)
              const wrapGap = 7 - dayIndices[dayIndices.length - 1] + dayIndices[0];
              maxDayGap = Math.max(maxDayGap, wrapGap);
              gap = maxDayGap;
            }
          } else {
            gap = 3;
          }
          break;
        default:
          gap = 3;
      }
      
      longestGap = Math.max(longestGap, gap);
    }

    // Cap at 10 days
    return Math.min(longestGap, 10);
  } catch (error) {
    console.error('Failed to calculate dosing gap:', error);
    return 3;
  }
};

/**
 * Reschedule re-engagement notification based on user's dosing schedule.
 * Fires longest_gap + 1 day from now (capped at 10 days).
 * Call this each time the user logs a dose to keep pushing it forward.
 */
export const rescheduleReengagement = async (): Promise<void> => {
  try {
    const notificationId = ENGAGEMENT_NOTIFICATION_IDS.reengage;
    
    // Cancel any existing re-engagement notification
    try {
      await LocalNotifications.cancel({ notifications: [{ id: notificationId }] });
    } catch (e) { /* ignore */ }
    
    // Calculate schedule-aware delay
    const longestGap = await calculateLongestDosingGap();
    const daysOut = longestGap + 1; // 1 day buffer after expected next dose
    
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysOut);
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
    
    console.log(`Rescheduled re-engagement notification to ${futureDate} (${daysOut} days out, gap=${longestGap})`);
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
    const todayStr = toLocalDateString(today);

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
      const todayStr = toLocalDateString();
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
 * Initialize all engagement notifications
 * Uses throttling to prevent duplicate scheduling
 */
export const initializeEngagementNotifications = async (): Promise<void> => {
  try {
    // Schedule weekly check-in (throttled to once per week)
    await scheduleWeeklyCheckin();
    
    // Check for missed doses (throttled to once every 3 days)
    await scheduleMissedDoseNotification();
    
    // Schedule re-engagement based on dosing schedule (resets on each app open)
    await scheduleReengagementNotification();
    
    // Schedule photo reminder (throttled to once per week, only for users with 1+ photos)
    await schedulePhotoReminder();
    
    // Streak notifications are triggered on dose completion
  } catch (error) {
    console.error('Failed to initialize engagement notifications:', error);
  }
};

/**
 * Schedule "Add Your First Compound" nudge notifications.
 * Called at end of onboarding when user has 0 compounds.
 * 
 * Nudge 1: Next day at 11 AM
 * Nudge 2: 3 days later at 7 PM
 * Both are cancelled when user adds their first compound.
 */
export const scheduleCompoundNudges = async (): Promise<void> => {
  try {
    // Nudge 1: Tomorrow at 11 AM
    if (!isThrottled('nudge_add_compound')) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(11, 0, 0, 0);
      
      const notificationId = ENGAGEMENT_NOTIFICATION_IDS.nudge_add_compound;
      try { await LocalNotifications.cancel({ notifications: [{ id: notificationId }] }); } catch (e) { /* ignore */ }
      
      await LocalNotifications.schedule({
        notifications: [{
          id: notificationId,
          title: ENGAGEMENT_NOTIFICATIONS.nudge_add_compound.title,
          body: ENGAGEMENT_NOTIFICATIONS.nudge_add_compound.body,
          schedule: { at: tomorrow },
          extra: { type: 'engagement', subType: 'nudge_add_compound' },
        }],
      });
      markAsSent('nudge_add_compound');
      console.log(`[Engagement] Scheduled nudge_add_compound for ${tomorrow}`);
    }

    // Nudge 2: 3 days from now at 7 PM
    if (!isThrottled('nudge_add_compound_2')) {
      const threeDays = new Date();
      threeDays.setDate(threeDays.getDate() + 3);
      threeDays.setHours(19, 0, 0, 0);
      
      const notificationId2 = ENGAGEMENT_NOTIFICATION_IDS.nudge_add_compound_2;
      try { await LocalNotifications.cancel({ notifications: [{ id: notificationId2 }] }); } catch (e) { /* ignore */ }
      
      await LocalNotifications.schedule({
        notifications: [{
          id: notificationId2,
          title: ENGAGEMENT_NOTIFICATIONS.nudge_add_compound_2.title,
          body: ENGAGEMENT_NOTIFICATIONS.nudge_add_compound_2.body,
          schedule: { at: threeDays },
          extra: { type: 'engagement', subType: 'nudge_add_compound_2' },
        }],
      });
      markAsSent('nudge_add_compound_2');
      console.log(`[Engagement] Scheduled nudge_add_compound_2 for ${threeDays}`);
    }
  } catch (error) {
    console.error('Failed to schedule compound nudges:', error);
  }
};

/**
 * Cancel compound nudge notifications.
 * Called when user adds their first compound.
 */
export const cancelCompoundNudges = async (): Promise<void> => {
  try {
    await LocalNotifications.cancel({
      notifications: [
        { id: ENGAGEMENT_NOTIFICATION_IDS.nudge_add_compound },
        { id: ENGAGEMENT_NOTIFICATION_IDS.nudge_add_compound_2 },
      ]
    });
    console.log('[Engagement] Cancelled compound nudge notifications');
  } catch (error) {
    console.error('Failed to cancel compound nudges:', error);
  }
};

/**
 * Schedule "Add More Compounds" encouragement for trial users with 1 compound.
 * Fires 2 days after first compound is added, at 11 AM.
 */
export const scheduleAddMoreEncouragement = async (): Promise<void> => {
  try {
    if (isThrottled('encourage_add_more')) {
      console.log('[Engagement] Skipping encourage_add_more - throttled');
      return;
    }

    const twoDays = new Date();
    twoDays.setDate(twoDays.getDate() + 2);
    twoDays.setHours(11, 0, 0, 0);

    const notificationId = ENGAGEMENT_NOTIFICATION_IDS.encourage_add_more;
    try { await LocalNotifications.cancel({ notifications: [{ id: notificationId }] }); } catch (e) { /* ignore */ }

    await LocalNotifications.schedule({
      notifications: [{
        id: notificationId,
        title: ENGAGEMENT_NOTIFICATIONS.encourage_add_more.title,
        body: ENGAGEMENT_NOTIFICATIONS.encourage_add_more.body,
        schedule: { at: twoDays },
        extra: { type: 'engagement', subType: 'encourage_add_more' },
      }],
    });
    markAsSent('encourage_add_more');
    console.log(`[Engagement] Scheduled encourage_add_more for ${twoDays}`);
  } catch (error) {
    console.error('Failed to schedule add more encouragement:', error);
  }
};

/**
 * Cancel "Add More Compounds" encouragement notification.
 * Called when user adds a 2nd compound.
 */
export const cancelAddMoreEncouragement = async (): Promise<void> => {
  try {
    await LocalNotifications.cancel({
      notifications: [{ id: ENGAGEMENT_NOTIFICATION_IDS.encourage_add_more }]
    });
    console.log('[Engagement] Cancelled encourage_add_more notification');
  } catch (error) {
    console.error('Failed to cancel add more encouragement:', error);
  }
};