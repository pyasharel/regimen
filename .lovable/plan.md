

# Refinement Plan: Clone My Stack Chart Quality to Medication Levels Card

## Problem Summary

The Today screen Medication Levels Card looks "cheap" compared to the My Stack half-life chart because:

| Feature | My Stack Chart | Today Card |
|---------|---------------|------------|
| Y-Axis | Yes (0, 2, 4, 6 mg) | No - chart looks flat |
| Points/day | 24-48 (smooth) | 4 (choppy) |
| Height | h-40 (160px) | h-24 (96px) |
| Stats display | Clean, minimal | Bulky 100% takes space |
| Time range | 1W/1M/3M/6M filters | Fixed 7+3 days |

## Solution: Direct Port from CompoundDetailScreenV2

### Changes to Make

**1. Add Y-Axis with Dosage Scale (Critical for Premium Look)**

Port the exact Y-axis configuration from CompoundDetailScreenV2:
- Add `YAxis` import from recharts
- Add helper functions: `formatYAxis` and `getAxisMax`
- Calculate `maxAbsoluteLevel` and `yAxisMax` from chart data
- Configure: `width={28}`, `tickCount={4}`, `domain={[0, yAxisMax]}`

**2. Remove the 100% Percentage Display**

Instead of:
```
100%
~4 mg in system · t½ ~5 days
```

Show only:
```
[Medication dropdown ▼]          ~4 mg · t½ 5d    Now [i]
```

The absolute level (~4 mg) moves to the header row next to "Now", making it immediately clear what level they're at RIGHT NOW.

**3. Increase Point Density**

Change from 4 points per day to **24 points per day** for smooth curves matching My Stack.

**4. Increase Chart Height**

Change from `h-24` (96px) to `h-32` (128px) for better visibility while staying compact.

**5. Time Range Discussion**

For the Today screen card, I recommend **1 week default without filters**:

- **Why 1 week**: The Today screen is about "what's happening now" - 1 week provides immediate context without overwhelming
- **Why no filters here**: Keep it simple - if users want deeper analysis, they tap to go to the full compound detail screen which has all the filters
- **Projection**: Keep the 2-3 day dotted projection to show where levels are heading

However, if you want filters, we can add a minimal version (just 1W | 1M toggle).

**6. Layout Structure**

New compact header:
```
+------------------------------------------------------------------+
|  [Activity] Tirzepatide ▼        ~4 mg · t½ 5d         Now  [i]  |
|                                                                   |
|  [Y-Axis]  [═══════════════════════●░░░░░░░░░░]                  |
|    4 -                                                            |
|    2 -                                                            |
|    0 -     Jan 21    Jan 24    Jan 27•     Jan 30                |
+------------------------------------------------------------------+
```

**Total card height estimate**: ~140-150px (down from ~180px)

---

## Technical Implementation

### File: `src/components/MedicationLevelsCard.tsx`

#### 1. Add YAxis Import
```typescript
import { AreaChart, Area, ResponsiveContainer, ReferenceDot, XAxis, YAxis } from 'recharts';
```

#### 2. Add Axis Formatting Functions (Copy from CompoundDetailScreenV2 lines 318-335)
```typescript
const formatYAxis = (value: number) => {
  if (value === 0) return '0';
  if (Number.isInteger(value)) return value.toString();
  if (value >= 10) return Math.round(value).toString();
  if (value >= 1) return value.toFixed(1);
  return value.toFixed(2);
};

const getAxisMax = (max: number) => {
  if (max <= 0) return 1;
  if (max < 1) return Math.ceil(max * 10) / 10;
  if (max < 10) return Math.ceil(max);
  if (max < 50) return Math.ceil(max / 5) * 5;
  if (max < 100) return Math.ceil(max / 10) * 10;
  if (max < 500) return Math.ceil(max / 25) * 25;
  if (max < 1000) return Math.ceil(max / 50) * 50;
  return Math.ceil(max / 100) * 100;
};
```

#### 3. Calculate Y-Axis Maximum in chartData useMemo
```typescript
const maxAbsoluteLevel = chartData.length > 0 
  ? Math.max(...chartData.map(p => p.level)) 
  : 0;

const yAxisMax = getAxisMax(maxAbsoluteLevel * 1.1);
```

#### 4. Increase Points Per Day
```typescript
// Change line 172 from:
4, // 4 points per day
// To:
24, // 24 points per day for smooth curve
```

#### 5. Add YAxis Component to Chart
```typescript
<YAxis 
  tick={{ fontSize: 9 }}
  tickLine={false}
  axisLine={false}
  domain={[0, yAxisMax]}
  tickFormatter={formatYAxis}
  width={28}
  tickCount={4}
/>
```

#### 6. Restructure Header Layout

Remove the stats row (lines 289-309) and integrate the level into the header:

**Before:**
```jsx
{/* Header */}
<div className="flex items-center justify-between mb-3">
  {/* Dropdown */}
  {/* Now label + info */}
</div>

{/* Stats row - REMOVE THIS */}
<div className="flex items-baseline gap-3">
  <span className="text-3xl font-bold">100%</span>
  <span>~4 mg in system · t½ ~5 days</span>
</div>
```

**After:**
```jsx
{/* Header with compound selector, level, and Now label */}
<div className="flex items-center justify-between mb-2">
  {/* Left: Dropdown */}
  <div className="flex-1">...</div>
  
  {/* Right: Level + Now label + info */}
  <div className="flex items-center gap-2">
    <span className="text-xs text-muted-foreground">
      ~{formatLevel(currentLevel.absoluteLevel)} {unit} · t½ {formatHalfLife(hours)}
    </span>
    <span className="text-[10px] font-medium uppercase">Now</span>
    <PopoverButton />
  </div>
</div>
```

#### 7. Increase Chart Container Height
```typescript
// Change from h-24 to h-32
<div className="h-32 -mx-1">
```

#### 8. Adjust Chart Margins for Y-Axis Space
```typescript
<AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
```

---

## Summary of Changes

| Aspect | Before | After |
|--------|--------|-------|
| Y-Axis | None | Yes, 4 ticks with dosage scale |
| Points/day | 4 | 24 |
| Chart height | h-24 | h-32 |
| 100% display | Big prominent | Removed |
| Level display | Separate row | In header next to "Now" |
| Half-life | Separate row | Inline with level |
| Time range | 7d + 3d projection | Same (simple for Today) |
| Card height | ~180px | ~140px |

---

## Medication Selection Memory

Already implemented at line 41 and 106:
```typescript
const STORAGE_KEY = 'selectedLevelsCompound';
// ...
localStorage.setItem(STORAGE_KEY, compoundId);
```

The dropdown already remembers the last selected medication.

---

## Files to Modify

| File | Action |
|------|--------|
| `src/components/MedicationLevelsCard.tsx` | Add Y-axis, remove 100%, restructure header, increase point density |

This will make the Today screen chart look identical in quality to the My Stack version while being more compact.

