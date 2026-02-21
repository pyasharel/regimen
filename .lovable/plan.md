

## Move Streak Badge to Header Bar

### What Changes
Move the streak badge (flame icon + number) from the greeting row up into the top header bar, positioned to the right of the "REGIMEN" wordmark. This frees the greeting line to use the full screen width for the name.

### Layout Before
```text
[Today]        REGIMEN         [        ]
[Good afternoon, Nicho...]  [sun]  [fire 3]
```

### Layout After
```text
[Today]        REGIMEN        [fire 3]
[Good afternoon, Nicholas]  [sun]
```

### Why This Works
- The MainHeader component already has a `rightSlot` prop designed for exactly this
- The greeting row gets the full width, so names never truncate
- The streak badge gets a permanent, prominent spot in the header
- No font-size tricks or two-line layouts needed

### Grammar Fix
Add comma after the greeting: "Good afternoon, Nicholas" (already correct in code, no change needed).

---

### Technical Details

**File: `src/components/TodayScreen.tsx`**

1. Pass the StreakBadge as the `rightSlot` to MainHeader:
   - Change `<MainHeader title="Today" />` to `<MainHeader title="Today" rightSlot={<StreakBadge />} />`

2. Remove `<StreakBadge />` from the greeting row (line 1516)

3. Remove the `truncate` class from the greeting h2 since overflow is no longer a concern

4. The greeting row simplifies to just the text + sun icon without needing `justify-between` or `gap` for the badge

