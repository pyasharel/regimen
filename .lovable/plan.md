
# Diagnostic Build v1.0.3 (Build 20) - Disable Medication Levels Feature

## Goal

Create a diagnostic build that **completely disables the Medication Levels feature** to test whether it's the root cause of the black screen, slow connection, and other issues that started on Wednesday. The existing boot fixes will remain in place.

## Rationale

All symptoms began on Wednesday when the Medication Levels feature was released:
- Black screen on boot
- "Slow connection" errors
- Data not loading
- Random sign-outs (reported by some users)

The feature introduced:
- Reading from `localStorage` on boot (`selectedLevelsCompound`, `medicationLevelsCollapsed`)
- A query fetching up to 500 doses (`loadLevelsData`)
- Heavy data processing (half-life calculations, chart rendering)

If all problems disappear after disabling this feature, we've confirmed the root cause and can fix it properly before re-enabling.

---

## Changes Summary

```text
┌─────────────────────────┬─────────────────────────────────────────────────────┐
│ File                    │ Change                                              │
├─────────────────────────┼─────────────────────────────────────────────────────┤
│ capacitor.config.ts     │ Bump appBuild from '19' to '20'                     │
├─────────────────────────┼─────────────────────────────────────────────────────┤
│ src/components/         │ Comment out:                                        │
│ TodayScreen.tsx         │   - Import of MedicationLevelsCard                  │
│                         │   - State variables (compoundsForLevels, etc.)      │
│                         │   - loadLevelsData() function                       │
│                         │   - useEffect that calls loadLevelsData             │
│                         │   - loadLevelsData call in retryLoad                │
│                         │   - The MedicationLevelsCard JSX render             │
├─────────────────────────┼─────────────────────────────────────────────────────┤
│ src/main.tsx            │ Add selectedLevelsCompound &                        │
│                         │ medicationLevelsCollapsed to suspectKeys list       │
│                         │ (already present, just confirm)                     │
└─────────────────────────┴─────────────────────────────────────────────────────┘
```

---

## Technical Details

### 1. Version Bump (capacitor.config.ts)

Update line 6:
```typescript
export const appBuild = '20';  // Changed from '19'
```

### 2. Disable Feature in TodayScreen.tsx

**Comment out the import (line 6):**
```typescript
// DIAGNOSTIC: Disabled to test if this feature causes boot issues
// import { MedicationLevelsCard } from "@/components/MedicationLevelsCard";
```

**Comment out state variables (lines 119-136):**
```typescript
// DIAGNOSTIC: Medication Levels feature disabled
// interface CompoundForLevels { ... }
// interface DoseForLevels { ... }
// const [compoundsForLevels, setCompoundsForLevels] = useState<...>([]);
// const [dosesForLevels, setDosesForLevels] = useState<...>([]);
```

**Comment out the loadLevelsData useEffect (lines 266-268):**
```typescript
// DIAGNOSTIC: Disabled - suspected cause of boot issues
// useEffect(() => {
//   loadLevelsData();
// }, []);
```

**Comment out loadLevelsData function (lines 330-372):**
```typescript
// DIAGNOSTIC: Disabled - suspected cause of boot issues
// const loadLevelsData = async () => { ... };
```

**Comment out loadLevelsData in retryLoad (line 407):**
```typescript
const retryLoad = useCallback(() => {
  setLoading(true);
  loadDoses();
  // loadLevelsData();  // DIAGNOSTIC: Disabled
  loadUserName();
  checkCompounds();
}, [selectedDate]);
```

**Comment out loadLevelsData in toggleDose (line 704):**
```typescript
// loadLevelsData();  // DIAGNOSTIC: Disabled
```

**Comment out the MedicationLevelsCard JSX (lines 1200-1215):**
```tsx
{/* DIAGNOSTIC: Medication Levels feature disabled to test boot stability
{isToday(selectedDate) && (
  <ComponentErrorBoundary 
    name="MedicationLevels"
    fallback={...}
  >
    <MedicationLevelsCard 
      compounds={compoundsForLevels}
      doses={dosesForLevels}
    />
  </ComponentErrorBoundary>
)}
*/}
```

### 3. Confirm suspect keys in main.tsx (already present)

Lines 11-16 already include the Medication Levels localStorage keys:
```typescript
const suspectKeys = [
  'selectedLevelsCompound',
  'medicationLevelsCollapsed',
  'cachedEntitlement',
  'pendingDoseActions',
];
```

No changes needed here - this is already protecting against corrupted data from previous boots.

---

## What Remains Active

All boot stability fixes from the previous hotfix remain active:
- Failed boot detection (clears suspect keys if previous boot failed)
- 4-second boot timeout with recovery UI
- Non-blocking splash screen auth with 3-second timeout
- `ensureAuthReady()` in loadDoses for proper session hydration
- Android notification icon fix

---

## Testing Protocol

After deploying to TestFlight and Play Store:

1. **Fresh Install Test**: Install app fresh, use it, close completely, reopen (5x)
2. **Notification Cold Start**: Set a notification, force-close app, tap notification when it arrives
3. **Normal Usage**: Navigate between screens, log doses, check settings
4. **Resume from Background**: Use app, switch to another app, return
5. **Extended Closure**: Leave app closed overnight, reopen in morning

**Success Criteria**: All tests pass without black screen, slow connection errors, or empty states.

**If All Tests Pass**: The Medication Levels feature is confirmed as the root cause. We'll then fix it with:
- Lazy initialization (don't read localStorage on boot)
- Move the 500-dose query to only run when the card is visible
- Add query timeout and error boundary improvements

**If Problems Persist**: The root cause is elsewhere, and we'll need to investigate other recent changes.

---

## Build Commands

After implementing:
```bash
git pull && npm install && npm run build && npx cap sync
./sync-version.sh
npx cap run ios
npx cap run android
```

Then upload to TestFlight and Google Play Console for beta testing.
