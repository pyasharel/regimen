

# Persist Medication Levels Selection Across Sessions

## Summary

Make the selected compound in the Medication Levels card persist reliably across app restarts by using Capacitor Preferences (survives app updates, memory pressure) instead of plain localStorage (which iOS clears aggressively).

## Why This is Happening

The current implementation uses `localStorage` directly:
- **Line 138**: `localStorage.getItem(STORAGE_KEY)` 
- **Line 187**: `localStorage.setItem(STORAGE_KEY, compoundId)`

On iOS, localStorage lives in the WebView's cache and can be cleared when:
- Device is low on storage
- iOS performs memory cleanup
- WebView is rebuilt during app updates
- App is backgrounded for extended periods

## Solution

Switch to the existing `persistentStorage` utility which uses Capacitor Preferences on native platforms. This storage persists across app updates and isn't subject to WebView cache clearing.

## Implementation

### File: `src/components/MedicationLevelsCard.tsx`

1. **Import the utility**:
```typescript
import { persistentStorage } from "@/utils/persistentStorage";
```

2. **Add async state initialization** - Read from Capacitor Preferences on mount:
```typescript
// Load saved preference from persistent storage
useEffect(() => {
  const loadSavedPreference = async () => {
    const saved = await persistentStorage.get(STORAGE_KEY);
    if (saved && !hasInitialized.current) {
      const compound = compoundsWithHalfLife.find(c => c.id === saved);
      if (compound) {
        setSelectedCompoundId(saved);
        hasInitialized.current = true;
      }
    }
  };
  loadSavedPreference();
}, [compoundsWithHalfLife]);
```

3. **Update the save function** - Write to Capacitor Preferences:
```typescript
const handleCompoundChange = (compoundId: string) => {
  setSelectedCompoundId(compoundId);
  persistentStorage.set(STORAGE_KEY, compoundId); // Async but fire-and-forget
  onCompoundChange?.(compoundId);
};
```

4. **Keep localStorage as fast fallback** for immediate render on web.

### File: `src/utils/persistentStorage.ts`

Add the key to the persistent keys list:
```typescript
// Medication Levels card preference
'selectedLevelsCompound',
'medicationLevelsCollapsed',
```

## Behavior After Fix

1. User selects "Tirzepatide" in the levels card
2. Selection saved to both localStorage (instant) and Capacitor Preferences (async, persistent)
3. User closes app, reopens days later
4. On mount: Check Capacitor Preferences → finds "Tirzepatide" → shows it
5. Even after app update, the preference survives

## Performance Impact

- **Read**: ~1-2ms on mount (async, non-blocking)
- **Write**: ~1-2ms when changed (async, fire-and-forget)
- **No blocking**: UI renders immediately with localStorage fallback, then syncs

This is the same pattern used for theme persistence, sound settings, and notification preferences - all of which work reliably across sessions.

