
# Refinement Plan: Medication Levels Card

## Issues Identified

### 1. Card is Too Tall/Bulky
The current implementation has too much vertical padding and spacing:
- `p-4` padding on the container
- `mb-3` gap after header
- `space-y-3` between content sections
- `text-3xl` for percentage (too large)
- Separate stats row taking extra vertical space

### 2. Chart Doesn't Match My Stack Quality
Current sparkline is basic compared to CompoundDetailScreenV2:
- No gradients for past vs. projected sections
- No dotted line for future projection
- Missing the polished gradient fills
- No axes (intentional for sparkline, but loses context)
- Chart height is only `h-10` (40px) - too small

### 3. Info Button Not Working on Web
The Tooltip requires a hover action, but on web preview it's rendering inside a `TooltipProvider` without `delayDuration={0}`. Radix tooltips need the provider properly configured. The issue is the tooltip shows on hover, but web users might expect click behavior.

### 4. What "Peak" Actually Means
You raised a great point. "100% of peak" is confusing because:
- **Current logic**: Peak = highest level ever reached across all doses
- **User expectation**: Peak might mean "right after injection" or "steady state"
- If someone takes 4mg weekly and just took a dose, they'd be at 100% because that IS their peak moment

**Recommendation**: Change terminology from "of peak" to "of maximum" or show the absolute value more prominently and de-emphasize the percentage.

### 5. Calendar Date Confusion
When user navigates to a past date, the levels card still shows TODAY's levels. This could be confusing.

**Solutions:**
- Add a subtle "Now" or "Today" label near the level to clarify
- Keep it always showing current levels (which makes sense - this is a "what's in your system right now" feature)
- The calendar is for viewing dose SCHEDULES, not medication levels

### 6. Missing Timeline
The My Stack chart has date axis labels; the Today screen sparkline doesn't. This loses context.

---

## Refined Design

### Compact Layout (Target Height: ~100px)
```text
+----------------------------------------------------------+
|  [Activity] Tirzepatide ▼                         Today  |
|                                                          |
|  72%  ~4.2 mg in system · Half-life ~5 days              |
|                                                          |
|  [═══════════════░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░]        |
|   Jan 20        Jan 24        Jan 27•       Jan 30       |
+----------------------------------------------------------+
```

### Key Changes

1. **Reduce Vertical Spacing**
   - Change `p-4` to `p-3`
   - Change `mb-3` to `mb-2`
   - Change `space-y-3` to `space-y-2`
   - Combine percentage + stats into single row

2. **Inline Stats Row**
   - Move "~4.2 mg in system" and "Half-life ~5 days" to same line as percentage
   - Use smaller text: `text-2xl` for percentage instead of `text-3xl`
   - Separator with `·` between values

3. **Add "Today" Label**
   - Small label in top-right corner: "Today" or "Now"
   - Clarifies that levels are current, not historical

4. **Better Chart Matching CompoundDetailScreenV2**
   - Port the exact gradient definitions from CompoundDetailScreenV2
   - Add past vs. projected area distinction (solid vs. dashed/faded)
   - Increase height from `h-10` to `h-16` (64px) for better visibility
   - Add minimal X-axis with 3-4 date labels (like the My Stack version)
   - Add the pulsing glow effect on "current" dot

5. **Fix Info Button**
   - Use Popover for both mobile AND web (consistent behavior)
   - Click-to-show is more reliable than hover on touch-friendly web

6. **Simplify Terminology**
   - Change "100% of peak" to "100%" with subtle "of max" or just show absolute prominently
   - Or: Show "~4 mg" as the primary number, percentage secondary

---

## Technical Implementation

### File: `src/components/MedicationLevelsCard.tsx`

**Changes:**

1. **Layout Compacting** (lines 276-316)
   - Reduce padding: `p-4` -> `p-3`
   - Reduce header margin: `mb-3` -> `mb-2`
   - Reduce content spacing: `space-y-3` -> `space-y-2`

2. **Inline Stats Row** (lines 318-341)
   - Combine percentage, absolute level, and half-life into one line
   - Reduce percentage size: `text-3xl` -> `text-2xl`
   - Add "Today" label in header

3. **Chart Enhancements** (lines 343-374)
   - Port gradient definitions from CompoundDetailScreenV2 (lines 714-738)
   - Add separate Area components for past vs. future (like lines 800-826)
   - Increase height: `h-10` -> `h-16`
   - Add XAxis with minimal date labels
   - Add animated glow effect on current dot

4. **Info Button Fix** (lines 232-274)
   - Use Popover for both platforms (remove Tooltip branch)

5. **Add "Today" indicator** (header area)
   - Small text label: "Today" or "Now" to clarify we're showing current levels

---

## Chart Data Structure Update

Current sparkline data maps:
```typescript
return levels.map(point => ({
  timestamp: point.timestamp.getTime(),
  level: point.absoluteLevel,
  percentage: (point.absoluteLevel / maxLevel) * 100,
  isFuture: point.isFuture
}));
```

Updated to match CompoundDetailScreenV2:
```typescript
return levels.map(point => ({
  date: format(point.timestamp, 'MMM d'),
  timestamp: point.timestamp.getTime(),
  level: point.absoluteLevel,
  pastLevel: !point.isFuture ? point.absoluteLevel : null,
  futureLevel: point.isFuture ? point.absoluteLevel : null,
  isFuture: point.isFuture
}));
```

---

## Visual Comparison

### Before (Current)
- Height: ~180px
- Percentage: 100% (large)
- Stats: Two separate lines
- Chart: Basic sparkline, no axes
- Info: Tooltip (hover) - broken on web

### After (Refined)
- Height: ~100px
- Percentage: 72% (medium, inline)
- Stats: Single line with separators
- Chart: Full gradients, dotted projection, X-axis labels, glowing dot
- Info: Popover (click) - works everywhere
- "Today" label for clarity

---

## Implementation Sequence

1. Compact the layout (padding, margins, spacing)
2. Combine stats into single inline row
3. Add "Today" label to header
4. Port chart gradients and styles from CompoundDetailScreenV2
5. Add XAxis with date labels
6. Switch to Popover for info button on all platforms
7. Test on mobile preview to ensure proper sizing

---

## Edge Case: Real-Time Update Animation

When dose is logged:
- Current: `scale-110` animation on percentage change
- Keep this, but make it subtler: `scale-105` for 300ms
- The chart will automatically re-render with updated data

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/MedicationLevelsCard.tsx` | All layout, chart, and info button changes |

No new files needed - this is a refinement of the existing component.
