import { format as dateFnsFormat, parseISO } from 'date-fns';

/**
 * Safely parses a date string or Date object into a Date object.
 * Returns null if the date is invalid or null/undefined.
 * 
 * @param dateInput - Date string (ISO format: 'YYYY-MM-DD'), Date object, null, or undefined
 * @returns Valid Date object or null
 */
export const safeParseDate = (dateInput: string | Date | null | undefined): Date | null => {
  if (!dateInput) return null;
  
  try {
    // If it's already a Date object, validate it
    if (dateInput instanceof Date) {
      return isNaN(dateInput.getTime()) ? null : dateInput;
    }
    
    // Handle string dates
    const dateStr = dateInput.trim();
    if (dateStr === '' || dateStr === 'null' || dateStr === 'undefined') {
      return null;
    }
    
    // Parse ISO date strings (YYYY-MM-DD)
    // Create date in local timezone to avoid timezone shifts
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return isNaN(date.getTime()) ? null : date;
    }
    
    // Fallback to parseISO for ISO datetime strings
    const date = parseISO(dateStr);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
};

/**
 * Safely formats a date string or Date object using date-fns format.
 * Returns a fallback string if the date is invalid.
 * 
 * @param dateInput - Date string, Date object, null, or undefined
 * @param formatStr - date-fns format string (e.g., 'MMM d, yyyy')
 * @param fallback - String to return if date is invalid (default: 'N/A')
 * @returns Formatted date string or fallback
 */
export const safeFormatDate = (
  dateInput: string | Date | null | undefined,
  formatStr: string,
  fallback: string = 'N/A'
): string => {
  const date = safeParseDate(dateInput);
  if (!date) return fallback;
  
  try {
    return dateFnsFormat(date, formatStr);
  } catch {
    return fallback;
  }
};

/**
 * Safely creates a Date object from a date string (YYYY-MM-DD).
 * Handles timezone issues by creating the date in local timezone.
 * 
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Date object in local timezone or null if invalid
 */
export const createLocalDate = (dateStr: string | null | undefined): Date | null => {
  if (!dateStr) return null;
  
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    if (!year || !month || !day) return null;
    
    const date = new Date(year, month - 1, day);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
};

/**
 * Checks if a date string or Date object is valid.
 * 
 * @param dateInput - Date string, Date object, null, or undefined
 * @returns true if valid date, false otherwise
 */
export const isValidDate = (dateInput: string | Date | null | undefined): boolean => {
  return safeParseDate(dateInput) !== null;
};

/**
 * Formats a date string (YYYY-MM-DD) for display, avoiding timezone issues.
 * 
 * @param dateStr - Date string in YYYY-MM-DD format
 * @param formatStr - date-fns format string
 * @param fallback - String to return if date is invalid
 * @returns Formatted date string or fallback
 */
export const formatLocalDate = (
  dateStr: string | null | undefined,
  formatStr: string,
  fallback: string = 'N/A'
): string => {
  const date = createLocalDate(dateStr);
  if (!date) return fallback;
  
  try {
    return dateFnsFormat(date, formatStr);
  } catch {
    return fallback;
  }
};
