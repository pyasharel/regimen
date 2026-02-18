

## Fix: Medication Levels Card Collapsed State Padding

**Problem**: When the Medication Levels card is collapsed on the Today screen, the header row uses `pb-0` bottom padding (designed for when the chart sits below it). With no chart visible, the card border cuts right against the text, making it look broken.

**Solution**: Add conditional bottom padding to the header row based on collapsed state. When collapsed, use `pb-1.5` to match the top padding; when expanded, keep `pb-0` since the chart provides visual spacing below.

### Technical Change

**File**: `src/components/MedicationLevelsCard.tsx` (line 430)

Change the header div's padding from:
```
px-3 pt-1.5 pb-0
```
to:
```
px-3 pt-1.5 ${isCollapsed ? 'pb-1.5' : 'pb-0'}
```

This is a one-line fix using the existing `isCollapsed` state variable that's already available in the component.

