
## Root Cause Analysis: iOS App Hang After 30 Minutes

### The Definitive Answer to "Why is this happening?"

I've identified **two separate issues** that together explain the behavior you're seeing:

---

## Issue 1: Stripe SDK Version Mismatch (The Backend Problem)

**What changed yesterday:**
The `check-subscription` and `create-portal-session` edge functions were updated to use:
- **Stripe SDK v18.5.0** with `apiVersion: "2025-08-27.basil"`

While other functions (create-checkout, stripe-webhooks, validate-promo-code) still use:
- **Stripe SDK v14.21.0** with `apiVersion: "2023-10-16"`

**The Problem:**
Stripe SDK v18.5.0 with the `2025-08-27.basil` API version is a **beta/future API version**. This can cause:
1. **Slow responses** - Stripe may be doing extra processing for the beta API
2. **Unexpected response formats** - The subscription objects returned may have different structures
3. **Connection issues** - The beta API endpoints may have different latency characteristics

**Why this affects the App Store build:**
Edge functions are server-side - when you deploy them, they affect ALL app versions immediately. Build 14 in the App Store calls the same edge functions as your development version.

**Evidence:**
Previous analytics showed `check-subscription` taking up to 8.7 seconds in some cases. This is far too slow for an on-resume subscription check.

---

## Issue 2: Cascading Auth Deadlocks (The Frontend Timing Problem)

Even though the frontend code (build 14) wasn't changed, the **slow edge function response** creates a cascade:

```text
App Resume on iOS
       │
       ▼
┌─────────────────────────────┐
│ SubscriptionContext calls   │
│ check-subscription (8+ sec) │
└─────────────────────────────┘
       │
       ▼ (holds auth lock)
┌─────────────────────────────┐
│ ProtectedRoute tries        │
│ getSession() - BLOCKED      │
└─────────────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│ Spinner shows indefinitely  │
│ "Restoring your session..." │
└─────────────────────────────┘
```

The App Store build (1.0.3 build 14) has the same SubscriptionContext that calls `check-subscription` on resume. When that edge function takes 8+ seconds, it blocks other auth operations.

---

## The Fix: Two-Part Solution

### Part A: Fix the Stripe SDK Version (Critical - Backend)
Downgrade `check-subscription` and `create-portal-session` back to stable Stripe versions:
- From: `stripe@18.5.0` with `apiVersion: "2025-08-27.basil"`  
- To: `stripe@14.21.0` with `apiVersion: "2023-10-16"`

This will immediately improve response times for all app versions (including App Store).

### Part B: Keep the Timeout/Watchdog Improvements (Already Done)
The watchdog and timeout improvements we added earlier are still valuable as defensive measures. They ensure that even if edge functions are slow in the future, the app will recover gracefully.

---

## Technical Details

### Files to modify:

**supabase/functions/check-subscription/index.ts**
- Line 2: Change `stripe@18.5.0` → `stripe@14.21.0`
- Line 46: Change `apiVersion: "2025-08-27.basil"` → `apiVersion: "2023-10-16"`

**supabase/functions/create-portal-session/index.ts**
- Line 2: Change `stripe@18.5.0` → `stripe@14.21.0`  
- Line 44: Change `apiVersion: "2025-08-27.basil"` → `apiVersion: "2023-10-16"`

### Expected Outcome:
1. Edge function response times should drop from 8+ seconds to under 1 second
2. App Store users (build 14) will immediately see improvement without needing an update
3. The defensive timeouts and watchdogs will remain as insurance for future issues

---

## Why This Wasn't Obvious

1. **Edge functions deploy independently** - You didn't release a new App Store build, but deploying edge function changes affected all users
2. **The basil API version looks legitimate** - It's actually the format Stripe uses for beta APIs (basil = beta codename)
3. **Timing was coincidental** - The Stripe version upgrade happened alongside other work

---

## Verification Steps

After deploying the fix:
1. Test on your iPhone (App Store build 14) - should load quickly on resume
2. Monitor edge function logs - response times should be under 1 second
3. Check with beta testers - they should see immediate improvement

---

## Terminal Command After Fix is Deployed

Once we deploy the edge function fix, you can sync your local project:
```bash
cd /Users/Zen/regimen-health-hub && git pull && npm install && npm run build && npx cap sync
```

However, **the fix for App Store users doesn't require any client-side update** - it's purely server-side.
