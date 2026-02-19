
# Three Fixes: Haptics, Android Gate, and Remaining Timezone Bugs

## What Jay actually said

Looking at his messages:
- "Def prefer no haptics on nav"
- "Maybe an option to disable in settings"

Re-reading this: he's saying he doesn't want haptics on nav gestures, and is suggesting a settings toggle as one option to handle that. My read is the same as yours — the right fix is to just remove the haptic entirely. Native iOS back gestures have no haptic. The mid-swipe vibration feels unnatural and intrusive. A settings toggle to disable it would add clutter for something that just shouldn't be there. Removing it is the cleaner call.

---

## Change 1: Remove the navigation haptic

In `src/hooks/useSwipeBack.ts`, lines 76-81:

```ts
if (translateX >= TRIGGER_THRESHOLD && !hapticFiredRef.current) {
  hapticFiredRef.current = true;
  if (Capacitor.isNativePlatform()) {
    Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
  }
}
```

This entire block gets deleted. Also remove `hapticFiredRef` and the `Haptics`/`ImpactStyle` imports since nothing else uses them.

---

## Change 2: Lock swipe-back to iOS only

Currently the gesture is gated to `Capacitor.isNativePlatform()`, which includes Android. That's a problem because Android 10+ has its own system-level left-edge swipe for navigation, and it conflicts directly with this touch listener. They fight each other and the result is erratic.

On iOS there's no conflict because the app runs inside a Capacitor WebView that doesn't participate in `UINavigationController`'s native gesture stack.

Change:
```ts
// Before
const isNative = Capacitor.isNativePlatform();

// After
const isIOS = Capacitor.getPlatform() === 'ios';
```

And update both references (`if (!isNative) return;` and the `[isNative, ...]` dependency array) to use `isIOS`.

---

## Change 3: Fix remaining UTC timezone bugs (targeted, not blanket)

After auditing all 12 files with `toISOString().split('T')[0]`, here's the honest triage:

**Actually fix these** — directly user-facing date matching:

| File | Line(s) | Impact |
|------|---------|--------|
| `engagementNotifications.ts` | 378, 440 | Queries doses by "today's date" — wrong date means missed or double notifications |
| `CompoundDetailScreen.tsx` | 252 | "Next injection" date display shown to user |
| `CompoundDetailScreenV2.tsx` | 362 | Same as above |
| `MyStackScreen.tsx` | 148, 190 | Future dose deletion and recent dose query — wrong date could delete wrong doses |
| `AddCompoundScreen.tsx` | 1011 | Same future dose deletion logic |
| `doseCleanup.ts` | 64, 113 | Cleanup filter uses "today" — could miss or wrongly include doses |
| `AccountCreationScreen.tsx` | 312, 390 | Start date stored at onboarding (creates all future doses from this) |

**Leave alone** — these are fine:

| File | Reason |
|------|--------|
| `DataSettings.tsx` | Used for export filename only — cosmetic |
| `notificationScheduler.ts` | Uses a full `Date` object derived from local time, the split is secondary |
| `useWeeklyDigest.tsx` | Week-range queries, 1-day drift at boundary is negligible |
| `TodayScreen.tsx` | Already fixed in previous pass |
| `doseRegeneration.ts` | Already fixed in previous pass |

**The fix for all of them:** Add a `toLocalDateString` helper to the existing `src/utils/dateUtils.ts`:

```ts
export function toLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
```

Then import and use it in each affected file instead of `.toISOString().split('T')[0]`.

---

## Files changing

| File | Change |
|------|--------|
| `src/hooks/useSwipeBack.ts` | Remove haptic block + refs + unused imports; change `isNative` to `isIOS` |
| `src/utils/dateUtils.ts` | Add `toLocalDateString()` helper |
| `src/utils/engagementNotifications.ts` | Use `toLocalDateString()` at lines 378, 440 |
| `src/components/CompoundDetailScreen.tsx` | Use `toLocalDateString()` at line 252 |
| `src/components/CompoundDetailScreenV2.tsx` | Use `toLocalDateString()` at line 362 |
| `src/components/MyStackScreen.tsx` | Use `toLocalDateString()` at lines 148, 190 |
| `src/components/AddCompoundScreen.tsx` | Use `toLocalDateString()` at line 1011 |
| `src/utils/doseCleanup.ts` | Use `toLocalDateString()` at lines 64, 113 |
| `src/components/onboarding/screens/AccountCreationScreen.tsx` | Use `toLocalDateString()` at lines 312, 390 |

---

## Draft reply to Jay

Here's a casual note you can send:

> yeah totally agree, removed the haptic entirely. native iOS back gesture doesn't have one so it was always gonna feel a bit off. no toggle needed, just cleaner without it
>
> also went through and fixed the timezone thing in a bunch of other spots in the app while I was at it. same root cause showing up in a few different places, all patched now
>
> will push it all out on the next TestFlight build, keep an eye out!
