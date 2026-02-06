

# Fix Duplicate Medication Display Issue

## Problem Summary
Your beta tester Jam is seeing two "Testosterone Enanthate" entries on their Today screen because they have an old, inactive compound with orphan doses that weren't cleaned up when it was deactivated.

## Root Cause Analysis

**What happened:**
1. Jam originally created "Testosterone Enanthate" back in December 2025 (50mg dose)
2. At some point, this compound was marked inactive (either via "Mark Complete" or soft delete)
3. When a compound is marked inactive, the current code preserves historical doses but **doesn't delete future untaken doses**
4. Jam then created a new "Testosterone Enanthate" compound in January 2026 (44mg dose)
5. Both compounds have scheduled doses for Feb 6, 2026 at 8:00 AM

**Why the filtering failed:**
The TodayScreen correctly filters out doses from inactive compounds (line 550: `if (d.compounds?.is_active === false)`), but on certain Android devices with network latency or cache issues, the compound relationship data may not populate properly in the query result. When `d.compounds` is `undefined` (not `null`), the check `d.compounds?.is_active === false` evaluates to `undefined === false` which is `false`, so the dose passes through.

## The Fix (Two Parts)

### Part 1: Immediate Data Fix for Jam
Delete the 9 orphan doses from the inactive compound. This will immediately resolve their issue.

```sql
-- Delete future untaken doses from the inactive Testosterone Enanthate compound
DELETE FROM doses 
WHERE compound_id = 'c26a10b4-668e-4847-805a-1c61b9522c0f'
  AND taken = false 
  AND skipped = false 
  AND scheduled_date >= '2026-02-06';
```

### Part 2: Code Fixes to Prevent This

#### Fix 2a: More Defensive Filtering in TodayScreen
Update the filtering logic to also filter out doses where the compound join failed or returned undefined.

**File:** `src/components/TodayScreen.tsx` (lines 543-552)

```typescript
// BEFORE
if (d.taken || d.skipped) {
  return true;
}
if (d.compounds?.is_active === false) {
  return false;
}

// AFTER
if (d.taken || d.skipped) {
  return true;
}
// Filter out if compound data is missing (join failed) or compound is inactive
if (!d.compounds || d.compounds.is_active === false) {
  return false;
}
```

#### Fix 2b: Clean Up Orphan Doses When Compound is Deactivated
Add orphan dose cleanup to both deactivation paths.

**File:** `src/components/MyStackScreen.tsx` (`markComplete` function)

```typescript
const markComplete = async (id: string) => {
  try {
    // Mark compound inactive
    const { error } = await supabase
      .from('compounds')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;

    // NEW: Delete future untaken doses to prevent orphans
    const todayStr = new Date().toISOString().split('T')[0];
    await supabase
      .from('doses')
      .delete()
      .eq('compound_id', id)
      .eq('taken', false)
      .eq('skipped', false)
      .gte('scheduled_date', todayStr);

    toast({...});
    await loadCompounds();
  } catch (error) {...}
};
```

**File:** `src/components/AddCompoundScreen.tsx` (`handleDelete` function)
Add the same orphan cleanup after setting `is_active: false`.

#### Fix 2c: Add Cleanup Function for All Users
Create a one-time cleanup function to fix any existing orphan doses.

**File:** `src/utils/doseCleanup.ts` (add new function)

```typescript
export const cleanupOrphanDosesFromInactiveCompounds = async (userId: string): Promise<number> => {
  const todayStr = new Date().toISOString().split('T')[0];
  
  // Get all inactive compound IDs for this user
  const { data: inactiveCompounds } = await supabase
    .from('compounds')
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', false);
  
  if (!inactiveCompounds?.length) return 0;
  
  const inactiveIds = inactiveCompounds.map(c => c.id);
  
  // Delete future untaken doses from inactive compounds
  const { data, error } = await supabase
    .from('doses')
    .delete()
    .in('compound_id', inactiveIds)
    .eq('taken', false)
    .eq('skipped', false)
    .gte('scheduled_date', todayStr)
    .select('id');
  
  return data?.length || 0;
};
```

## Files to Modify

| File | Change |
|------|--------|
| `src/components/TodayScreen.tsx` | Add null check for compound join |
| `src/components/MyStackScreen.tsx` | Add orphan dose cleanup on deactivation |
| `src/components/AddCompoundScreen.tsx` | Add orphan dose cleanup on soft delete |
| `src/utils/doseCleanup.ts` | Add function to clean orphans from inactive compounds |
| Database | Execute one-time cleanup for Jam's account |

## Impact

- **Jam's immediate issue**: Resolved by database cleanup
- **Future users**: Protected by the defensive filtering and proactive cleanup
- **Existing users with orphans**: Can be cleaned up via the new utility function (could be triggered on app boot or in settings)

## What to Tell Your Beta Tester

> "Found the issue! You had an old Testosterone Enanthate entry from December that was marked inactive but still had future doses in the database. I've cleaned those up now so you should only see one entry. If you force-close and reopen the app, it should be fixed. I'm also adding code to prevent this from happening to anyone else."

