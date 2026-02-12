

## PreviewModeBanner Copy Refinement

A small structural tweak to the existing rotation implementation to make the "Subscribe" CTA always visible while benefits rotate.

---

### Current State

The banner subtitle currently renders like this for Segment A (1 compound):
> "Subscribe — Track multiple compounds with reminders"

The word "Subscribe" is part of the rotating text, so it briefly disappears during transitions.

### Change

Restructure so "Subscribe" is a fixed element and only the benefit phrase rotates:

**Layout:**
- Line 1 (title): "Free Plan" (static, unchanged)
- Line 2 (subtitle): "[rotating benefit] — **Subscribe**"

The benefit text (e.g., "Track multiple compounds", "Unlock progress photos") rotates every 5 seconds. The "Subscribe" link stays anchored at the end, always tappable.

### Technical Detail

**File: `src/components/PreviewModeBanner.tsx`**

In the `getSubtitle()` function, for the single-compound branch, flip the order so the benefit text comes first and the Subscribe link comes last:

```
{BENEFIT_MESSAGES[benefitIndex]} — Subscribe
```

Instead of the current:
```
Subscribe — {BENEFIT_MESSAGES[benefitIndex]}
```

This is a one-line reorder in the JSX return of `getSubtitle()`. No logic changes, no new props, no other files affected.

