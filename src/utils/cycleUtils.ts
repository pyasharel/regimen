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
 * IMPORTANT: Cycle periods are stored in weeks in the database.
 * - 4 weeks is treated as 1 calendar month (approximately 30 days)
 * - This provides more intuitive cycle calculations for users thinking in months
 */
export const calculateCycleStatus = (
  startDate: string,
  cycleWeeksOn: number | null,
  cycleWeeksOff: number | null
): CycleStatus | null => {
  // Return null if no cycle is configured
  if (!cycleWeeksOn) {
    return null;
  }

  const start = new Date(startDate);
  const now = new Date();
  
  // Calculate days since start
  const daysSinceStart = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  
  // Convert weeks to days
  // Note: cycleWeeksOn/Off are stored in the unit the user selected
  // For months: 4 weeks = ~30 days for intuitive month behavior
  // For weeks: exact 7 days
  // For days: exact 1 day
  const convertWeeksToDays = (weeks: number) => {
    if (weeks >= 4 && weeks % 4 === 0) {
      // Treat as months: 4 weeks = 30 days (not 28)
      return (weeks / 4) * 30;
    }
    // For non-month periods, use exact weeks
    return weeks * 7;
  };
  
  // If it's a one-time duration (no off period), check if still within the on period
  if (!cycleWeeksOff || cycleWeeksOff === 0) {
    const totalDaysOn = convertWeeksToDays(cycleWeeksOn);
    const isStillInCycle = daysSinceStart < totalDaysOn;
    
    return {
      isInCycle: isStillInCycle,
      currentPhase: 'on',
      daysIntoPhase: Math.min(daysSinceStart, totalDaysOn),
      totalDaysInPhase: totalDaysOn,
      daysRemaining: Math.max(0, totalDaysOn - daysSinceStart),
      progressPercentage: Math.min(100, Math.round((daysSinceStart / totalDaysOn) * 100))
    };
  }

  // For recurring cycles (on/off pattern)
  const daysOn = convertWeeksToDays(cycleWeeksOn);
  const daysOff = convertWeeksToDays(cycleWeeksOff);
  const cycleDuration = daysOn + daysOff;
  
  // Find position within current cycle
  const positionInCycle = daysSinceStart % cycleDuration;
  
  // Determine if currently in ON or OFF phase
  const isOnPhase = positionInCycle < daysOn;
  
  if (isOnPhase) {
    return {
      isInCycle: true,
      currentPhase: 'on',
      daysIntoPhase: positionInCycle + 1, // +1 for display (day 1 instead of day 0)
      totalDaysInPhase: daysOn,
      daysRemaining: daysOn - positionInCycle,
      progressPercentage: Math.round(((positionInCycle + 1) / daysOn) * 100)
    };
  } else {
    const daysIntoOff = positionInCycle - daysOn;
    return {
      isInCycle: false,
      currentPhase: 'off',
      daysIntoPhase: daysIntoOff + 1,
      totalDaysInPhase: daysOff,
      daysRemaining: daysOff - daysIntoOff,
      progressPercentage: Math.round(((daysIntoOff + 1) / daysOff) * 100)
    };
  }
};
