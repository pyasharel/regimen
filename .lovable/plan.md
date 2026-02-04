
# Fixes: Sound Effects, Persistence, and Real-Time Levels Update

## Overview
Three separate issues to address:
1. Android sound not playing when checking off medications
2. Sound settings not persisting on native platforms
3. Medication Levels card not updating in real-time when doses are checked/unchecked

---

## 1. Android Sound Effects Fix

### Problem
The current `new Audio()` approach has known issues on Android WebView:
- Requires user gesture before first playback
- May silently fail without errors
- First tap often produces no sound

### Solution
Use Web Audio API with AudioContext, similar to how `playChimeSound()` already works. This is more reliable across platforms and handles Android's autoplay policies better.

**File**: `src/components/TodayScreen.tsx`

**Current** (lines 1045-1050):
```javascript
const playCheckSound = () => {
  const audio = new Audio(bubblePopSound);
  audio.volume = 1.0;
  audio.play().catch(err => console.log('Sound play failed:', err));
};
```

**Change**: Preload the audio buffer on component mount, then use AudioContext for playback:

```javascript
// Add state/ref at component level
const audioContextRef = useRef<AudioContext | null>(null);
const bubbleBufferRef = useRef<AudioBuffer | null>(null);

// Preload audio on mount
useEffect(() => {
  const preloadAudio = async () => {
    try {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = context;
      
      const response = await fetch(bubblePopSound);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await context.decodeAudioData(arrayBuffer);
      bubbleBufferRef.current = audioBuffer;
    } catch (err) {
      console.log('Audio preload failed:', err);
    }
  };
  preloadAudio();
  
  return () => {
    audioContextRef.current?.close();
  };
}, []);

// Updated playCheckSound
const playCheckSound = () => {
  if (!audioContextRef.current || !bubbleBufferRef.current) return;
  
  try {
    const context = audioContextRef.current;
    // Resume context if suspended (required for iOS/Android after backgrounding)
    if (context.state === 'suspended') {
      context.resume();
    }
    
    const source = context.createBufferSource();
    const gainNode = context.createGain();
    source.buffer = bubbleBufferRef.current;
    source.connect(gainNode);
    gainNode.connect(context.destination);
    gainNode.gain.value = 1.0;
    source.start(0);
  } catch (err) {
    console.log('Sound play failed:', err);
  }
};
```

---

## 2. Sound Settings Persistence Fix

### Problem
Sound settings use `localStorage` directly, but on native platforms (iOS/Android), `localStorage` may not persist across app updates. The `persistentStorage` utility handles this by using Capacitor Preferences on native.

### Solution
Update SettingsScreen.tsx to use `persistentStorage` for sound settings.

**File**: `src/components/SettingsScreen.tsx`

**Current** (lines 47-50):
```javascript
useEffect(() => {
  const savedSound = localStorage.getItem('soundEnabled');
  setSoundEnabled(savedSound !== 'false');
}, []);
```

**Change**:
```javascript
import { persistentStorage } from "@/utils/persistentStorage";

useEffect(() => {
  const loadSettings = async () => {
    const savedSound = await persistentStorage.getBoolean('soundEnabled', true);
    setSoundEnabled(savedSound);
  };
  loadSettings();
}, []);
```

**Current** (lines 96-100):
```javascript
const toggleSound = (checked: boolean) => {
  setSoundEnabled(checked);
  localStorage.setItem('soundEnabled', String(checked));
  trackSoundToggled(checked);
};
```

**Change**:
```javascript
const toggleSound = async (checked: boolean) => {
  setSoundEnabled(checked);
  await persistentStorage.setBoolean('soundEnabled', checked);
  trackSoundToggled(checked);
};
```

**Also update TodayScreen.tsx** (line 659) to use persistentStorage:
```javascript
// Change from:
const soundEnabled = localStorage.getItem('soundEnabled') !== 'false';

// To:
const soundEnabledSetting = await persistentStorage.getBoolean('soundEnabled', true);
```

Since `toggleDose` is already async, this is a seamless change.

---

## 3. Real-Time Medication Levels Update

### Problem
The `loadLevelsData()` call was disabled due to suspected boot issues:
```javascript
// DIAGNOSTIC: Disabled - suspected cause of boot issues
// loadLevelsData();
```

### Solution
Instead of refetching from the database, update the local state directly. This is:
- Faster (no network call)
- More reliable (no chance of boot issues)
- Cleaner architecture (state-driven updates)

**File**: `src/components/TodayScreen.tsx`

When a dose is toggled, update `dosesForLevels` directly:

```javascript
// Inside toggleDose, after successful database update and local doses update:

// Update dosesForLevels state for real-time levels chart
if (!currentStatus) {
  // Dose was just marked as taken - add/update in levels data
  const newDoseForLevels: DoseForLevels = {
    id: doseId,
    compound_id: dose.compound_id,
    dose_amount: dose.dose_amount,
    dose_unit: dose.dose_unit,
    taken: true,
    taken_at: takenAtTimestamp,
    scheduled_date: dose.scheduled_date
  };
  
  setDosesForLevels(prev => {
    // Check if dose already exists in levels data
    const existingIndex = prev.findIndex(d => d.id === doseId);
    if (existingIndex >= 0) {
      // Update existing
      const updated = [...prev];
      updated[existingIndex] = newDoseForLevels;
      return updated;
    } else {
      // Add new
      return [newDoseForLevels, ...prev];
    }
  });
} else {
  // Dose was unchecked - remove from levels data (set taken to false)
  setDosesForLevels(prev => 
    prev.map(d => d.id === doseId ? { ...d, taken: false, taken_at: null } : d)
  );
}
```

### Architectural Assessment

**Performance Impact**: Minimal
- State update is synchronous and local
- React will batch the update with other state changes
- MedicationLevelsCard uses `useMemo` for calculations, so it only recalculates when data changes
- No additional network calls

**Should you do this?**: Yes, it's a good idea because:
1. Provides immediate visual feedback to users
2. Reinforces the connection between actions and results
3. The calculation is lightweight (runs on ~500 doses max)
4. Follows React's unidirectional data flow pattern

---

## Summary of Files Changed

| File | Changes |
|------|---------|
| TodayScreen.tsx | AudioContext for sound, persistentStorage for settings, direct state update for levels |
| SettingsScreen.tsx | Use persistentStorage instead of localStorage for sound toggle |

---

## Technical Notes

**Why AudioContext over Audio element?**
- AudioContext handles browser autoplay policies better
- Works more reliably on Android WebView
- Allows reuse of decoded audio buffer (more efficient)
- Already used in the app for `playChimeSound()`

**Why direct state update over refetch?**
- Eliminates network latency
- Removes potential for race conditions
- No chance of triggering boot issues
- Follows React best practices
