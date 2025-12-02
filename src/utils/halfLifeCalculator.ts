/**
 * Half-life calculation utilities
 * 
 * Calculates estimated medication levels based on actual taken doses
 * using exponential decay formula: C(t) = C0 * (0.5)^(t/halfLife)
 */

import { getHalfLifeData } from './halfLifeData';

export interface TakenDose {
  id: string;
  takenAt: Date;
  amount: number;
  unit: string;
}

export interface MedicationLevel {
  timestamp: Date;
  level: number; // Percentage of peak (0-100+)
  absoluteLevel: number; // Actual amount remaining
}

/**
 * Calculate the remaining amount of a single dose at a given time
 */
const calculateDecay = (
  initialAmount: number,
  halfLifeHours: number,
  hoursElapsed: number
): number => {
  if (hoursElapsed < 0) return 0; // Dose hasn't been taken yet
  return initialAmount * Math.pow(0.5, hoursElapsed / halfLifeHours);
};

/**
 * Calculate medication levels over time based on actual taken doses
 * 
 * @param doses - Array of taken doses with timestamps
 * @param halfLifeHours - Half-life of the medication in hours
 * @param startDate - Start of the calculation period
 * @param endDate - End of the calculation period
 * @param pointsPerDay - Number of data points per day (default 4 for 6-hour intervals)
 */
export const calculateMedicationLevels = (
  doses: TakenDose[],
  halfLifeHours: number,
  startDate: Date,
  endDate: Date,
  pointsPerDay: number = 4
): MedicationLevel[] => {
  if (doses.length === 0) return [];

  const levels: MedicationLevel[] = [];
  const intervalHours = 24 / pointsPerDay;
  
  // Generate timestamps for the calculation period
  let currentTime = new Date(startDate);
  while (currentTime <= endDate) {
    let totalLevel = 0;
    
    // Sum up contributions from all doses taken before this time
    for (const dose of doses) {
      const hoursElapsed = (currentTime.getTime() - dose.takenAt.getTime()) / (1000 * 60 * 60);
      if (hoursElapsed >= 0) {
        totalLevel += calculateDecay(dose.amount, halfLifeHours, hoursElapsed);
      }
    }
    
    levels.push({
      timestamp: new Date(currentTime),
      level: 0, // Will be calculated as percentage below
      absoluteLevel: totalLevel
    });
    
    // Move to next interval
    currentTime = new Date(currentTime.getTime() + intervalHours * 60 * 60 * 1000);
  }
  
  // Calculate percentage levels (relative to max)
  const maxLevel = Math.max(...levels.map(l => l.absoluteLevel), 1);
  for (const level of levels) {
    level.level = (level.absoluteLevel / maxLevel) * 100;
  }
  
  return levels;
};

/**
 * Calculate current medication level
 */
export const calculateCurrentLevel = (
  doses: TakenDose[],
  halfLifeHours: number
): { level: number; absoluteLevel: number; percentOfPeak: number } => {
  const now = new Date();
  let totalLevel = 0;
  
  for (const dose of doses) {
    const hoursElapsed = (now.getTime() - dose.takenAt.getTime()) / (1000 * 60 * 60);
    if (hoursElapsed >= 0) {
      totalLevel += calculateDecay(dose.amount, halfLifeHours, hoursElapsed);
    }
  }
  
  // Calculate peak (highest single dose as reference)
  const peakDose = Math.max(...doses.map(d => d.amount), 1);
  const percentOfPeak = (totalLevel / peakDose) * 100;
  
  return {
    level: totalLevel,
    absoluteLevel: totalLevel,
    percentOfPeak: Math.min(percentOfPeak, 100) // Cap at 100% for display
  };
};

/**
 * Estimate when medication will be "out of system" (< 3% remaining)
 */
export const estimateClearanceTime = (
  doses: TakenDose[],
  halfLifeHours: number
): Date | null => {
  if (doses.length === 0) return null;
  
  // Find the most recent dose
  const lastDose = doses.reduce((latest, dose) => 
    dose.takenAt > latest.takenAt ? dose : latest
  );
  
  // Time for level to drop to 3% of peak: solve 0.03 = 0.5^(t/halfLife)
  // t = halfLife * log2(1/0.03) ≈ halfLife * 5.06
  const clearanceHours = halfLifeHours * 5.06;
  
  return new Date(lastDose.takenAt.getTime() + clearanceHours * 60 * 60 * 1000);
};

/**
 * Get summary stats for a medication
 */
export const getMedicationStats = (
  medicationName: string,
  doses: TakenDose[]
): {
  totalDoses: number;
  lastDose: Date | null;
  currentLevel: number;
  percentOfPeak: number;
  estimatedClearance: Date | null;
  halfLifeHours: number | null;
} | null => {
  const halfLifeData = getHalfLifeData(medicationName);
  if (!halfLifeData || doses.length === 0) return null;
  
  const takenDoses = doses.filter(d => d.takenAt);
  if (takenDoses.length === 0) return null;
  
  const { absoluteLevel, percentOfPeak } = calculateCurrentLevel(takenDoses, halfLifeData.halfLifeHours);
  const clearance = estimateClearanceTime(takenDoses, halfLifeData.halfLifeHours);
  const lastDose = takenDoses.reduce((latest, dose) => 
    dose.takenAt > latest.takenAt ? dose : latest
  ).takenAt;
  
  return {
    totalDoses: takenDoses.length,
    lastDose,
    currentLevel: absoluteLevel,
    percentOfPeak,
    estimatedClearance: clearance,
    halfLifeHours: halfLifeData.halfLifeHours
  };
};
