# Memory: features/medication-levels-default-compound-logic
Updated: 2026-01-29

The Medication Levels card default selection logic prioritizes the user's most recently logged dose to ensure the dashboard chart immediately displays relevant data. Key behaviors:

1. **Data Fetching**: The query fetches the latest 500 taken doses ordered by `taken_at` descending, with no date filter. This ensures even infrequent users see their most recently logged medication.

2. **Default Selection Priority**:
   - User's saved preference (from localStorage) - but ONLY if that compound has logged doses in the current dataset
   - If saved preference has no doses, clear it and fall back to most recently taken dose's compound
   - Alphabetical fallback only if no taken doses exist

3. **Persistence**: Manual selections are stored in localStorage (`selectedLevelsCompound`) and honored on subsequent visits, as long as the selected compound has logged data.

4. **Why No Date Filter**: Users who log medications infrequently (e.g., every few weeks) were seeing alphabetical defaults because their recent doses fell outside the previous 30-day window.
