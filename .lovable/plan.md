
# Medication Levels Card — Tooltip & Animation Fixes

Two targeted fixes to the MedicationLevelsCard on the Today screen, based on Jay's feedback.

---

## Fix 1: Tooltip only shows on touch/hover

Right now the `<Tooltip>` component in Recharts renders a floating info box that appears to be persistently visible (or appears on load). Jay's request is correct: it should only appear when the user is actively touching/dragging their finger across the chart, and disappear the moment they lift their finger.

**What changes:**
- Add `defaultIndex={undefined}` and ensure no forced active state on the Recharts `<Tooltip>`
- The tooltip content itself (the popover box) stays exactly the same — it's already well-designed
- On mobile, Recharts handles touch-start/touch-end natively, so the tooltip will appear on press and disappear on release — no custom touch handling needed

This is a one-line change on the `<Tooltip>` component: remove any `defaultIndex` or forced active props, and optionally add `trigger="click"` behavior or just let the default touch behavior handle it cleanly.

---

## Fix 2: Reduce the pulsing glow animation

The `<ReferenceDot>` that marks "Now" on the chart has an `<animate>` child that pulses opacity from 1 → 0.7 → 1 every 2 seconds indefinitely. Jay flagged this as distracting.

**What changes:**
- Slow the animation from `dur="2s"` to `dur="3s"` and narrow the range from `1;0.7;1` to `1;0.85;1` — still subtly alive but no longer eye-catching
- Alternatively, remove the `<animate>` entirely and keep the glow filter as a static visual — simpler and cleaner

The plan is to make it barely perceptible: a very slow, gentle breathe rather than a noticeable pulse.

---

## Fix 3 (Jay's bonus idea): Sync active chart point to selected calendar date

Jay suggested: "default the point on the graph to the date that's selected — when I'm changing dates I'll see the point move along the line and correlate with the selected date."

This is a meaningful UX improvement. The Today screen already has a selected date (the week calendar picker at the top). Currently the chart is completely disconnected from whatever date the user has selected.

**What changes:**
- Accept a `selectedDate` prop in `MedicationLevelsCard` (passed down from `TodayScreen`)
- When `selectedDate` changes, find the closest chart data point to that date and show a secondary highlight dot at that position
- The tooltip would show the level value for that date (without requiring a touch)
- The "Now" dot stays as-is (marking real current time) — the selected-date dot is a second visual marker in a slightly different style (e.g., hollow/outlined vs. filled)

**Scope note:** This fix is slightly more involved because it requires reading the selected date from TodayScreen and piping it through as a prop. It's doable but is a separate change from Fixes 1 and 2. The plan is to implement Fixes 1 and 2 now (which are clean and low-risk), and implement Fix 3 as a follow-up if you want it.

---

## Files to change

- **Edit** `src/components/MedicationLevelsCard.tsx`:
  - Tooltip: remove any persistent/default active state so it only appears on touch
  - Animation: slow the `<animate>` pulse significantly (3-4s duration, tighter opacity range)

---

## Technical notes

- Recharts `<Tooltip>` on touch devices: by default it shows on touchstart and hides on touchend — if it's currently staying visible, it may be because the chart is inside a `cursor-pointer` div that intercepts the touch event. The fix is to ensure touch events propagate correctly to Recharts.
- No data fetching changes, no auth changes, no routing changes
- No effect on the compound-selection logic or collapsible state
- Fix 3 (date sync) would require a new prop `selectedDate?: Date` on MedicationLevelsCard and a corresponding pass-through in TodayScreen — clean and non-breaking but left as optional follow-up
