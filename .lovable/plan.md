

# Compact Medication Levels Card Layout

## Summary

This plan makes the Medication Levels card more compact by reducing padding, repositioning the chevron tighter in the corner, and reorganizing the stats into a single column aligned to the right.

---

## Current vs Proposed Layout

### Current Layout (from screenshot)
```text
┌─────────────────────────────────────────────────────────┐
│  p-4 padding                                            │
│  ┌──────────────────────┐      NOW (i)       [▲]       │
│  │ Activity Testosterone│      ~36 mg · t½ ~5d         │
│  └──────────────────────┘                              │
│  ┌────────────────────────────────────────────────┐    │
│  │                                                │    │
│  │              [CHART]                           │    │
│  │                                                │    │
│  └────────────────────────────────────────────────┘    │
│  pb-4 padding                                          │
└─────────────────────────────────────────────────────────┘
```

### Proposed Layout (ultra-compact)
```text
┌─────────────────────────────────────────────────────────┐
│ p-3 pt-2                                         [▲]   │ ← Chevron tighter (top-1.5 right-1.5)
│ ┌──────────────────────┐              NOW (i)          │
│ │ Activity Testosterone│              ~36 mg           │ ← Stacked vertically
│ └──────────────────────┘              t½ ~5d           │
│ ┌────────────────────────────────────────────────┐     │
│ │              [CHART]                           │     │
│ └────────────────────────────────────────────────┘     │
│ pb-3 padding                                           │
└─────────────────────────────────────────────────────────┘
```

---

## Technical Changes

### File: `src/components/MedicationLevelsCard.tsx`

**1. Tighter chevron positioning (line ~274-284)**

```jsx
// BEFORE:
<button
  onClick={toggleCollapsed}
  className="absolute top-2 right-2 p-1.5 rounded-lg hover:bg-muted transition-colors z-10"
  ...
>

// AFTER:
<button
  onClick={toggleCollapsed}
  className="absolute top-1.5 right-1.5 p-1 rounded-lg hover:bg-muted transition-colors z-10"
  ...
>
```

**2. Reduce header padding (line ~286)**

```jsx
// BEFORE:
<div className="p-4 pb-2 pr-10">

// AFTER:
<div className="p-3 pt-2 pb-2 pr-8">
```

**3. Reorganize right-side stats to vertical stack (lines ~321-357)**

```jsx
// BEFORE: Two-row layout with horizontal elements
<div className="flex flex-col items-end gap-0.5">
  {/* Top row: Now label + info icon */}
  <div className="flex items-center gap-1.5">
    <span className="text-[10px] ...">Now</span>
    <Popover>...</Popover>
  </div>
  
  {/* Bottom row: Current level + half-life on same line */}
  {currentLevel && (
    <span className="text-xs text-muted-foreground">
      ~{formatLevel(currentLevel.absoluteLevel)} {selectedCompound?.dose_unit}
      {halfLifeData && (
        <span className="text-muted-foreground/70"> · t½ {formatHalfLife(...)}</span>
      )}
    </span>
  )}
</div>

// AFTER: Vertical stack, each on own line
<div className="flex flex-col items-end gap-0">
  {/* Row 1: Now label + info icon */}
  <div className="flex items-center gap-1">
    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Now</span>
    <Popover>
      <PopoverTrigger asChild>
        <button 
          className="p-0.5 rounded-full hover:bg-muted transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <Info className="w-3 h-3 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      ...
    </Popover>
  </div>
  
  {/* Row 2: Current level */}
  {currentLevel && (
    <span className="text-xs font-medium text-foreground">
      ~{formatLevel(currentLevel.absoluteLevel)} {selectedCompound?.dose_unit}
    </span>
  )}
  
  {/* Row 3: Half-life */}
  {halfLifeData && (
    <span className="text-[10px] text-muted-foreground">
      t½ {formatHalfLife(halfLifeData.halfLifeHours)}
    </span>
  )}
</div>
```

**4. Reduce chart area padding (line ~363)**

```jsx
// BEFORE:
<div className="px-4 pb-4">

// AFTER:
<div className="px-3 pb-3">
```

**5. Reduce chart height slightly (line ~368)**

```jsx
// BEFORE:
<div className="h-32 -mx-1">

// AFTER:
<div className="h-28 -mx-1">
```

---

## Visual Comparison

| Element | Before | After | Savings |
|---------|--------|-------|---------|
| Top padding | `p-4` (16px) | `pt-2` (8px) | 8px |
| Bottom padding | `pb-4` (16px) | `pb-3` (12px) | 4px |
| Chart height | 128px | 112px | 16px |
| Chevron position | `top-2 right-2` | `top-1.5 right-1.5` | 2px each |
| Info icon | `w-3.5 h-3.5` | `w-3 h-3` | Subtle |

**Estimated total height reduction: ~28-30px**

---

## Stats Display After Change

The right column will now show:
```text
NOW (i)      ← Label + info popover
~36 mg       ← Current level (emphasized)
t½ ~5d       ← Half-life (subtle)
```

This is cleaner than the current horizontal `~36 mg · t½ ~5d` which runs together.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/MedicationLevelsCard.tsx` | Reduce padding, reposition chevron, vertical stats layout |

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| No current level data | Only show "Now (i)" label |
| No half-life data | Skip t½ line entirely |
| Long compound names | Truncate with ellipsis (existing behavior) |
| Collapsed state | Header remains compact with stats visible |

