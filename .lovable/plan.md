
# Fix: Stack Page Header Consistency

## Problem
The Stack page (`MyStackScreen.tsx`) uses a custom header instead of the shared `MainHeader` component, making it visually inconsistent with Today, Progress, and Settings pages.

## Current State
| Screen | Header Component | Result |
|--------|-----------------|--------|
| Today | `<MainHeader title="Today" />` | Centered "REGIMEN" logo + small "Today" label |
| Progress | `<MainHeader title="Progress" />` | Centered "REGIMEN" logo + small "Progress" label |
| Settings | `<MainHeader title="Settings" rightSlot={...} />` | Centered "REGIMEN" logo + small "Settings" label + avatar |
| **Stack** | Custom `<div>` with `<h1>My Stack</h1>` | Large "My Stack" only, no logo |

## Solution
Replace the custom header in `MyStackScreen.tsx` with the `MainHeader` component, passing the Calculator button as the `rightSlot`.

## Technical Changes

### File: `src/components/MyStackScreen.tsx`

**Remove** (lines 451-463):
```tsx
{/* Header with Calculator Button */}
<div className="flex items-center justify-between px-4 pt-4">
  <h1 className="text-2xl font-bold text-foreground">My Stack</h1>
  <button
    onClick={() => {
      triggerHaptic();
      setShowCalculator(true);
    }}
    className="p-2 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
    aria-label="Open Calculator"
  >
    <Calculator className="w-5 h-5 text-primary" />
  </button>
</div>
```

**Replace with**:
```tsx
<MainHeader 
  title="My Stack" 
  rightSlot={
    <button
      onClick={() => {
        triggerHaptic();
        setShowCalculator(true);
      }}
      className="p-2 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
      aria-label="Open Calculator"
    >
      <Calculator className="w-5 h-5 text-primary" />
    </button>
  }
/>
```

**Also update the loading state** (lines 428-429) which also has the custom header:
The loading skeleton already uses `<MainHeader title="My Stack" />` correctly, so no change needed there.

## Result
All four main screens will have a consistent header with:
- Centered "REGIMEN" branding
- Page title on the left
- Action button on the right (where applicable)

## Implementation Time
~5 minutes - single file, straightforward replacement.
