

# Hide Boot/Auth Diagnostics from Regular Users

## Problem
The Boot Diagnostics and Login Diagnostics sections in Settings > Help & Support are visible to all users. These are developer-only debugging tools showing raw trace logs that confuse regular users and make the app look unfinished.

## Solution
Gate the diagnostics sections behind the existing developer access system. Only users whose UUIDs are in the `DEVELOPER_USER_IDS` list will see them.

## Technical Details

### File: `src/components/settings/HelpSettings.tsx`

1. Import the developer access check function from `src/utils/developerAccess.ts`
2. Import `useEffect`/`useState` and the Supabase client to get the current user ID
3. Add a state variable `isDeveloper` (default `false`)
4. On mount, check if the current user's UUID is in the developer list
5. Wrap the three diagnostics sections (Boot Diagnostics, Login Diagnostics, and Copy All Diagnostics button) in a conditional render: only show when `isDeveloper` is `true`

Everything else on the Help & Support page (Send Feedback, Contact Support, FAQ, App Version) remains visible to all users.

No database changes needed. No new dependencies. Just a conditional render gate on existing UI.
