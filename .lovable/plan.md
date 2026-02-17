

## Medication Levels Card: Smart Default + Subtle Selector Styling

### What we're changing

Two focused improvements to the Medication Levels card on the Today screen:

---

### 1. Smart Auto-Default to Compound With Logged Doses

**Problem:** If a user's selected compound has zero logged doses, the card shows "Log doses to track levels" -- but another compound may have plenty of data. Users (like your beta tester) don't realize they can switch.

**Solution:** Add a "no data, switch to one with data" rule that kicks in intelligently:

- If the currently selected compound (whether from saved preference or fallback) has **zero taken doses**, AND another compound with half-life data **does** have taken doses, automatically switch to the one with data.
- When this auto-switch happens, **do not overwrite** the user's saved preference in storage. This way, once they log a dose for their preferred compound, it will naturally stay selected.
- If the user has **manually selected** a compound (explicit tap on the dropdown), that selection is always respected -- even if it has no doses. The auto-switch only applies during the mount/initialization phase.

**Priority logic (updated):**
1. Saved preference -- honored IF it has taken doses
2. Saved preference exists but has no doses -- temporarily show a compound that does have doses (don't overwrite saved preference)
3. No saved preference -- most recently taken dose's compound
4. Alphabetical fallback

---

### 2. Subtle Selector Styling Tweak

**Problem:** The compound dropdown trigger is borderless and transparent, making it nearly invisible. Users with multiple compounds don't realize they can tap to switch.

**Solution:** When multiple compounds exist, add a subtle pill-style background with a faint border to the select trigger. This makes it look tappable without being visually heavy.

- Add `bg-muted/50 border border-border/50 rounded-full` styling to the SelectTrigger (only when multiple compounds)
- Keep the existing hover state
- Single-compound display remains unchanged (no dropdown, no pill)

---

### Technical Details

**File changed:** `src/components/MedicationLevelsCard.tsx`

**Auto-default logic change (lines ~180-223):**
- After resolving the saved preference, check if that compound has any taken doses in the provided `doses` array
- If not, scan `compoundsWithHalfLife` for one that does have taken doses (pick the one with the most recent dose)
- Set that as the display selection but skip writing to localStorage/Preferences
- Add a `isTemporaryDefault` ref to track this state so that if the user manually picks a compound, it saves normally

**Styling change (line ~389):**
- Update the SelectTrigger className to include `bg-muted/50 border border-border/50 rounded-full` instead of `bg-transparent border-none`

