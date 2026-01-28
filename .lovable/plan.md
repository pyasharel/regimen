

# Fix Tap Navigation + Remove Info Icon

## Summary

Two simple changes: (1) fix the broken navigation route, (2) remove the info icon since the tap-through provides full details.

---

## Current Issue

The card navigates to `/compound/${selectedCompoundId}` which doesn't exist. The correct route is `/stack-v2/${selectedCompoundId}` which shows the full compound detail screen with:
- Expandable time ranges (1W, 1M, 3M, 6M)
- Complete dose history
- Cycle status
- Notes and vial info
- Share functionality

---

## Technical Changes

### File: `src/components/MedicationLevelsCard.tsx`

**1. Fix navigation route (line ~284)**

```jsx
// BEFORE:
const handleCardTap = () => {
  if (selectedCompoundId) {
    navigate(`/compound/${selectedCompoundId}`);
  }
};

// AFTER:
const handleCardTap = () => {
  if (selectedCompoundId) {
    navigate(`/stack-v2/${selectedCompoundId}`);
  }
};
```

**2. Remove info icon from stats overlay**

Remove the Popover with info icon from the "Now" row, since tapping the card provides all the context users need.

```jsx
// BEFORE:
<div className="flex items-center gap-1">
  <span className="text-[10px] text-muted-foreground font-medium">Now</span>
  <Popover>
    <PopoverTrigger asChild>
      <button 
        className="p-0.5 rounded-full hover:bg-muted transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        <Info className="w-3 h-3 text-muted-foreground" />
      </button>
    </PopoverTrigger>
    <PopoverContent ...>...</PopoverContent>
  </Popover>
</div>

// AFTER:
<span className="text-[10px] text-muted-foreground font-medium">Now</span>
```

**3. Clean up unused imports**

Remove `Info` from lucide-react imports and remove unused `Popover` components if no longer needed elsewhere.

---

## What Stays the Same

| Element | Status |
|---------|--------|
| Backdrop blur on stats | Keep - provides subtle readability without being noticeable |
| Level styling (`font-medium`) | Keep - appropriate emphasis |
| 4 X-axis date labels | Keep - good density |
| Chart height (h-28) | Keep - balanced compactness |
| 7-day + 3-day timeframe | Keep - optimal for weekly dosing |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/MedicationLevelsCard.tsx` | Fix route path, remove info icon + Popover |

