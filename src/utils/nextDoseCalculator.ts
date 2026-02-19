import { addDays, startOfDay, format } from 'date-fns';

interface CompoundSchedule {
  schedule_type: string;
  schedule_days: string[] | null;
  time_of_day: string[];
  start_date: string;
  interval_days?: number | null;
}

interface DoseRecord {
  taken: boolean | null;
  skipped?: boolean | null;
  scheduled_date: string;
  scheduled_time: string;
}

/**
 * Calculates the next scheduled dose date dynamically from the compound's
 * schedule configuration, rather than relying on potentially stale database records.
 * 
 * Returns a { date: string (YYYY-MM-DD), time: string } or null if no next dose.
 */
export function getNextScheduledDate(
  compound: CompoundSchedule,
  todaysDoses: DoseRecord[]
): { date: string; time: string } | null {
  const today = startOfDay(new Date());
  const todayStr = format(today, 'yyyy-MM-dd');
  const todayDow = today.getDay(); // 0=Sun, 1=Mon, ...

  const { schedule_type, schedule_days, time_of_day, start_date, interval_days } = compound;
  const defaultTime = time_of_day?.[0] || 'Morning';

  // As Needed — no scheduled doses
  if (schedule_type === 'As Needed') return null;

  // Daily — today if not all taken, else tomorrow
  if (schedule_type === 'Daily') {
    const allTodayTaken = todaysDoses
      .filter(d => d.scheduled_date === todayStr && !d.skipped)
      .every(d => d.taken);
    
    if (!allTodayTaken || todaysDoses.filter(d => d.scheduled_date === todayStr).length === 0) {
      return { date: todayStr, time: defaultTime };
    }
    return { date: format(addDays(today, 1), 'yyyy-MM-dd'), time: defaultTime };
  }

  // Every X Days — calculate from start_date using interval
  const everyXMatch = schedule_type.match(/Every (\d+) Days/);
  if (everyXMatch || (interval_days && interval_days > 0)) {
    const interval = everyXMatch ? parseInt(everyXMatch[1]) : (interval_days || 1);
    const start = startOfDay(new Date(start_date + 'T00:00:00'));
    const daysSinceStart = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceStart < 0) {
      // Haven't started yet
      return { date: format(start, 'yyyy-MM-dd'), time: defaultTime };
    }
    
    const remainder = daysSinceStart % interval;
    if (remainder === 0) {
      // Today is a dose day
      const todayDose = todaysDoses.find(d => d.scheduled_date === todayStr && !d.skipped);
      if (!todayDose || !todayDose.taken) {
        return { date: todayStr, time: defaultTime };
      }
      // Already taken today, next is interval days away
      return { date: format(addDays(today, interval), 'yyyy-MM-dd'), time: defaultTime };
    }
    
    const daysUntilNext = interval - remainder;
    return { date: format(addDays(today, daysUntilNext), 'yyyy-MM-dd'), time: defaultTime };
  }

  // Specific day(s), Weekly, Twice Weekly — all use schedule_days
  if (schedule_days && schedule_days.length > 0) {
    const dayIndices = schedule_days.map(d => parseInt(String(d))).filter(n => !isNaN(n));
    
    if (dayIndices.length === 0) return null;

    // Check today first
    if (dayIndices.includes(todayDow)) {
      const timeForToday = getTimeForDay(todayDow, dayIndices, time_of_day);
      const todayDose = todaysDoses.find(d => d.scheduled_date === todayStr && !d.skipped);
      if (!todayDose || !todayDose.taken) {
        return { date: todayStr, time: timeForToday };
      }
    }

    // Find next matching day (up to 7 days ahead)
    for (let offset = 1; offset <= 7; offset++) {
      const futureDate = addDays(today, offset);
      const futureDow = futureDate.getDay();
      if (dayIndices.includes(futureDow)) {
        const timeForDay = getTimeForDay(futureDow, dayIndices, time_of_day);
        return { date: format(futureDate, 'yyyy-MM-dd'), time: timeForDay };
      }
    }
  }

  return null;
}

/**
 * Gets the scheduled time for a specific day of the week.
 * When time_of_day has multiple entries paired with schedule_days by index,
 * this returns the matching time.
 */
function getTimeForDay(
  dayOfWeek: number,
  dayIndices: number[],
  timeOfDay: string[]
): string {
  const idx = dayIndices.indexOf(dayOfWeek);
  if (idx >= 0 && idx < timeOfDay.length) {
    return timeOfDay[idx];
  }
  return timeOfDay[0] || 'Morning';
}
