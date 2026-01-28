

# Remove Dashboard & Fix Calendar Disconnect

## Summary

This plan removes the `QuickStatsDashboard` component entirely and makes the `MedicationLevelsCard` only display when viewing "today". This fixes the calendar disconnect issue where changing dates didn't affect these components.

---

## Changes Overview

### What Gets Removed
- **QuickStatsDashboard component** - Delete the file and remove all references
- The 4-card dashboard (Streak, Doses, Adherence, Weight) will no longer appear

### What Gets Fixed
- **MedicationLevelsCard** will only show when `selectedDate` is today
- When users change the calendar date, both the dashboard and levels card will disappear, leaving only the doses list for that date

---

## Technical Implementation

### 1. Delete QuickStatsDashboard File

Remove: `src/components/QuickStatsDashboard.tsx`

### 2. Update TodayScreen.tsx

**Remove imports:**
```typescript
// DELETE this line:
import { QuickStatsDashboard } from "@/components/QuickStatsDashboard";
```

**Remove component usage (lines ~1106-1113):**
```jsx
// DELETE this entire block:
<QuickStatsDashboard
  doses={doses}
  compounds={compoundsForLevels}
  selectedDate={selectedDate}
  onScrollToDoses={scrollToDoses}
  onWeightUpdated={loadLevelsData}
/>
```

**Add date check for MedicationLevelsCard (line ~1116):**
```jsx
// BEFORE:
<MedicationLevelsCard 
  compounds={compoundsForLevels}
  doses={dosesForLevels}
/>

// AFTER:
{isToday(selectedDate) && (
  <MedicationLevelsCard 
    compounds={compoundsForLevels}
    doses={dosesForLevels}
  />
)}
```

**Add import for isToday (if not already present):**
```typescript
import { isToday } from 'date-fns';
```

---

## Visual Flow After Changes

### When viewing TODAY:
```text
┌──────────────────────────────────┐
│  Good morning, Mike    🔥 5     │  ← Streak badge stays in greeting
├──────────────────────────────────┤
│  [Calendar Week View]            │
├──────────────────────────────────┤
│  [Medication Levels Card]        │  ← Only shows for today
├──────────────────────────────────┤
│  Morning                         │
│    ○ Tirzepatide 7.5mg          │
│  Evening                         │
│    ○ Vitamin D 5000 IU          │
└──────────────────────────────────┘
```

### When viewing PAST/FUTURE date:
```text
┌──────────────────────────────────┐
│  Good morning, Mike    🔥 5     │
├──────────────────────────────────┤
│  [Calendar Week View]            │
├──────────────────────────────────┤
│  Morning                         │  ← Doses immediately visible
│    ✓ Tirzepatide 7.5mg          │
│  Evening                         │
│    ✓ Vitamin D 5000 IU          │
└──────────────────────────────────┘
```

---

## What Remains for Quick Access

| Feature | Location | Access Method |
|---------|----------|---------------|
| Streak | Greeting header | Always visible |
| Weight logging | FAB "Log Today" drawer | Tap + button → Weight |
| Progress/Adherence | Bottom navigation | "Progress" tab |
| Doses | Main screen | Immediately visible |

---

## Files to Modify

| File | Action |
|------|--------|
| `src/components/QuickStatsDashboard.tsx` | **DELETE** |
| `src/components/TodayScreen.tsx` | Remove import, remove component, add conditional for MedicationLevelsCard |

---

## Benefits

1. **Reduced cognitive load** - No unexplained numbers
2. **Calendar consistency** - Everything updates when date changes
3. **More space for doses** - Primary action now immediately visible
4. **Cleaner UI** - Less visual noise
5. **Streak preserved** - Still celebrated in the greeting header

---

## Rollback Path

If you want to bring back a dashboard later, the `MedicationLevelsCard` pattern (with date-aware conditional rendering) can be applied to any future engagement components.

