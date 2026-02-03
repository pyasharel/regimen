
# Flatten Advanced Options in Quick Add Calculator

## Overview
Remove the collapsible "Advanced Options" section and make all options visible by default to improve discoverability of the reverse calculator mode.

## Current Structure (Peptides Tab)
```text
1. Vial Size (quick buttons + input)
2. [Standard Mode] BAC Water + Dose fields
   [Reverse Mode] Dose + Preferred Units fields
3. ▸ Advanced Options (collapsed)
   └── Mode toggle (Standard/Reverse)
   └── Syringe Size selector
4. Result display
5. Add to Stack button
```

## New Structure
```text
1. Mode toggle (Standard/Reverse) ← moved to top
2. Vial Size (quick buttons + input)
3. [Standard Mode] BAC Water + Dose fields
   [Reverse Mode] Dose + Preferred Units fields
4. Syringe Size selector ← always visible, compact
5. Result display
6. Add to Stack button
```

## Changes

### File: `src/components/CalculatorModal.tsx`

1. **Move Mode toggle to top of Peptides section** (after line 302)
   - Place the Standard/Reverse segmented control at the very top
   - Add a subtle label or make it self-explanatory
   - User sees the mode choice first, then fills in the relevant fields

2. **Remove Collapsible wrapper** (lines 440-497)
   - Delete the `<Collapsible>`, `<CollapsibleTrigger>`, and `<CollapsibleContent>` components
   - Keep the Syringe Size selector but make it always visible

3. **Make Syringe Size compact and always visible**
   - Keep the current three-button layout (0.3mL, 0.5mL, 1mL)
   - Place it after the dose fields, before the result
   - Add a small note like "1mL is most common" or keep it subtle since 1mL is already the default

4. **Remove unused imports**
   - Remove `Collapsible`, `CollapsibleContent`, `CollapsibleTrigger` imports
   - Remove `Settings2`, `ChevronDown` icons (no longer needed)
   - Remove `showAdvanced` state variable

## Visual Layout After Changes

```text
┌─────────────────────────────────────────┐
│ 🧮 Peptides           [Oil-Based] [X]   │
├─────────────────────────────────────────┤
│ Mode: [Standard] [Reverse]              │  ← Now at top
├─────────────────────────────────────────┤
│ Vial Size                               │
│ [5mg] [10mg] [15mg] [20mg] [___]       │
├─────────────────────────────────────────┤
│ BAC Water Added (or Dose + Units)       │
│ [1mL] [2mL] [3mL] [5mL] [___]          │
├─────────────────────────────────────────┤
│ Dose: [____]        Unit: [mcg] [mg]   │
├─────────────────────────────────────────┤
│ Syringe: [0.3mL] [0.5mL] [1mL ✓]       │  ← Always visible
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ Draw on syringe                     │ │
│ │ 10 units                       📋   │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ [+ Add to Stack]                        │
└─────────────────────────────────────────┘
```

## Benefits
- Reverse mode is immediately discoverable (no hidden options)
- Syringe size is visible for those who need it
- Simpler code with fewer components
- Matches user mental model: choose mode first, then fill fields

