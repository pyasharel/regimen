

# Detailed Plan: Collapsible Medication Levels Card & Quick Stats Dashboard

## Overview

This plan adds two features to the Today screen:

1. **Collapsible MedicationLevelsCard** - Allow users to collapse/expand the chart with localStorage persistence
2. **Quick Stats Dashboard** - A compact, elegant row of actionable stats positioned above the medication levels card

The design prioritizes elegance, compactness, and ensuring doses remain visible without excessive scrolling.

---

## Screen Layout (After Implementation)

```text
+----------------------------------------------------------+
|  MainHeader                                              |
+----------------------------------------------------------+
|  Good morning, Mike                        🔥 5  (streak)|
+----------------------------------------------------------+
|  Calendar (Week/Month view)                              |
+----------------------------------------------------------+
|  TodayBanner (if any)                                    |
+----------------------------------------------------------+
|  ┌──────────────────────────────────────────────────────┐|
|  │ QUICK STATS DASHBOARD (~48px height)                 │|
|  │ ┌────────┐ ┌─────────────┐ ┌──────────┐             │|
|  │ │3 doses │ │Next: Tirz   │ │158.2 lbs │             │|
|  │ │remain  │ │in 2d        │ │  [edit]  │             │|
|  │ └────────┘ └─────────────┘ └──────────┘             │|
|  └──────────────────────────────────────────────────────┘|
+----------------------------------------------------------+
|  ┌──────────────────────────────────────────────────────┐|
|  │ MEDICATION LEVELS CARD                         [▾]   │|
|  │ ┌────────────────────────────────────────────────────┐|
|  │ │ [Tirzepatide ▼]                      Now  [i]     ││|
|  │ │                                   ~4 mg · t½ 5d   ││|
|  │ │  ┌──────────────────────────────────────────────┐ ││|
|  │ │  │     (Chart - collapsible)                    │ ││|
|  │ │  │     4 -                                      │ ││|
|  │ │  │     2 -    ═══════════●░░░░░░                │ ││|
|  │ │  │     0 -  Jan21  Jan24  Jan27  Jan30          │ ││|
|  │ │  └──────────────────────────────────────────────┘ ││|
|  │ └────────────────────────────────────────────────────┘|
|  └──────────────────────────────────────────────────────┘|
+----------------------------------------------------------+
|  DOSES TO TAKE TODAY                                     |
|  ┌──────────────────────────────────────────────────────┐|
|  │ Tirzepatide                          ☐              │|
|  │ 8:00 AM · 2.5 mg                                    │|
|  └──────────────────────────────────────────────────────┘|
+----------------------------------------------------------+
```

---

## Part 1: Collapsible Medication Levels Card

### Approach

Add a chevron toggle button to the card header that collapses/expands the chart area. The header with compound selector and current level always remains visible.

### Technical Changes

**File: `src/components/MedicationLevelsCard.tsx`**

1. **Add Imports**
   - Add `ChevronDown`, `ChevronUp` from lucide-react
   - Add `Collapsible`, `CollapsibleContent`, `CollapsibleTrigger` from "@/components/ui/collapsible"

2. **Add State & localStorage**
   ```typescript
   const COLLAPSED_KEY = 'medicationLevelsCollapsed';
   
   const [isCollapsed, setIsCollapsed] = useState(() => {
     const saved = localStorage.getItem(COLLAPSED_KEY);
     return saved === 'true';
   });
   
   const toggleCollapsed = () => {
     const newValue = !isCollapsed;
     setIsCollapsed(newValue);
     localStorage.setItem(COLLAPSED_KEY, String(newValue));
   };
   ```

3. **Add Chevron Toggle to Header**
   - Position a small chevron button in the top-right of the card header
   - Icon rotates based on collapsed state (ChevronDown when collapsed, ChevronUp when expanded)
   - Button has subtle hover state

4. **Wrap Chart in Collapsible**
   - Use Radix UI's Collapsible component for smooth animation
   - Header always visible, chart content conditionally rendered

5. **Collapsed State Display**
   - When collapsed, show just the header row (~40px total)
   - The header already shows current level and medication name, so users still get key info

### Height Savings
- **Expanded:** ~160px (current)
- **Collapsed:** ~48px (header only)
- **Savings when collapsed:** ~112px

---

## Part 2: Quick Stats Dashboard

### Design Philosophy

- **Single horizontal row** - compact, not a grid
- **3 key stats maximum** - prevents overwhelming
- **Tap actions** - each stat is actionable
- **Premium styling** - subtle backgrounds, clean typography, no borders
- **~48px total height** - minimal vertical footprint

### Stats to Include

| Stat | Display | Tap Action |
|------|---------|------------|
| Doses Remaining | "3 remaining" or "All done ✓" | Scroll to doses list |
| Next Dose | "Next: Tirzepatide in 2d" | Navigate to compound detail |
| Current Weight | "158.2 lbs" with edit icon | Open weight log modal |

### Technical Implementation

**File: `src/components/QuickStatsDashboard.tsx` (NEW)**

```typescript
interface QuickStatsDashboardProps {
  doses: Dose[];
  selectedDate: Date;
  onScrollToDoses: () => void;
  onWeightUpdated: () => void;
}
```

**Key Logic:**

1. **Doses Remaining**
   - Count doses where `!taken && !skipped`
   - Only for selected date
   - If all done: show "All done ✓" in green
   - Tap: call `onScrollToDoses()` which uses `scrollIntoView`

2. **Next Dose**
   - Find first untaken dose for today or future
   - Calculate time until dose ("in 2h", "in 2d", "Tomorrow 8am")
   - Tap: navigate to compound detail screen

3. **Current Weight**
   - Fetch from `progress_entries` table (latest weight metric)
   - Fallback to `profiles.current_weight` if no entries
   - Display with user's preferred unit (lb/kg)
   - Small pencil/edit icon
   - Tap: open `MetricLogModal` with type="weight"

**Styling:**

```jsx
<div className="mx-4 mb-3">
  <div className="flex items-stretch gap-2">
    {/* Each stat card */}
    <button className="flex-1 flex flex-col items-center justify-center 
      py-2 px-3 rounded-xl bg-card border border-border/50
      hover:bg-muted/50 active:scale-[0.98] transition-all">
      <span className="text-lg font-bold text-foreground">3</span>
      <span className="text-[10px] text-muted-foreground uppercase tracking-wide">remaining</span>
    </button>
    ...
  </div>
</div>
```

### Integration in TodayScreen

**File: `src/components/TodayScreen.tsx`**

1. **Add Import**
   ```typescript
   import { QuickStatsDashboard } from "@/components/QuickStatsDashboard";
   ```

2. **Add Ref for Scroll Target**
   ```typescript
   const dosesRef = useRef<HTMLDivElement>(null);
   
   const scrollToDoses = () => {
     dosesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
   };
   ```

3. **Position Dashboard**
   Place between `TodayBanner` and `MedicationLevelsCard`:
   ```jsx
   <TodayBanner />
   <QuickStatsDashboard 
     doses={doses}
     selectedDate={selectedDate}
     onScrollToDoses={scrollToDoses}
     onWeightUpdated={loadProgressData}
   />
   <MedicationLevelsCard ... />
   ```

4. **Add Ref to Doses Container**
   ```jsx
   <div ref={dosesRef} className="p-4 space-y-4 relative">
   ```

---

## About Streak Badge

The streak badge is **already integrated** in the greeting header (line 999 in TodayScreen.tsx):

```jsx
<div className="flex items-center justify-between gap-3">
  <div className="flex items-center gap-3">
    <h2>Good morning, Mike</h2>
    <SunriseIcon />
  </div>
  <StreakBadge />  {/* Already here! */}
</div>
```

The `StreakBadge` component shows the fire icon with current streak count when streak >= 1. This is the appropriate location - prominent but not duplicated. No changes needed.

---

## Compact Height Analysis

| Component | Current Height | After Changes |
|-----------|---------------|---------------|
| Quick Stats Dashboard | N/A | +48px (new) |
| Medication Levels Card | ~160px | ~160px expanded / ~48px collapsed |
| **Net Impact (collapsed)** | - | **-64px** (dashboard adds 48, but saves 112 from collapsed chart) |
| **Net Impact (expanded)** | - | **+48px** |

**Key Insight:** If users prefer a compact view, collapsing the chart actually results in LESS vertical space used than before, even with the new dashboard.

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/QuickStatsDashboard.tsx` | **CREATE** - New dashboard component |
| `src/components/MedicationLevelsCard.tsx` | **MODIFY** - Add collapsible functionality |
| `src/components/TodayScreen.tsx` | **MODIFY** - Integrate dashboard, add scroll ref |

---

## Edge Cases Handled

1. **No doses for today** - Dashboard shows "No doses" or hides the stat
2. **No weight logged** - Shows "Log weight" prompt instead of value
3. **No medications with half-life data** - MedicationLevelsCard already handles this (returns null)
4. **All doses complete** - Shows celebratory "All done ✓" state
5. **Date picker not on today** - Shows remaining for selected date, "Next dose" only shows for today

---

## Testing Recommendations

After implementation:
1. Toggle the chart collapse and refresh - verify state persists
2. Tap "X remaining" and verify smooth scroll to doses
3. Tap weight stat and verify modal opens correctly
4. View on mobile to ensure all stats fit comfortably
5. Check both light and dark modes
6. Test with 0 doses, 1 dose, and multiple doses

