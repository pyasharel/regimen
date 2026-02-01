
# Plan: Gate Subscription Diagnostics to Developer Only

## Overview

Restrict the Subscription Diagnostics modal so only designated developer accounts can access it. The implementation will use a placeholder array that can be updated with the developer UUID later.

---

## Implementation Approach

### Create Developer Check Utility

Create a new utility file `src/utils/developerAccess.ts` with:

```text
// Array of Supabase User IDs that have developer access
// Add your UUID here after finding it in the diagnostics modal
const DEVELOPER_USER_IDS: string[] = [
  // 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', // Example: Your UUID goes here
];

export const isDeveloperUser = (userId: string | null): boolean => {
  if (!userId) return false;
  return DEVELOPER_USER_IDS.includes(userId);
};
```

### Modify SettingsScreen.tsx

Update the long-press handler to check developer status before enabling the diagnostics modal:

1. Import the new utility and get the current user ID
2. Only set `showSubscriptionDiagnostics(true)` if `isDeveloperUser(userId)` returns true
3. For non-developers, the long-press does nothing (no visual feedback that the feature exists)

---

## File Changes

| File | Change |
|------|--------|
| `src/utils/developerAccess.ts` | **New file** - Developer UUID list and check function |
| `src/components/SettingsScreen.tsx` | Gate diagnostics trigger behind developer check |

---

## Security Considerations

- The developer UUID list is in client-side code, but this is acceptable because:
  - UUIDs are not secret credentials
  - The diagnostic data itself isn't exploitable
  - This just prevents accidental discovery by regular users
- For truly sensitive admin features, server-side checks would be required

---

## Future Update

When you have your UUID:
1. Share it with me
2. I'll add it to `DEVELOPER_USER_IDS` array
3. The diagnostics will then work for your account only

---

## Testing

After implementation:
1. Regular users who long-press the version number will see nothing happen
2. Once your UUID is added, you'll regain access to the diagnostics modal
