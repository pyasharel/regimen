

# iOS-Style Swipe Navigation

## What This Adds

Two standard iOS navigation gestures that Jay flagged as missing:

1. **Swipe from left edge to go back** on pushed screens (compound detail, add compound, settings sub-pages, photo compare)
2. **Swipe down to dismiss** on modal dialogs (calculator, dose edit, photo preview, body settings, metric log, weekly digest, photo selector)

## How It Works

### Part 1: Swipe-Back Gesture

A reusable `useSwipeBack` hook that listens for touch gestures starting within 20px of the left screen edge. When the user swipes right far enough (past ~80px threshold), it triggers `navigate(-1)`. Includes:

- A visual indicator (a subtle sliding panel from the left edge) so the user sees the gesture is being recognized
- Only activates from the left edge to avoid conflicting with horizontal scrolling elsewhere on the page
- Haptic feedback on successful swipe-back

This hook gets added to these "pushed" screens:
- CompoundDetailScreen
- CompoundDetailScreenV2
- AddCompoundScreen
- PhotoCompareScreen
- AccountSettings
- NotificationsSettings
- DisplaySettings
- DataSettings
- HelpSettings
- TermsSettings
- PrivacySettings

### Part 2: Swipe-Down to Dismiss Modals

Convert these Dialog-based modals to Drawer (Vaul) components, which already support native swipe-down-to-dismiss:

- **CalculatorModal** (currently Dialog)
- **DoseEditModal** (currently Dialog)
- **PhotoPreviewModal** (currently Dialog)
- **BodySettingsModal** (currently Dialog)
- **MetricLogModal** (currently Dialog)
- **WeeklyDigestModalCalendar** (currently Dialog)
- **Photo selector in PhotoCompareScreen** (currently Dialog)

The LogToday modal already uses Drawer, so no changes needed there.

## Technical Details

### New Files
- `src/hooks/useSwipeBack.ts` - reusable hook with touch event listeners, threshold detection, and optional animated overlay
- `src/components/ui/SwipeBackOverlay.tsx` - thin visual overlay component rendered at the left edge during swipe

### Modified Files
- All 11 pushed screens listed above: add `useSwipeBack()` call and render `SwipeBackOverlay`
- All 7 modal components listed above: replace `Dialog`/`DialogContent`/`DialogHeader` imports with `Drawer`/`DrawerContent`/`DrawerHeader` equivalents, adjust layout for bottom-sheet style

### Gesture Parameters
- Edge zone: 20px from left edge (matches iOS default)
- Minimum swipe distance to trigger: 80px
- Animation: CSS transform following the finger, with opacity fade on the overlay
- Cancel threshold: if swipe distance is less than 80px on release, animate back to original position
