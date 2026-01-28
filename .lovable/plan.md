

# Refinement: Stack Current Level Under "Now" Label

## Current Layout

```
[Activity] Tirzepatide ▼    ~4 mg · t½ 5d    Now  [i]
```

Everything is horizontal, which crowds the right side and makes the medication name feel cramped.

## Proposed Layout

```
[Activity] Tirzepatide ▼                      Now  [i]
                                        ~4 mg · t½ 5d
```

The "Now" label stays as a header with the info icon, and the actual level + half-life display directly below, right-aligned. This:
- Gives the medication dropdown full breathing room on the left
- Creates a clear vertical connection: "Now" → current estimated level
- Keeps the card compact while improving readability

## Technical Changes

**File:** `src/components/MedicationLevelsCard.tsx`

### Restructure the right side from horizontal to vertical stack:

**Current (lines 293-323):**
```jsx
<div className="flex items-center gap-2">
  {currentLevel && (
    <span className="text-xs text-muted-foreground">
      ~{formatLevel(currentLevel.absoluteLevel)} {selectedCompound?.dose_unit}
      {halfLifeData && (
        <span className="text-muted-foreground/70"> · t½ {formatHalfLife(...)}</span>
      )}
    </span>
  )}
  <span className="text-[10px] ... uppercase">Now</span>
  <Popover>...</Popover>
</div>
```

**After:**
```jsx
<div className="flex flex-col items-end gap-0.5">
  {/* Top row: Now label + info icon */}
  <div className="flex items-center gap-1.5">
    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Now</span>
    <Popover>...</Popover>
  </div>
  
  {/* Bottom row: Current level + half-life */}
  {currentLevel && (
    <span className="text-xs text-muted-foreground">
      ~{formatLevel(currentLevel.absoluteLevel)} {selectedCompound?.dose_unit}
      {halfLifeData && (
        <span className="text-muted-foreground/70"> · t½ {formatHalfLife(...)}</span>
      )}
    </span>
  )}
</div>
```

## Visual Result

```
+------------------------------------------------------------------+
|  [Activity] Tirzepatide ▼                              Now  [i]  |
|                                                     ~4 mg · t½ 5d |
|                                                                   |
|  [Y-Axis]  [═══════════════════════●░░░░░░░░░░]                  |
|    4 -                                                            |
|    2 -                                                            |
|    0 -     Jan 21    Jan 24    Jan 27•     Jan 30                |
+------------------------------------------------------------------+
```

## Benefits

| Aspect | Before | After |
|--------|--------|-------|
| Medication name space | Cramped | Full breathing room |
| "Now" visibility | Inline, easy to miss | Clear label header |
| Level + half-life | Squeezed between elements | Clean display under "Now" |
| Visual connection | Scattered | Clear vertical hierarchy |

