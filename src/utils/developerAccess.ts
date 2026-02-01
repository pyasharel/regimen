/**
 * Developer Access Control
 * 
 * Controls access to developer-only features like Subscription Diagnostics.
 * Add authorized Supabase User IDs to the array below.
 */

// Array of Supabase User IDs that have developer access
// Add your UUID here after finding it in the diagnostics modal or boot diagnostics
const DEVELOPER_USER_IDS: string[] = [
  // 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', // Example: Your UUID goes here
];

/**
 * Check if a user has developer access
 * @param userId - The Supabase User ID to check
 * @returns true if the user is a developer, false otherwise
 */
export const isDeveloperUser = (userId: string | null): boolean => {
  if (!userId) return false;
  return DEVELOPER_USER_IDS.includes(userId);
};
