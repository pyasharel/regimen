/**
 * Pluralizes dose units based on the dose amount
 * @param amount - The dose amount
 * @param unit - The unit (singular form)
 * @returns The properly formatted unit (singular or plural)
 */
export const pluralizeDoseUnit = (amount: number, unit: string): string => {
  // Units that should not be pluralized
  const nonPluralUnits = ['mcg', 'mg', 'iu', 'ml'];
  
  // Handle case-insensitive matching but preserve original case for IU
  const lowerUnit = unit.toLowerCase();
  if (nonPluralUnits.includes(lowerUnit)) {
    return unit;
  }
  
  // If amount is 1, return singular
  if (amount === 1) {
    return unit;
  }
  
  // Pluralize by adding 's'
  return `${unit}s`;
};

/**
 * Formats a dose display with amount and unit
 * @param amount - The dose amount
 * @param unit - The unit (singular form)
 * @returns Formatted string like "2 pills" or "250 mcg"
 */
export const formatDose = (amount: number, unit: string): string => {
  return `${amount} ${pluralizeDoseUnit(amount, unit)}`;
};

/**
 * Formats a medication level for display
 * - Rounds to whole numbers for values >= 1 (e.g., 304.33 → 304)
 * - Keeps 2 decimals for small values < 1 (e.g., 0.25 stays 0.25)
 * @param level - The medication level amount
 * @returns Formatted string
 */
export const formatLevel = (level: number): string => {
  return level >= 1 ? Math.round(level).toString() : level.toFixed(2);
};
