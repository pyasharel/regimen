import { createLocalDate } from "@/utils/dateUtils";

interface CycleStatus {
  isInCycle: boolean;
  currentPhase: 'on' | 'off';
  daysIntoPhase: number;
  totalDaysInPhase: number;
  daysRemaining: number;
  progressPercentage: number;
}

/**
 * Calculate the current cycle status for a compound
 * 
 * IMPORTANT: Cycle periods are now stored in DAYS in the database.
 * - cycleWeeksOn and cycleWeeksOff represent days, not weeks
 * - This provides consistent handling across days/weeks/months
 */
export const calculateCycleStatus = (
  startDate: string,
  cycleDaysOn: number | null,
  cycleDaysOff: number | null
): CycleStatus | null => {
  // Return null if no cycle is configured
  if (!cycleDaysOn) {
    return null;
  }

  // Use createLocalDate to avoid timezone issues - new Date('YYYY-MM-DD') 
  // parses as UTC midnight, which shifts to previous day in western timezones
  const start = createLocalDate(startDate);
  if (!start) {
    return null;
  }
  const now = new Date();
  
  // Calculate days since start
  const daysSinceStart = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  
  // If it's a one-time duration (no off period), check if still within the on period
  if (!cycleDaysOff || cycleDaysOff === 0) {
    const isStillInCycle = daysSinceStart < cycleDaysOn;
    
    return {
      isInCycle: isStillInCycle,
      currentPhase: 'on',
      daysIntoPhase: Math.min(daysSinceStart, cycleDaysOn),
      totalDaysInPhase: cycleDaysOn,
      daysRemaining: Math.max(0, cycleDaysOn - daysSinceStart),
      progressPercentage: Math.min(100, Math.round((daysSinceStart / cycleDaysOn) * 100))
    };
  }

  // For recurring cycles (on/off pattern) - values are already in days
  const cycleDuration = cycleDaysOn + cycleDaysOff;
  
  // Find position within current cycle
  const positionInCycle = daysSinceStart % cycleDuration;
  
  // Determine if currently in ON or OFF phase
  const isOnPhase = positionInCycle < cycleDaysOn;
  
  if (isOnPhase) {
    return {
      isInCycle: true,
      currentPhase: 'on',
      daysIntoPhase: positionInCycle + 1, // +1 for display (day 1 instead of day 0)
      totalDaysInPhase: cycleDaysOn,
      daysRemaining: cycleDaysOn - positionInCycle,
      progressPercentage: Math.round(((positionInCycle + 1) / cycleDaysOn) * 100)
    };
  } else {
    const daysIntoOff = positionInCycle - cycleDaysOn;
    return {
      isInCycle: false,
      currentPhase: 'off',
      daysIntoPhase: daysIntoOff + 1,
      totalDaysInPhase: cycleDaysOff,
      daysRemaining: cycleDaysOff - daysIntoOff,
      progressPercentage: Math.round(((daysIntoOff + 1) / cycleDaysOff) * 100)
    };
  }
};
