
# Plan: Fix Medication Levels Persistence and Android Sound Issues

## Overview
This plan addresses two bugs affecting user experience:
1. **Medication Levels Selection Not Persisting** - The card ignores user's saved preference and overrides with most-recently-logged compound
2. **Android Sound Not Playing** - Dose check-off sound may not play reliably on Android devices

Both fixes are low-risk and isolated to specific components.

---

## Part 1: Fix Medication Levels Persistence Logic

### Problem Analysis
The current `getDefaultCompound()` function in `MedicationLevelsCard.tsx` has flawed priority logic:
- It clears the user's saved preference if that compound has no logged doses
- It falls back to "most recently taken" which overrides user intent
- When a dose is marked, the selection logic re-runs and can change the displayed compound

### Solution: Smarter Selection with User Intent Priority

**Behavior Changes:**
1. **Saved preference is always honored** if the compound still exists and has half-life data (even if no doses)
2. **"Most recently logged" auto-switching** becomes opt-in behavior that only happens when:
   - User has no saved preference, OR
   - User explicitly enables "follow last logged" mode
3. **Manual selection locks the view** - marking doses won't switch the display

**File: `src/components/MedicationLevelsCard.tsx`**

Changes:
- Simplify `getDefaultCompound()` to respect saved preference unconditionally (if compound exists)
- Remove the conditional dose-check that clears preferences
- Only fall back to "most recent" when there's no saved preference
- Add a small "pin" indicator or auto-follow toggle (optional enhancement)

### Code Changes

```typescript
// Updated getDefaultCompound logic (simplified)
const getDefaultCompound = (): string | null => {
  // 1. Honor saved preference if compound still exists with half-life data
  const savedId = localStorage.getItem(STORAGE_KEY);
  if (savedId) {
    const savedCompound = compoundsWithHalfLife.find(c => c.id === savedId);
    if (savedCompound) {
      return savedCompound.id; // Always respect user's explicit choice
    }
    // Only clear if compound no longer exists
    localStorage.removeItem(STORAGE_KEY);
  }
  
  // 2. No saved preference - use most recently taken (smart default)
  const takenDoses = doses.filter(d => d.taken && d.taken_at);
  if (takenDoses.length > 0) {
    const sorted = [...takenDoses].sort((a, b) => 
      new Date(b.taken_at!).getTime() - new Date(a.taken_at!).getTime()
    );
    const recentCompoundId = sorted[0].compound_id;
    if (recentCompoundId) {
      const compound = compounds.find(c => c.id === recentCompoundId);
      if (compound && getHalfLifeData(compound.name)) {
        return recentCompoundId;
      }
    }
  }
  
  // 3. Alphabetical fallback
  if (compoundsWithHalfLife.length > 0) {
    const sorted = [...compoundsWithHalfLife].sort((a, b) => 
      a.name.localeCompare(b.name)
    );
    return sorted[0].id;
  }
  
  return null;
};
```

Also update the `useEffect` that initializes selection to only run once on mount (not on every `doses` change):

```typescript
// Initialize selected compound ONLY on first mount
const hasInitialized = useRef(false);

useEffect(() => {
  if (!hasInitialized.current && compoundsWithHalfLife.length > 0) {
    hasInitialized.current = true;
    const defaultId = getDefaultCompound();
    if (defaultId) {
      setSelectedCompoundId(defaultId);
    }
  }
}, [compoundsWithHalfLife, doses]);
```

---

## Part 2: Fix Android Sound Playback

### Problem Analysis
The Web Audio API implementation may fail on Android because:
1. AudioContext requires user interaction to start (auto-play policy)
2. The context may be suspended and needs explicit resume
3. The preload might fail silently without user feedback

### Solution: More Robust Audio Handling

**File: `src/components/TodayScreen.tsx`**

Changes:
1. **Resume AudioContext on first user interaction** (touch anywhere on screen)
2. **Add fallback to HTML5 Audio** if Web Audio fails
3. **Better error logging** to diagnose issues

### Code Changes

```typescript
// Add interaction listener to ensure AudioContext is ready
useEffect(() => {
  const resumeAudioContext = () => {
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume().then(() => {
        console.log('[TodayScreen] AudioContext resumed via user interaction');
      });
    }
  };
  
  // Resume on first touch/click
  document.addEventListener('touchstart', resumeAudioContext, { once: true });
  document.addEventListener('click', resumeAudioContext, { once: true });
  
  return () => {
    document.removeEventListener('touchstart', resumeAudioContext);
    document.removeEventListener('click', resumeAudioContext);
  };
}, []);

// Enhanced playCheckSound with retry logic
const playCheckSound = async () => {
  // Check sound setting first
  if (!soundEnabledRef.current) return;
  
  const context = audioContextRef.current;
  const buffer = bubbleBufferRef.current;
  
  if (!context || !buffer) {
    console.log('[TodayScreen] Audio not ready, attempting fallback');
    // Fallback: try HTML5 Audio (less reliable but might work)
    try {
      const fallbackAudio = new Audio(bubblePopSound);
      fallbackAudio.volume = 1.0;
      await fallbackAudio.play();
    } catch (err) {
      console.log('[TodayScreen] Fallback audio also failed:', err);
    }
    return;
  }
  
  try {
    // Always try to resume first
    if (context.state === 'suspended') {
      await context.resume();
    }
    
    const source = context.createBufferSource();
    const gainNode = context.createGain();
    source.buffer = buffer;
    source.connect(gainNode);
    gainNode.connect(context.destination);
    gainNode.gain.value = 1.0;
    source.start(0);
    console.log('[TodayScreen] Sound played successfully');
  } catch (err) {
    console.log('[TodayScreen] Sound play failed:', err);
  }
};
```

---

## Testing Plan

### Medication Levels Persistence
1. Select a specific medication in the levels card
2. Mark a dose for a **different** medication
3. Verify the card still shows your selected medication (not the one you just logged)
4. Close and reopen the app
5. Verify it still shows your previous selection

### Android Sound
1. Open the app on Android
2. Mark a dose as taken
3. Listen for the bubble pop sound
4. If no sound on first try, mark another dose (AudioContext should be unlocked now)
5. Verify sound plays consistently after that

---

## Technical Notes

### Files Modified
| File | Changes |
|------|---------|
| `src/components/MedicationLevelsCard.tsx` | Simplify persistence logic, add initialization ref |
| `src/components/TodayScreen.tsx` | Add AudioContext resume on interaction, improve sound fallback |

### Risk Assessment
- **Low risk** - Changes are isolated to specific functions
- **No database changes** required
- **No breaking changes** to existing functionality

### Dependencies
None - uses existing patterns and APIs already in the codebase

