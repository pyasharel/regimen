# Memory: features/medication-levels-default-compound-logic
Updated: 2026-02-17

The Medication Levels card default selection logic uses a **smart auto-default** that prioritizes showing data over empty states. Key behaviors:

1. **Selection Persistence**: User's explicit selection (stored in localStorage + Capacitor Preferences as `selectedLevelsCompound`) is always saved. Manual selections clear the `isTemporaryDefault` flag.

2. **Smart Auto-Switch on Mount**: If the saved preference compound has **zero taken doses**, the card temporarily switches to a compound that DOES have logged doses (most recent dose wins). This auto-switch does NOT overwrite the saved preference — so once the user logs a dose for their preferred compound, it naturally stays selected next time.

3. **Mount-Only Initialization**: The selection logic only runs once on component mount (via `useRef` flag), preventing the card from switching compounds when a dose is marked for a different medication.

4. **Default Selection Priority** (on initialization):
   - Saved preference — honored IF it has taken doses
   - Saved preference exists but has no doses — temporarily show compound with doses (don't overwrite saved pref)
   - No saved preference — most recently taken dose's compound
   - Alphabetical fallback if no taken doses exist

5. **Data Fetching**: The query fetches the latest 500 taken doses ordered by `taken_at` descending, with no date filter.

6. **Selector Styling**: When multiple compounds exist, the SelectTrigger uses a subtle pill style (`bg-muted/50 border border-border/40 rounded-full`) to make it visually tappable. Single-compound display has no dropdown.
