
# Implementation Plan: Oil Calculator Precision Fix + Today Screen Medication Levels

## Overview

This plan addresses two key improvements:
1. **Oil Calculator Precision Fix** - Switch from 0.05 mL rounding to 0.01 mL precision to prevent cumulative overdosing
2. **Today Screen Medication Levels Widget** - Surface medication decay/levels prominently on the Today screen

---

## Part 1: Oil Calculator Rounding Fix

### The Problem Explained

Your beta tester's math:
- Weekly target: 250 mg
- Vial concentration: 263 mg/mL
- Per injection (daily, 7x/week): 250 / 7 = 35.7 mg
- mL per injection: 35.7 / 263 = **0.136 mL**

Current code at line 674 of `AddCompoundScreen.tsx`:
```javascript
mlPerInjection: Math.round(mlPerInjection * 20) / 20  // Rounds to nearest 0.05
```

This rounds 0.136 mL up to **0.15 mL**, causing:
- Actual weekly dose: 0.15 mL x 7 x 263 mg/mL = **276 mg** (+26 mg over target)
- That's a **10.5% overdose** every week

### The Solution

Switch to 0.01 mL precision (matching insulin syringe markings):
```javascript
mlPerInjection: Math.round(mlPerInjection * 100) / 100  // Rounds to nearest 0.01
```

Now 0.136 mL rounds to **0.14 mL**:
- Actual weekly dose: 0.14 mL x 7 x 263 mg/mL = **258 mg** (+3% instead of +10%)

### Changes Required

**File: `src/components/AddCompoundScreen.tsx`**
- Line 674: Change `Math.round(mlPerInjection * 20) / 20` to `Math.round(mlPerInjection * 100) / 100`

---

## Part 2: Today Screen Medication Levels Widget

### Design Philosophy

The goal is to make the Today screen more engaging for users, especially on days when they don't have scheduled doses. By surfacing medication levels:
- Users see a **concrete, visual representation** of what's in their system
- Creates a **reason to return** to the app daily
- Provides **immediate feedback** when marking doses as taken (level increases)
- Makes the app feel more **premium and sophisticated**

### Compound Selection Logic (Tiered Priority)

1. **User's explicit selection** (remembered in localStorage)
2. **First active compound with half-life data** (alphabetically)
3. **Fallback**: Most recently taken dose's compound

### Component Architecture

```text
TodayScreen.tsx
  |
  +-- [existing content...]
  |
  +-- TodayBanner (line 1034)
  |
  +-- MedicationLevelsCard (NEW - below TodayBanner)
        |
        +-- Compound selector dropdown
        +-- Current level display (percentage + absolute)
        +-- Mini sparkline chart (last 7 days + projection)
        +-- Half-life info text
```

### New Component: `MedicationLevelsCard.tsx`

**Location:** `src/components/MedicationLevelsCard.tsx`

**Props:**
```typescript
interface MedicationLevelsCardProps {
  compounds: Compound[];
  doses: Dose[];
  onCompoundChange?: (compoundId: string) => void;
}
```

**Key Features:**
- **Compact card** (height ~120px) with gradient background similar to existing premium UI elements
- **Compound selector** as a subtle dropdown (not prominent, since most users have 1-2 main compounds)
- **Current level display**: Shows "Semaglutide is at 72% of peak" with large percentage
- **Mini sparkline**: 7-day history + dotted line projection (simplified from full chart)
- **Tap to expand**: Tapping navigates to compound detail for full chart view

### UI Layout

```text
+--------------------------------------------------+
|  [Compound dropdown ▼]                    [i]    |
|                                                  |
|  72%  ━━━━━━━━━━━                               |
|  of peak                                         |
|                                                  |
|  ~12.4 mg in system    Half-life: ~7 days       |
|                                                  |
|  [Mini sparkline chart - 7 day trend]           |
+--------------------------------------------------+
```

### State Management

**In TodayScreen.tsx:**
```typescript
// Selected compound for levels display
const [selectedLevelsCompound, setSelectedLevelsCompound] = useState<string | null>(null);

// Load preference from localStorage
useEffect(() => {
  const saved = localStorage.getItem('selectedLevelsCompound');
  if (saved) setSelectedLevelsCompound(saved);
}, []);

// Save preference when changed
const handleCompoundChange = (compoundId: string) => {
  setSelectedLevelsCompound(compoundId);
  localStorage.setItem('selectedLevelsCompound', compoundId);
};
```

**Auto-selection logic:**
```typescript
const getDefaultCompound = (compounds: Compound[], doses: Dose[]): string | null => {
  // 1. User's saved preference (if compound still exists and has half-life data)
  const savedId = localStorage.getItem('selectedLevelsCompound');
  const savedCompound = compounds.find(c => c.id === savedId && c.is_active);
  if (savedCompound && getHalfLifeData(savedCompound.name)) {
    return savedCompound.id;
  }
  
  // 2. First active compound with half-life data (alphabetically)
  const withHalfLife = compounds
    .filter(c => c.is_active && getHalfLifeData(c.name))
    .sort((a, b) => a.name.localeCompare(b.name));
  if (withHalfLife.length > 0) {
    return withHalfLife[0].id;
  }
  
  // 3. Most recently taken dose's compound
  const recentDose = doses
    .filter(d => d.taken && d.taken_at)
    .sort((a, b) => new Date(b.taken_at!).getTime() - new Date(a.taken_at!).getTime())[0];
  if (recentDose) {
    return recentDose.compound_id;
  }
  
  return null;
};
```

### Real-Time Update on Dose Logging

When a user marks a dose as taken:
1. The `toggleDose` function already calls `loadDoses()` after updating
2. The `MedicationLevelsCard` will receive new doses via props
3. The level percentage will increase immediately
4. A subtle animation (pulse or glow) on the percentage confirms the change

### Mini Sparkline Implementation

Uses a simplified version of the existing chart from `CompoundDetailScreen`:
- Fixed 7-day window (not configurable)
- Area chart without axes (sparkline style)
- Solid line for past, dotted for future projection
- Current point marked with small dot
- Height: ~40px

### Edge Cases Handled

| Scenario | Behavior |
|----------|----------|
| No compounds | Card not shown |
| No compounds with half-life data | Card not shown |
| No taken doses | Show "Log doses to track" message |
| User's saved compound was deleted | Fall back to auto-selection |
| All compounds inactive | Card not shown |
| Compound has half-life but no doses | Show 0% with "No doses logged" |

### Visual Design Specifications

- **Background**: `bg-gradient-to-br from-primary/8 via-primary/4 to-transparent`
- **Border**: `border border-primary/15`
- **Percentage text**: `text-3xl font-bold text-primary`
- **Labels**: `text-xs text-muted-foreground`
- **Chart gradient**: Same as `CompoundDetailScreen` (coral/purple primary)
- **Tap target**: Entire card is tappable (navigates to compound detail)

---

## Implementation Sequence

### Step 1: Fix Oil Calculator Rounding
- Update line 674 in `AddCompoundScreen.tsx`
- Test with example values to verify precision

### Step 2: Create MedicationLevelsCard Component
- Build new component with compound selector
- Implement tiered selection logic
- Add mini sparkline using Recharts

### Step 3: Integrate into TodayScreen
- Import new component
- Add below TodayBanner (line 1034)
- Fetch compounds data for the component
- Wire up compound change handler

### Step 4: Add Real-Time Feedback
- Ensure dose logging triggers re-render
- Add subtle animation on level change

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/AddCompoundScreen.tsx` | Modify line 674 (rounding precision) |
| `src/components/MedicationLevelsCard.tsx` | Create new component |
| `src/components/TodayScreen.tsx` | Import and render MedicationLevelsCard |

---

## Technical Notes

### Database Queries Required

The `MedicationLevelsCard` needs:
1. **Compounds**: Already loaded in TodayScreen (can reuse/extend existing query)
2. **Doses with taken_at**: For selected compound, last 30 days of taken doses

New query addition to TodayScreen:
```typescript
// Fetch recent doses for levels calculation (across all compounds)
const { data: recentDosesForLevels } = await supabase
  .from('doses')
  .select('*, compounds(name, is_active)')
  .eq('taken', true)
  .not('taken_at', 'is', null)
  .gte('scheduled_date', subDays(new Date(), 30).toISOString().split('T')[0])
  .order('taken_at', { ascending: false });
```

### Performance Considerations

- Half-life calculations are CPU-bound but lightweight
- Chart data generation happens on component mount and when compound changes
- Uses existing `calculateMedicationLevels` utility (already optimized)

### Accessibility

- Compound dropdown is keyboard navigable
- Percentage has appropriate ARIA label
- Chart has hidden description for screen readers
