# Comprehensive Authentication & Subscription Flow Fixes

## Issues Fixed:

### 1. **Google Authentication - Force Account Picker** ✅
**Problem**: Google auth was auto-logging in without showing account selection
**Fix**: Changed `prompt: 'consent'` to `prompt: 'select_account'` to force account picker every time
**Location**: `src/pages/Auth.tsx` line 229

### 2. **Preview Timer Never Triggered** ✅
**Problem**: `showPreviewTimer` state was never set to `true`, so 2-minute timer never started
**Fixes**:
- Added logic in `AddCompoundScreen` to start timer when non-subscribed user adds first compound
- Added logic in `TodayScreen` to start timer when user enters with compound in preview mode
- Timer now properly triggers after first compound is added
**Locations**: 
- `src/components/AddCompoundScreen.tsx` lines 167-227
- `src/components/TodayScreen.tsx` lines 85-110

### 3. **Preview Compound Marking** ✅
**Problem**: App wasn't marking when preview compound was added
**Fix**: Added `markPreviewCompoundAdded()` call after first compound insertion
**Location**: `src/components/AddCompoundScreen.tsx` lines 726-729

### 4. **Preview Timer Dismiss Handling** ✅
**Problem**: No cleanup when user dismisses paywall
**Fix**: Added `onPaywallDismiss` callback to navigate back or cleanup
**Location**: `src/components/subscription/PreviewModeTimer.tsx`

### 5. **Faster Native Splash** ✅
**Problem**: Splash screen took too long on native apps
**Fix**: Skip animation on native, show content immediately
**Location**: `src/pages/Splash.tsx`

### 6. **Mobile Sign-up Layout** ✅
**Problem**: Sign-up form was cut off on mobile
**Fix**: Reduced logo size, improved spacing, added scroll container
**Location**: `src/pages/Auth.tsx`

### 7. **Auth Redirect Loop** ✅
**Problem**: Session handling caused redirect loops
**Fix**: Improved session initialization order in ProtectedRoute
**Location**: `src/components/ProtectedRoute.tsx`

## How Preview Mode Works Now:

1. **User signs up** → Goes to TodayScreen (empty state)
2. **Clicks "Add Compound"** → Can add ONE compound without subscription
3. **Saves compound** → `previewModeCompoundAdded` is marked, preview timer starts
4. **2 minutes later** → Paywall appears automatically
5. **Tries to add more** → Blocked, must subscribe

## Testing Commands:

### Clean test (delete user first):
```bash
# 1. Delete user in Lovable Cloud dashboard
# 2. Clear browser/app cache
# 3. Run app:
npm run dev -- --host
```

### For native testing:
```bash
# 1. git pull from your repo
# 2. npm install
# 3. npm run build
# 4. npx cap sync
# 5. npx cap run ios  # or android
```

## Console Logs to Watch:

- `[AddCompound] 🎯 Starting preview timer for new compound`
- `[TodayScreen] 🎯 User in preview mode with compound, starting timer`
- `[PreviewTimer] 🕐 Starting 2-minute countdown...`
- `[PreviewTimer] ⏰ 2 minutes elapsed - showing paywall`
- `[AddCompound] ✅ Marking preview compound as added`

## Key Behavior Changes:

✅ Google auth NOW shows account picker every time
✅ Preview timer NOW actually starts when adding first compound
✅ Preview timer NOW shows on both AddCompound and TodayScreen
✅ Splash screen NOW faster on native (no animation)
✅ Sign-up form NOW fits properly on mobile
✅ All features ARE unlocked during 2-minute preview
✅ Paywall WILL appear after 2 minutes automatically
