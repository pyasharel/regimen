

# Cleanup: Remove Dashboard Card Remnants + Continue Auth Lock Fix

## Summary

After investigation, I found **one remnant** from the Wednesday dashboard cards feature:
- `dosesRef` and `scrollToDoses` - unused code for "Quick Stats" scroll functionality

No other dashboard remnants are present (no weight queries, no dashboard state, no extra useEffects).

However, the main stability issue remains the **auth lock deadlock** we identified earlier. This cleanup will be added to the existing Build 21 fix.

---

## Changes

### File: src/components/TodayScreen.tsx

**Remove unused Quick Stats remnants (lines 88-95):**

Before:
```typescript
const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
const lastHapticTime = useRef<number>(0); // For haptic rhythm timing
const dosesRef = useRef<HTMLDivElement>(null); // Scroll target for Quick Stats

// Scroll to doses section
const scrollToDoses = () => {
  dosesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};
```

After:
```typescript
const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
const lastHapticTime = useRef<number>(0); // For haptic rhythm timing
```

**Also remove the ref usage (line 1224):**

Before:
```tsx
<div ref={dosesRef} className="p-4 space-y-4 relative">
```

After:
```tsx
<div className="p-4 space-y-4 relative">
```

---

## Summary of All Build 21 Changes

This cleanup will be included in the auth lock fix from the previous plan:

| Change | Purpose |
|--------|---------|
| New `dataClient.ts` | Bypass auth lock for data queries |
| Harden `useStreaks.tsx` | Replace `getUser()` with `getUserIdWithFallback()` |
| Harden `useNotificationPermissionPrompt.ts` | Add timeouts, replace `getUser()` |
| Fix `TodayScreen.tsx` checkPreviewMode | Replace `getUser()` with `getUserIdWithFallback()` |
| **Remove `dosesRef` / `scrollToDoses`** | Remove dead code from dashboard cards |
| Bump to Build 21 | Clear version separation |

---

## What I Did NOT Find

- No weight/progress queries on TodayScreen boot
- No dashboard card state variables
- No extra useEffects loading dashboard data
- ProgressStats component is only used on ProgressScreen

The dashboard cards were cleanly removed - only this one scroll helper was left behind.

