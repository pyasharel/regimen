
# Compound Detail Screen — Shimmer Skeleton

Replace the two generic grey blobs on the compound detail loading state with a high-fidelity shimmer skeleton that mirrors the actual screen layout. This applies to both `/stack/:id` (CompoundDetailScreen) and `/stack-v2/:id` (CompoundDetailScreenV2).

---

## What's broken now

In `CompoundDetailScreenV2.tsx` lines 484–492:

```
if (loading) {
  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 space-y-4">
        <div className="h-12 bg-muted animate-pulse rounded-lg" />
        <div className="h-48 bg-muted animate-pulse rounded-xl" />
      </div>
    </div>
  );
}
```

Two blobs. Doesn't look like the screen at all. Visible for ~300ms on every tap into a compound.

`CompoundDetailScreen.tsx` has the same pattern.

---

## The fix

### 1. Create `src/components/skeletons/CompoundDetailSkeleton.tsx`

A new component that mirrors the real screen layout section by section:

- **Sticky header bar**: back-arrow placeholder (circle) + centered title bar + edit icon placeholder
- **Two gradient stat cards** side by side: "Current Dose" label + value placeholder + sub-label
- **Three small info chips** in a row: schedule, start date, cycle status
- **Tall chart card**: label + chart area block (mimics the medication levels area chart)
- **Dose history section**: section header + 3 dose row skeletons (icon + two text lines + checkbox)

All use the existing `Skeleton` component (`src/components/ui/skeleton.tsx`) with `shimmer={true}` (default), which uses the `animate-shimmer` keyframe already in `tailwind.config.ts`. No new dependencies.

### 2. Replace loading state in `CompoundDetailScreenV2.tsx`

Swap lines 484–492 with `<CompoundDetailSkeleton />`.

### 3. Replace loading state in `CompoundDetailScreen.tsx`

Find the equivalent loading return block and swap it with `<CompoundDetailSkeleton />`.

---

## Files to change

- **Create** `src/components/skeletons/CompoundDetailSkeleton.tsx`
- **Edit** `src/components/CompoundDetailScreenV2.tsx` — replace 2-blob loader
- **Edit** `src/components/CompoundDetailScreen.tsx` — replace equivalent loader

---

## Technical notes

- Uses existing `Skeleton` + `animate-shimmer` — zero new dependencies
- No changes to data fetching, auth, routing, or boot sequence
- No effect on PersistentTabContainer or Today screen changes
- No effect on the My Stack animation change
- Both V1 and V2 updated for consistency
- The skeleton includes a sticky header bar with safe-area padding to match the real screen exactly — prevents layout shift when content loads in
