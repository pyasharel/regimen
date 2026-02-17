

## Fix Banner Overlap + Trial User Test Setup

### Part 1: Fix Banner Overlapping Header

The banner is `fixed top-0` and the TodayScreen applies `paddingTop: var(--app-banner-height, 0px)` with `--app-banner-height: 56px`. But on iOS, the `.safe-top` class adds the status bar inset on top of the banner's own height, making the total taller than 56px. The header slides under the banner.

**Fix:** Change `--app-banner-height` from a hardcoded `56px` to a value that accounts for the safe area. Since the banner already uses `.safe-top` for the inset, the CSS variable should be `calc(56px + env(safe-area-inset-top, 0px))`. This way, on web it's just 56px, on iOS it adds the notch space.

| File | Change |
|------|--------|
| `src/components/subscription/SubscriptionBanners.tsx` | Change `--app-banner-height` from `'56px'` to `'calc(56px + env(safe-area-inset-top, 0px))'` |

### Part 2: Set Up Trial User for Testing

Update the TestyTester profile (`user_id: 70681d52-53c2-41d4-a147-6848e056993e`) to simulate a 7-day trial:
- `subscription_status` = `'trialing'`
- `trial_start_date` = today
- `trial_end_date` = 7 days from now
- `subscription_start_date` = today

This gives you a live trial account to test all the states.

### Part 3: Test Matrix

After the trial is set up, here's what to test:

| State | How to get there | What to check |
|---|---|---|
| **Free, 0 compounds** | Delete all compounds | Banner: "Free Plan: Track 1 Compound" / "Add your first compound to get started". No lock icons. |
| **Free, 1 compound** | Add one compound | Banner: "Subscribe for unlimited compounds". Dose card: fully interactive, NO lock icon. |
| **Free, 2+ compounds** | Add a second compound | Banner: "Subscribe to track all 2 compounds". Second compound's doses show lock icon. Tapping lock opens paywall. |
| **Trialing, 1 compound** | I'll set your profile to trialing | No free-tier banner. Full access. Push notification scheduled for 2 days later encouraging more compounds. |
| **Trialing, 2+ compounds** | Add more while trialing | No banners, full access, no locks. |
| **Banner dismissed** | Tap the X on the banner | Banner disappears. Content slides up (no gap). Reappears on next session. |
| **Banner overlap** | Check header with banner visible | "Today" and "REGIMEN" should be fully visible below the banner, not covered. |

To cycle through free vs trial states, I'll provide instructions after setting up the trial. You can also use the Dev toggle (bottom right in development mode) to preview different states without changing the database.

### No changes for paid users

Paid users with 1 compound will not receive any encouragement notifications or banners. They made their choice and the app respects it. The "Add Compound" flow is always accessible from the My Stack tab if they want it.

### Technical Details

| File | Change |
|------|--------|
| `src/components/subscription/SubscriptionBanners.tsx` | Update `--app-banner-height` to include safe-area-inset-top |
| Database | Update TestyTester profile to trialing status with 7-day trial window |

