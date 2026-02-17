

## Fix Free Tier Banner: Count Bug, Overlap, Messaging

### 1. Fix Stale Compound Count

The banner showed "6 compounds" for a user with 0. The `SubscriptionBanners` component fetches compound count via `getUserIdWithFallback` which can return a cached/stale user ID. Fix: reset `compoundCount` to 0 when query returns empty data, and ensure the fetch re-runs on auth changes.

### 2. Fix Banner Overlapping Header

The banner is `fixed top-0` with `--app-banner-height: 56px`, but the TodayScreen container doesn't account for this. Fix: apply `padding-top: var(--app-banner-height)` to the TodayScreen's outermost container so content shifts below the banner. When dismissed, padding resets to 0.

### 3. Tighten Messaging (No Em Dashes, No "Reminders")

**Title:** "Free Plan: Track 1 Compound" (colon replaces em dash)

**Subtitles (after tappable "Subscribe" link):**
- 0 compounds: "Add your first compound to get started"
- 1 compound: "for unlimited compounds"
- 2+ compounds: "to track all X compounds"

No mention of reminders. "Track" covers the full experience. Each subtitle fits on one line.

### 4. Edge Case Review

| Scenario | Banner shown? | Dose logging | Notes |
|----------|--------------|--------------|-------|
| Subscribed (active/trialing) | No | All compounds | Completely unaffected |
| 0 compounds, not subscribed | Yes, "Add your first compound" | N/A | No doses to log |
| 1 compound, not subscribed | Yes, "for unlimited compounds" | Allowed (free compound) | Full access to their one compound |
| 2+ compounds, not subscribed | Yes, "to track all X compounds" | Only oldest compound | Others show lock icon, tap opens paywall |
| Past due | Past due banner instead | All compounds (grace period) | Existing behavior, unchanged |
| Canceled with days remaining | Canceled banner instead | All compounds until expiry | Existing behavior, unchanged |
| Banner dismissed | No | Unchanged | Session-scoped dismissal |
| Paywall open | No | N/A | Banner hides when paywall is visible |

No changes affect paid or trialing users. The restriction logic only activates when `subscriptionStatus` is `preview` or `none`.

### Technical Details

| File | Change |
|------|--------|
| `src/components/PreviewModeBanner.tsx` | Replace em dash with colon in title. Remove em dash from subtitle. Update subtitle copy for all 3 states (no "reminders"). |
| `src/components/subscription/SubscriptionBanners.tsx` | Reset `compoundCount` to 0 on empty data. Adjust `--app-banner-height` to match actual banner height. |
| `src/components/TodayScreen.tsx` | Add `paddingTop: var(--app-banner-height)` to the outermost container so content pushes below the fixed banner. |

