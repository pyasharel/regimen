

# Auto-Switch Medication Levels on Dose Check

## Summary
When you mark a dose as taken on the Today screen, the Medication Levels card automatically switches to show that medication's chart -- giving you instant visual feedback of your updated levels.

## How It Will Work
1. You tap the checkmark on a dose card
2. The Medication Levels card scrolls into view (if collapsed, it auto-expands)
3. The compound selector switches to show that medication's half-life chart
4. The chart reflects the dose you just logged in real time

If the compound doesn't have half-life data (e.g., a custom medication), nothing changes -- the card stays on whatever was selected before.

## Edge Cases Covered
- **Compound without half-life data**: No switch happens
- **Unchecking a dose**: No switch (only triggers when marking as taken)
- **Rapid tapping multiple doses**: Last one wins naturally
- **Same compound tapped twice**: Chart updates data in place, no jarring switch
- **Card is collapsed**: Auto-expands so you see the update
- **Single compound only**: Data updates in place, no selector needed
- **As-needed doses**: Same behavior after new dose record is created
- **Dose deletion via menu**: No switch triggered

## Technical Details

### TodayScreen.tsx
- Add a `levelsCompoundOverride` state variable
- In `toggleDose`, when a dose is marked as taken (not unchecked), set this state to the compound's ID
- Pass it as a prop to `MedicationLevelsCard`

### MedicationLevelsCard.tsx
- Accept a new optional prop `switchToCompoundId?: string | null`
- Add a `useEffect` watching this prop: when it changes to a valid compound ID that exists in `compoundsWithHalfLife`, call the existing `handleCompoundChange` internally
- Auto-expand (set `isCollapsed` to false) if the card is collapsed
- No changes to the chart rendering logic itself

### Risk Assessment
- **Low risk**: Builds on top of existing, battle-tested `dosesForLevels` real-time updates and `handleCompoundChange` logic
- **No database changes** needed
- **No new network calls**
- **No changes to dose logging logic** -- only adds a UI selection change after the existing flow completes

