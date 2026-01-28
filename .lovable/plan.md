

# Enhancement Plan: Add Interactive Tooltip to Medication Levels Card

## Summary

Add the same interactive hover/tap tooltip from My Stack to the Today screen Medication Levels Card. This lets users explore estimated levels at any point on the chart by hovering (desktop) or touch-dragging (mobile).

## Changes

### 1. Add Tooltip Import

```typescript
import { AreaChart, Area, ResponsiveContainer, ReferenceDot, XAxis, YAxis, Tooltip } from 'recharts';
```

### 2. Update Chart Data to Include Required Fields

The tooltip needs `absoluteLevel` and `percentOfPeak` for display. Update the chartData mapping:

```typescript
return levels.map(point => ({
  date: format(point.timestamp, 'MMM d'),
  timestamp: point.timestamp.getTime(),
  level: point.absoluteLevel,
  absoluteLevel: formatLevel(point.absoluteLevel), // Formatted for display
  percentOfPeak: Math.round((point.absoluteLevel / maxLevel) * 100),
  pastLevel: !point.isFuture ? point.absoluteLevel : null,
  futureLevel: point.isFuture ? point.absoluteLevel : null,
  isFuture: point.isFuture
}));
```

### 3. Add Tooltip Component to AreaChart

Port the tooltip from CompoundDetailScreenV2 (lines 756-782):

```typescript
<Tooltip
  content={({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
          <p className="text-xs text-muted-foreground mb-0.5">
            {data.date} {data.isFuture && <span className="text-primary/60">(projected)</span>}
          </p>
          <p className="text-sm font-semibold text-primary">
            ~{data.absoluteLevel} {selectedCompound?.dose_unit}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {data.percentOfPeak}% of peak
          </p>
        </div>
      );
    }
    return null;
  }}
/>
```

## About Height Compactness

The current height (`h-32` = 128px chart + padding = ~160-180px total) is recommended because:
- Y-axis labels need breathing room
- The decay curve needs vertical space to be meaningful
- Going smaller would make it look cramped/cheap again

If you want to trim slightly, we could:
- Reduce padding from `p-4` to `p-3` (saves ~16px)
- This is optional and I'd recommend keeping current padding

## Mobile Touch Behavior

Recharts automatically handles touch events:
- **Desktop**: Hover shows tooltip
- **Mobile**: Touch and drag along the chart shows tooltip at each point
- Works the same as My Stack

## File to Modify

| File | Changes |
|------|---------|
| `src/components/MedicationLevelsCard.tsx` | Add Tooltip import, update chartData with display fields, add Tooltip component |

## Visual Result

When user hovers/taps on the chart, they'll see a tooltip bubble showing:
```
Jan 24
~338 mg
98.5% of peak
```

For projected (future) points:
```
Jan 30 (projected)
~180 mg
52% of peak
```

