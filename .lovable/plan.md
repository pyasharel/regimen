

# Ultra-Compact Medication Levels Card - Final Refinements

## Summary

This plan addresses three refinements: (1) repositioning stats directly under the chevron for cleaner right-alignment, (2) reducing padding further for a tighter card, and (3) verifying the chart timeframe shows exactly 7 days back + 3 days forward.

---

## Layout Changes

### Current Layout
```text
┌───────────────────────────────────────────────────────────┐
│ pt-2                                                 [▲]  │
│ ┌──────────────────────┐               NOW (i)            │
│ │ Activity Compound ▾  │               ~215 mg            │
│ └──────────────────────┘               t½ ~5d             │
│ pb-2                                                      │
└───────────────────────────────────────────────────────────┘
```

### Proposed Layout
```text
┌───────────────────────────────────────────────────────────┐
│ pt-1.5                                       NOW (i) [▲]  │ ← Stats + chevron same row
│ ┌──────────────────────┐                     ~215 mg      │
│ │ Activity Compound ▾  │                     t½ ~5d       │
│ └──────────────────────┘                                  │
│ pb-1.5                                                    │
└───────────────────────────────────────────────────────────┘
```

Key changes:
- "Now (i)" moves to same line as chevron (top-right corner)
- Stats stack underneath: level → half-life
- Tighter vertical padding throughout

---

## Technical Implementation

### File: `src/components/MedicationLevelsCard.tsx`

**1. Remove absolute chevron, integrate into header row**

The chevron will move from absolute positioning into the right-side flex column, appearing on the same line as "Now (i)".

```jsx
// BEFORE: Separate absolute-positioned chevron
<button className="absolute top-1.5 right-1.5 p-1 ...">
  {isCollapsed ? <ChevronDown /> : <ChevronUp />}
</button>

// AFTER: Integrated into stats column
// (Remove the absolute button entirely)
```

**2. Restructure header to single row with integrated chevron**

```jsx
<div className="p-3 pt-1.5 pb-1.5">
  <div className="flex items-start justify-between">
    {/* Left: Compound selector */}
    <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
      {/* ... existing Select component ... */}
    </div>
    
    {/* Right: Stats column with chevron on first row */}
    <div className="flex flex-col items-end gap-0">
      {/* Row 1: Now label + info icon + chevron */}
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Now</span>
        <Popover>...</Popover>
        <button 
          onClick={toggleCollapsed}
          className="p-0.5 rounded hover:bg-muted transition-colors"
        >
          {isCollapsed ? (
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </button>
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
  </div>
</div>
```

**3. Reduce padding throughout**

| Element | Before | After |
|---------|--------|-------|
| Header top | `pt-2` (8px) | `pt-1.5` (6px) |
| Header bottom | `pb-2` (8px) | `pb-1.5` (6px) |
| Header right | `pr-8` (32px) | `pr-3` (12px) - no longer needs space for absolute chevron |
| Card margin | `mb-4` (16px) | `mb-3` (12px) |
| Chart padding bottom | `pb-3` (12px) | `pb-2` (8px) |

**4. Chart timeframe verification**

The code at lines 196-198 already specifies 7 days + 3 days:
```javascript
const startDate = subDays(now, 7);
const endDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days ahead
```

The issue is that the X-axis `interval="preserveStartEnd"` shows ALL data points, and with 24 points per day × 10 days = 240 points, it displays too many date labels. I'll update the interval to show fewer labels (every ~2-3 days) for clarity.

```jsx
// BEFORE:
<XAxis 
  dataKey="date" 
  interval="preserveStartEnd"
  ...
/>

// AFTER: Show ~4 labels across the 10-day span
<XAxis 
  dataKey="date" 
  interval={Math.floor(chartData.length / 4)}
  ...
/>
```

---

## Height Savings

| Element | Before | After | Savings |
|---------|--------|-------|---------|
| Top padding | 8px | 6px | 2px |
| Bottom padding | 8px | 6px | 2px |
| Right padding | 32px | 12px | (width only) |
| Card margin | 16px | 12px | 4px |
| Chart bottom padding | 12px | 8px | 4px |

**Estimated additional savings: ~12px**

---

## Half-Life Data Rationale

Keeping t½ data because:
1. **Educational** - Users learn why levels decay at different rates
2. **Compact** - Only ~4 characters (e.g., "t½ ~5d")
3. **Differentiating** - Helps compare compounds at a glance
4. **Scientific** - Reinforces the app's pharmacokinetic credibility

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/MedicationLevelsCard.tsx` | Integrate chevron into stats row, reduce padding, fix X-axis labels |

