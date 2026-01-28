

# Cleaner Right-Aligned Stats + Timeframe Analysis

## Summary

This plan addresses three things: (1) cleaner vertical layout with chevron on its own at top-right, (2) thinking through the optimal chart timeframe, and (3) reducing bottom padding further.

---

## Layout Redesign

### Current Layout (cluttered)
```text
NOW (i) [▲]      ← All on one line - too busy
~215 mg
t½ ~5d
```

### Proposed Layout (clean vertical stack)
```text
            [▲]  ← Chevron alone at top-right corner
       NOW (i)   ← Label underneath
      ~215 mg    ← Level underneath (keep bolded for emphasis)
        t½ ~5d   ← Half-life at bottom (muted)
```

All elements right-aligned in a clean vertical column. The chevron sits alone at the top-right, making it feel less cluttered.

### Styling Decision

I recommend **keeping the level bolded** (current `font-medium text-foreground`) because:
- It's the most important data point - what users care about most
- The "Now" label and half-life are supporting context (muted)
- Visual hierarchy: Chevron → Label (small) → **Level (emphasis)** → Half-life (subtle)

---

## Chart Timeframe Analysis

### Current: 7 days back + 3 days forward (10-day span)

Let me think through what's genuinely useful for common compounds:

**Testosterone Cypionate (t½ ~5-8 days):**
- Typical dosing: Weekly
- 7 days back shows: One complete injection cycle
- Users can see: Peak after injection → decay curve → where they are now
- **Verdict: 7 days is perfect** - shows exactly one cycle

**Tirzepatide (t½ ~5 days):**
- Typical dosing: Weekly
- 7 days back shows: Full cycle from one injection to next
- Users can see: Absorption curve → peak → decay → current level
- **Verdict: 7 days is appropriate**

**Semaglutide (t½ ~7 days):**
- Typical dosing: Weekly
- 7 days captures one full cycle
- **Verdict: 7 days works well**

**Enanthate esters (t½ ~4-5 days):**
- Typical dosing: Every 3-5 days or weekly
- 7 days shows 1-2 cycles
- **Verdict: 7 days is good**

### Recommendation: Keep 7 days

For the most common use cases (weekly injectables), 7 days is the right window:
- Shows the most recent dose and its full effect
- Shows where you are in your cycle
- 3-day projection helps users understand what happens if they delay

If someone doses every 2 weeks, they'd see half a cycle, which is still useful for understanding current levels.

---

## Padding Reduction

### Current bottom padding
- Chart area: `pb-2` (8px)
- Card margin: `mb-3` (12px)

### Proposed
- Chart area: `pb-1.5` (6px) - minimal but still breathable
- Card margin: `mb-2` (8px) - tighter spacing to doses

This saves ~6px more vertical space.

---

## Technical Implementation

### File: `src/components/MedicationLevelsCard.tsx`

**1. Restructure right column - chevron on own row**

```jsx
{/* Right: Stats column - chevron at top, then vertical stack */}
<div className="flex flex-col items-end gap-0">
  {/* Row 1: Chevron only */}
  <button 
    onClick={toggleCollapsed}
    className="p-0.5 rounded hover:bg-muted transition-colors -mr-0.5"
    aria-label={isCollapsed ? "Expand chart" : "Collapse chart"}
  >
    {isCollapsed ? (
      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
    ) : (
      <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
    )}
  </button>
  
  {/* Row 2: Now label + info icon */}
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
      <PopoverContent ...>
        ...
      </PopoverContent>
    </Popover>
  </div>
  
  {/* Row 3: Current level (emphasized) */}
  {currentLevel && (
    <span className="text-xs font-medium text-foreground">
      ~{formatLevel(currentLevel.absoluteLevel)} {selectedCompound?.dose_unit}
    </span>
  )}
  
  {/* Row 4: Half-life (muted) */}
  {halfLifeData && (
    <span className="text-[10px] text-muted-foreground">
      t½ {formatHalfLife(halfLifeData.halfLifeHours)}
    </span>
  )}
</div>
```

**2. Reduce bottom padding**

```jsx
// Chart area padding
<div className="px-3 pb-1.5">  // Was pb-2

// Card margin  
<div className="mx-4 mb-2 rounded-2xl ...">  // Was mb-3
```

---

## Visual Result

```text
┌─────────────────────────────────────────────────────────┐
│ ┌──────────────────────┐                          [▲]  │
│ │ Activity Compound ▾  │                     NOW (i)   │
│ └──────────────────────┘                     ~215 mg   │
│                                                t½ ~5d   │
│ ┌────────────────────────────────────────────────┐     │
│ │              [CHART - 7 days back]             │     │
│ └────────────────────────────────────────────────┘     │
│ pb-1.5                                                  │
└─────────────────────────────────────────────────────────┘
  mb-2
```

---

## Summary of Changes

| Change | Before | After |
|--------|--------|-------|
| Chevron position | Same row as "Now (i)" | Own row at top-right |
| Level styling | `font-medium text-foreground` | Keep same (emphasized) |
| Chart timeframe | 7 days back | Keep 7 days (optimal for weekly dosing) |
| Chart padding | `pb-2` | `pb-1.5` |
| Card margin | `mb-3` | `mb-2` |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/MedicationLevelsCard.tsx` | Restructure right column, reduce padding |

