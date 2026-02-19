
# Fix: 3 Bugs from Jay's Feedback

## Bug Summary

Jay identified 3 separate issues:

1. **TB-500 duplicate** — appears twice on Today screen (8:00 AM untaken + 9:00 AM taken)
2. **Testosterone on wrong day** — appears on Feb 19 (Thursday) when it should be Feb 20 (Friday). Jay is in Australia (UTC+11), so this is a timezone bug.
3. **Swipe navigation not visual** — gesture works but the screen just swaps instantly instead of sliding with the finger

---

## Bug 1: TB-500 Duplicate

**Root cause:** In `doseRegeneration.ts`, when regenerating doses for today, the system checks `existingTodayTimes` (a Set of `scheduled_time` strings) to avoid inserting duplicates. But if the compound's time was previously changed — for example from 8:00 AM to 9:00 AM — the old 8:00 AM slot may still exist in the database (taken or not) while a new regeneration adds a fresh 8:00 AM dose, creating two entries.

**Fix:** Add a deduplication guard in `TodayScreen.tsx` when loading doses. For the same compound, if there are multiple untaken doses on the same date, only display one (prefer the one matching the compound's current schedule). Also tighten the regeneration logic in `doseRegeneration.ts` to check by `compound_id + date` (not just time) before inserting today's doses.

**File:** `src/utils/doseRegeneration.ts` + `src/components/TodayScreen.tsx`

---

## Bug 2: Testosterone Enanthate on Wrong Day (Timezone)

**Root cause:** In `doseRegeneration.ts` line 332:
```js
scheduled_date: date.toISOString().split('T')[0]
```
`toISOString()` converts to UTC. Jay is in Australia (AEST = UTC+11), so a local Thursday midnight is Wednesday 1 PM UTC — which produces the previous day's date string.

This is the same pattern already fixed in `TodayScreen.tsx` which uses:
```js
const year = selectedDate.getFullYear();
const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
const day = String(selectedDate.getDate()).padStart(2, '0');
```

**Fix:** Replace `date.toISOString().split('T')[0]` with local date formatting in `generateDoses()` in `doseRegeneration.ts`.

**File:** `src/utils/doseRegeneration.ts`

---

## Bug 3: Swipe Navigation — No Visual Slide

**Root cause:** `useSwipeBack` tracks `translateX` state and the `SwipeBackOverlay` shows a subtle glow/chevron effect, but the actual page content never moves. React Router's `navigate(-1)` fires immediately, causing an instant screen swap with no slide animation.

Jay's expectation (correct for iOS): the view physically follows the finger as you drag, then when you release past the threshold, it slides off to the right before the new screen appears.

**Fix:** Update `useSwipeBack` to expose `translateX` and `active` state, then apply a `transform: translateX()` CSS property to the page's outer wrapper div in screens that use swipe-back. On release:
- If threshold met: animate `translateX` to `100vw` (slide off screen), then call `navigate(-1)` after the animation completes (~200ms)
- If threshold not met: animate `translateX` back to `0` (snap back)

This gives the full native-feeling physical slide behavior Jay described.

**Files:** `src/hooks/useSwipeBack.ts`, and the screens that use it: `CompoundDetailScreen.tsx`, `AddCompoundScreen.tsx`, `PhotoCompareScreen.tsx`, and all settings sub-screens (`AccountSettings.tsx`, `DataSettings.tsx`, `DisplaySettings.tsx`, `HelpSettings.tsx`, `NotificationsSettings.tsx`, `PrivacySettings.tsx`, `TermsSettings.tsx`)

The simplest way to do this without touching every screen: create a `<SwipeBackContainer>` wrapper component that handles the transform and transition internally, then wrap the root `<div>` in each screen with it.

---

## Technical Plan

### Files to Change

| File | Change |
|------|--------|
| `src/utils/doseRegeneration.ts` | Fix UTC date bug; tighten today-dose dedup |
| `src/components/TodayScreen.tsx` | Add client-side dedup for doses by compound_id |
| `src/hooks/useSwipeBack.ts` | Add animate-then-navigate logic; expose isAnimatingOut |
| `src/components/ui/SwipeBackContainer.tsx` | New wrapper component that applies translateX transform |
| `src/components/CompoundDetailScreen.tsx` | Wrap with SwipeBackContainer |
| `src/components/AddCompoundScreen.tsx` | Wrap with SwipeBackContainer |
| `src/components/PhotoCompareScreen.tsx` | Wrap with SwipeBackContainer |
| `src/components/settings/AccountSettings.tsx` | Wrap with SwipeBackContainer |
| `src/components/settings/DataSettings.tsx` | Wrap with SwipeBackContainer |
| `src/components/settings/DisplaySettings.tsx` | Wrap with SwipeBackContainer |
| `src/components/settings/HelpSettings.tsx` | Wrap with SwipeBackContainer |
| `src/components/settings/NotificationsSettings.tsx` | Wrap with SwipeBackContainer |
| `src/components/settings/PrivacySettings.tsx` | Wrap with SwipeBackContainer |
| `src/components/settings/TermsSettings.tsx` | Wrap with SwipeBackContainer |

### SwipeBackContainer behavior

```text
touchstart (left edge)
  → track startX

touchmove
  → translateX follows finger (no transition)
  → page physically slides right

touchend
  if translateX >= 80px:
    → CSS transition: translateX → 100vw (200ms ease-out)
    → wait 200ms
    → navigate(-1)
  else:
    → CSS transition: translateX → 0 (150ms ease-out)
    → snap back
```

The `ImpactStyle.Medium` haptic fires at the threshold moment (when the swipe commits), which is more natural than firing on release.
