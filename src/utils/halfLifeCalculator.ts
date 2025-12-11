/**
 * Half-life calculation utilities with absorption modeling
 * 
 * Calculates estimated medication levels based on actual taken doses
 * using a one-compartment pharmacokinetic model with first-order absorption:
 * 
 * C(t) = (ka * Dose / (ka - ke)) * (e^(-ke*t) - e^(-ka*t))
 * 
 * Where:
 * - ka = absorption rate constant
 * - ke = elimination rate constant (ln(2) / halfLife)
 * - t = time since dose
 * 
 * This creates a realistic curve that:
 * 1. Starts at 0 at dose time
 * 2. Rises gradually to peak at Tmax
 * 3. Then decays exponentially
 */

import { getHalfLifeData, getTmax } from './halfLifeData';

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
  isFuture?: boolean; // Whether this data point is a future projection
}

/**
 * Calculate the level of a single dose at a given time using absorption + elimination model
 * Uses the Bateman equation for first-order absorption and elimination
 */
const calculateDoseLevel = (
  initialAmount: number,
  halfLifeHours: number,
  tMaxHours: number,
  hoursElapsed: number
): number => {
  if (hoursElapsed < 0) return 0; // Dose hasn't been taken yet
  if (hoursElapsed === 0) return 0; // At dose time, level is 0 (not yet absorbed)
  
  // Elimination rate constant
  const ke = Math.LN2 / halfLifeHours;
  
  // Calculate absorption rate constant (ka) from Tmax
  // Using a more accurate approximation that accounts for the Bateman equation relationship
  // Lower ka values create smoother absorption curves (more gradual rise to peak)
  // For GLP-1s with long half-lives and Tmax values, we need gentler absorption
  // ka ≈ 1.8 / Tmax provides a better fit for weekly injectables
  const ka = Math.max(ke * 2.5, 1.8 / tMaxHours); // Ensure ka > ke for proper absorption
  
  // Handle edge case where ka ≈ ke (would cause division by zero)
  if (Math.abs(ka - ke) < 0.0001) {
    // Use simplified model: linear rise then exponential decay
    if (hoursElapsed <= tMaxHours) {
      return initialAmount * (hoursElapsed / tMaxHours);
    }
    return initialAmount * Math.exp(-ke * (hoursElapsed - tMaxHours));
  }
  
  // Bateman equation: C(t) = (ka * F * Dose / (ka - ke)) * (e^(-ke*t) - e^(-ka*t))
  // F (bioavailability) assumed to be 1
  const scaleFactor = ka / (ka - ke);
  const level = initialAmount * scaleFactor * (Math.exp(-ke * hoursElapsed) - Math.exp(-ka * hoursElapsed));
  
  // Normalize to ensure peak is at initialAmount
  // Calculate the theoretical peak level
  const tPeak = Math.log(ka / ke) / (ka - ke);
  const peakLevel = initialAmount * scaleFactor * (Math.exp(-ke * tPeak) - Math.exp(-ka * tPeak));
  
  // Scale so that peak = initialAmount
  if (peakLevel > 0) {
    return (level / peakLevel) * initialAmount;
  }
  
  return Math.max(0, level);
};

/**
 * Calculate total medication level at a specific time from all doses
 */
const calculateLevelAtTime = (
  doses: TakenDose[],
  halfLifeHours: number,
  tMaxHours: number,
  timestamp: Date
): number => {
  let totalLevel = 0;
  for (const dose of doses) {
    const hoursElapsed = (timestamp.getTime() - dose.takenAt.getTime()) / (1000 * 60 * 60);
    if (hoursElapsed >= 0) {
      totalLevel += calculateDoseLevel(dose.amount, halfLifeHours, tMaxHours, hoursElapsed);
    }
  }
  return totalLevel;
};

/**
 * Calculate medication levels over time based on actual taken doses
 * 
 * @param doses - Array of taken doses with timestamps
 * @param halfLifeHours - Half-life of the medication in hours
 * @param startDate - Start of the calculation period
 * @param endDate - End of the calculation period
 * @param pointsPerDay - Number of data points per day (default 4 for 6-hour intervals)
 * @param includeFuture - Whether to include future projections until clearance
 * @param tMaxHours - Time to reach peak concentration (optional, defaults to estimate)
 */
export const calculateMedicationLevels = (
  doses: TakenDose[],
  halfLifeHours: number,
  startDate: Date,
  endDate: Date,
  pointsPerDay: number = 4,
  includeFuture: boolean = false,
  tMaxHours?: number
): MedicationLevel[] => {
  if (doses.length === 0) return [];

  // Use provided tMax or estimate based on half-life (roughly 15% of half-life, min 1 hour)
  const effectiveTmax = tMaxHours ?? Math.max(1, halfLifeHours * 0.15);

  const now = new Date();
  const timestamps: Set<number> = new Set();
  const intervalHours = 24 / pointsPerDay;
  
  // Determine actual end date - if includeFuture, extend to clearance time
  let actualEndDate = endDate;
  if (includeFuture && doses.length > 0) {
    const clearanceTime = estimateClearanceTime(doses, halfLifeHours);
    if (clearanceTime && clearanceTime > endDate) {
      actualEndDate = clearanceTime;
    }
  }
  
  // Generate regular interval timestamps
  let currentTime = new Date(startDate);
  while (currentTime <= actualEndDate) {
    timestamps.add(currentTime.getTime());
    currentTime = new Date(currentTime.getTime() + intervalHours * 60 * 60 * 1000);
  }
  
  // Add timestamps at exact dose times and around peak for smoother absorption curves
  for (const dose of doses) {
    const doseTime = dose.takenAt.getTime();
    if (doseTime >= startDate.getTime() && doseTime <= actualEndDate.getTime()) {
      // Add point just before dose (1 minute before)
      timestamps.add(doseTime - 60000);
      // Add point at dose time (start of absorption)
      timestamps.add(doseTime);
      // Add points during absorption phase for smooth curve
      const tMaxMs = effectiveTmax * 60 * 60 * 1000;
      timestamps.add(doseTime + tMaxMs * 0.1);   // 10% to Tmax
      timestamps.add(doseTime + tMaxMs * 0.25);  // 25% to Tmax
      timestamps.add(doseTime + tMaxMs * 0.5);   // 50% to Tmax
      timestamps.add(doseTime + tMaxMs * 0.75);  // 75% to Tmax
      timestamps.add(doseTime + tMaxMs);          // At Tmax (peak)
      timestamps.add(doseTime + tMaxMs * 1.25);  // 25% past peak
      timestamps.add(doseTime + tMaxMs * 1.5);   // 50% past peak
      timestamps.add(doseTime + tMaxMs * 2);     // 2x Tmax
      // Add points at intervals after peak for decay curve
      timestamps.add(doseTime + 7200000);   // 2 hours
      timestamps.add(doseTime + 14400000);  // 4 hours
      timestamps.add(doseTime + 28800000);  // 8 hours
      timestamps.add(doseTime + 43200000);  // 12 hours
      timestamps.add(doseTime + 86400000);  // 24 hours
    }
  }
  
  // Add current time marker if within range
  if (now.getTime() >= startDate.getTime() && now.getTime() <= actualEndDate.getTime()) {
    timestamps.add(now.getTime());
  }
  
  // Sort timestamps and calculate levels
  const sortedTimestamps = Array.from(timestamps).sort((a, b) => a - b);
  
  const levels: MedicationLevel[] = sortedTimestamps.map(ts => {
    const timestamp = new Date(ts);
    const absoluteLevel = calculateLevelAtTime(doses, halfLifeHours, effectiveTmax, timestamp);
    return {
      timestamp,
      level: 0, // Will be calculated as percentage below
      absoluteLevel,
      isFuture: timestamp > now
    };
  });
  
  // Calculate percentage levels (relative to max)
  const maxLevel = Math.max(...levels.map(l => l.absoluteLevel), 0.001);
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
  halfLifeHours: number,
  tMaxHours?: number
): { level: number; absoluteLevel: number; percentOfPeak: number } => {
  const now = new Date();
  
  // Use provided tMax or estimate
  const effectiveTmax = tMaxHours ?? Math.max(1, halfLifeHours * 0.15);
  
  let totalLevel = 0;
  
  for (const dose of doses) {
    const hoursElapsed = (now.getTime() - dose.takenAt.getTime()) / (1000 * 60 * 60);
    if (hoursElapsed >= 0) {
      totalLevel += calculateDoseLevel(dose.amount, halfLifeHours, effectiveTmax, hoursElapsed);
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
  tMaxHours: number | null;
} | null => {
  const halfLifeData = getHalfLifeData(medicationName);
  if (!halfLifeData || doses.length === 0) return null;
  
  const takenDoses = doses.filter(d => d.takenAt);
  if (takenDoses.length === 0) return null;
  
  const tMaxHours = getTmax(halfLifeData);
  const { absoluteLevel, percentOfPeak } = calculateCurrentLevel(takenDoses, halfLifeData.halfLifeHours, tMaxHours);
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
    halfLifeHours: halfLifeData.halfLifeHours,
    tMaxHours
  };
};
