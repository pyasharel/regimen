
# Plan: Collapsed Level Display, Chime Sound Fix, and Testing Recommendation

## Overview
Three minor, low-risk improvements that enhance UX without affecting core functionality:
1. Show current medication level when the Levels card is collapsed
2. Fix the "day complete" chime to use the cached sound setting
3. Recommendation on testing approach

---

## Part 1: Show Current Level When Collapsed

### Current Behavior
When collapsed, the header only shows:
- Medication name (or dropdown if multiple)
- Chevron to expand

### New Behavior
When collapsed, show the current level in the header row:
```
[Activity Icon] Testosterone ▼     ~42mg     [ChevronDown]
```

This provides glanceable data without requiring the user to expand the card.

### Changes to `src/components/MedicationLevelsCard.tsx`

**Location: Lines 336-380 (header section)**

Add the current level display to the header, visible when collapsed and when `currentLevel` exists:

```tsx
{/* Single header row with compound selector, current level (when collapsed), and chevron */}
<div className="flex items-center justify-between px-3 pt-1.5 pb-0">
  <div 
    className="flex-shrink-0 flex items-center gap-2" 
    onClick={(e) => e.stopPropagation()}
  >
    {/* Existing compound selector/name */}
    {compoundsWithHalfLife.length > 1 ? (
      <Select ...>
        ...
      </Select>
    ) : selectedCompound ? (
      <div className="flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium">
        <Activity className="w-3.5 h-3.5 text-primary" />
        <span>{selectedCompound.name}</span>
      </div>
    ) : null}
    
    {/* NEW: Show current level when collapsed */}
    {isCollapsed && currentLevel && selectedCompound && (
      <span className="text-xs text-muted-foreground">
        ~{formatLevel(currentLevel.absoluteLevel)} {selectedCompound.dose_unit}
      </span>
    )}
  </div>
  
  {/* Chevron button (unchanged) */}
  ...
</div>
```

---

## Part 2: Fix Chime Sound to Use Cached Setting

### Bug Found
In `TodayScreen.tsx`, the day-complete celebration chime reads directly from `localStorage` on line 1037:
```typescript
const soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
```

This bypasses the `soundEnabledRef` that's properly synchronized with persistent storage. While it usually works, it's inconsistent with the rest of the sound logic.

### Fix
Replace the direct `localStorage` read with the cached ref value:

**Location: Line 1037 in `src/components/TodayScreen.tsx`**

```typescript
// Before (buggy)
const soundEnabled = localStorage.getItem('soundEnabled') !== 'false';

// After (consistent)
if (soundEnabledRef.current) {
  playChimeSound();
}
```

---

## Part 3: Testing Recommendation

### My Recommendation: Proceed to App Store

These changes are extremely low risk:
- No database changes
- No authentication changes
- No new dependencies
- Isolated to display and sound logic
- All changes are additive/cosmetic

**Testing approach:**
1. Continue your current testing session with the existing native build
2. If no inactivity/hanging issues surface after 30-60 minutes of normal use (backgrounding, resuming, etc.), you can confidently publish
3. The minor tweaks I'm implementing now won't affect boot behavior or data flow

**Publish process:**
1. Publish the web app (immediate for web users)
2. Build new iOS version in Xcode and upload to App Store Connect
3. Build new Android version in Android Studio and upload to Google Play Console
4. Submit for review

The changes I'm making are "polish" improvements that don't require fresh testing on-device - they'll be included in the next native build you create.

---

## Files Modified

| File | Changes |
|------|---------|
| `src/components/MedicationLevelsCard.tsx` | Add current level to collapsed header |
| `src/components/TodayScreen.tsx` | Fix chime to use `soundEnabledRef.current` instead of direct localStorage |

---

## Technical Notes

### Risk Assessment
- **Very low risk** - Pure UI/UX improvements
- No changes to data loading, authentication, or state management
- All changes are behind existing conditionals

### Before/After Preview

**Collapsed Card - Before:**
```
[Activity] Testosterone ▼                    [V]
```

**Collapsed Card - After:**
```
[Activity] Testosterone ▼    ~42mg           [V]
```

