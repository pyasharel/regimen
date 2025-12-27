# Subscription flips to preview after iOS screenshot (Restore Purchases → Screenshot → Preview)

## Symptom
On iOS builds, user restores purchases (RevenueCat shows **Active/Pro**), then takes a **system screenshot** and the app flips back into **Preview mode** (subscriptionStatus becomes `none`).

## Why a screenshot matters
On iOS, taking a screenshot can briefly background/foreground the app. That triggers Capacitor `appStateChange` with `isActive: true` shortly after.

## Observed evidence
- Web/network logs repeatedly show the backend `check-subscription` returning:
  - `{ "subscribed": false, "status": "none" }`
  - That response is what flips the UI to preview on web.
- On iOS, the flip is caused by **app resume** logic + a **stale backend profile read** (`profiles.subscription_status = 'none'`) overwriting an already-confirmed RevenueCat entitlement.

## Root cause hypothesis (most likely)
1. User restores purchases → RevenueCat entitlement becomes Pro and UI updates to `active`.
2. User takes a screenshot → app triggers `appStateChange` resume.
3. Resume handler re-identifies RevenueCat (logIn) in a racey moment and may return no entitlement momentarily.
4. Handler falls through to `refreshSubscription('app_resume')`.
5. `refreshSubscription` reads `profiles.subscription_status` (often still `none`) and sets `subscriptionStatus` to `none` → Preview mode UI.

## Fixes implemented so far
### 1) Added Subscription Diagnostics (hidden long-press)
- Long-press version number in Settings to open.
- Shows:
  - platform
  - current user id
  - RevenueCat appUserId
  - entitlement isPro/isTrialing
  - last refresh trigger
  - last status source
  - transition log timeline

### 2) Native platform: Stripe check-subscription is skipped
- Prevents Stripe from overwriting native entitlement state.

### 3) Prevent backend profile reads from downgrading an active entitlement
- If RevenueCat indicates Pro, we avoid applying a `profile.subscription_status = 'none'` downgrade.

### 4) **New: screenshot/app-resume stabilization**
Implemented in `src/contexts/SubscriptionContext.tsx`:
- On app resume:
  - If `revenueCatEntitlementRef.current?.isPro` is already true, **use it and return** (no re-login, no refresh).
  - Otherwise, if already identified, call `Purchases.getCustomerInfo()` and compute entitlement from that.
  - Only if RevenueCat still says not Pro do we fall back to `refreshSubscription('app_resume')`.
- In `restorePurchases()`:
  - Identify again if the logged-in user changed (not just when `!identified`).

## What we still need if issue persists
If the flip continues after these changes, collect:
1. Diagnostics screen JSON **immediately after restore** (shows active)
2. Diagnostics screen JSON **immediately after screenshot** (shows flip)

Key fields to check:
- `revenueCatAppUserId` matches the current logged-in user id
- `revenueCatEntitlement.isPro` stays true across resume
- `lastRefreshTrigger` / `lastStatusSource` when it flips to `none`

## Notes about “sandbox account”
- iOS purchase eligibility/trials are tied to Apple sandbox tester accounts.
- However, this specific bug pattern matches an app-resume race + stale backend profile overwrite, not just sandbox reuse.
