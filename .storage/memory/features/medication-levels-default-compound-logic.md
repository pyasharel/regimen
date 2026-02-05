# Memory: features/medication-levels-default-compound-logic
Updated: 2026-02-05

The Medication Levels card default selection logic now **always honors user's saved preference** if the compound still exists with half-life data. Key behaviors:

1. **Selection Persistence**: User's explicit selection (stored in localStorage as `selectedLevelsCompound`) is respected unconditionally - even if that compound has no logged doses. This prevents unwanted auto-switching when marking other medications.

2. **Mount-Only Initialization**: The selection logic only runs once on component mount (via `useRef` flag), preventing the card from switching compounds when a dose is marked for a different medication.

3. **Default Selection Priority** (only when no saved preference):
   - Most recently taken dose's compound (smart default for new users)
   - Alphabetical fallback if no taken doses exist

4. **Data Fetching**: The query fetches the latest 500 taken doses ordered by `taken_at` descending, with no date filter. This ensures even infrequent users see their most recently logged medication as a default.
