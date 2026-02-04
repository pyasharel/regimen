
# Activation Analytics & iOS Platform Detection Implementation

## Overview
Implementing comprehensive activation tracking to understand when users truly engage with the app, plus adding an onboarding flow flag for accurate `added_during_onboarding` and `logged_during_onboarding` tracking.

---

## Part 1: iOS Platform Detection - Answer to Your Question

**When can you publish the new iOS build?**

You can publish **immediately after these changes are merged**. The platform detection code (`getPlatform()` returning `'ios'`) is already correct. However, the `user_platform` GA4 user property was added relatively recently, so:

1. If your current TestFlight build predates the `setPlatformUserProperty()` addition, iOS users are showing as "web" because GA4 user properties don't backfill
2. After publishing a new build with these activation tracking changes, iOS users will correctly show as `ios` in GA4

**To verify after publishing:**
- Check iOS device console for: `[Analytics] Platform user property set: ios`
- Wait 24-48 hours for GA4 user property data to populate in reports

---

## Part 2: Onboarding Flow Flag

### localStorage Flag: `regimen_in_onboarding`

**Set when onboarding starts (OnboardingFlow.tsx):**
```typescript
useEffect(() => {
  // Set flag when entering onboarding
  localStorage.setItem('regimen_in_onboarding', 'true');
}, []);
```

**Clear when onboarding completes (OnboardingFlow.tsx - handleComplete):**
```typescript
const handleComplete = () => {
  // Clear in-onboarding flag
  localStorage.removeItem('regimen_in_onboarding');
  
  trackOnboardingComplete();
  localStorage.setItem('vite-ui-theme', 'light');
  document.documentElement.classList.remove('dark');
  clearState();
  navigate('/today', { replace: true });
};
```

**Helper function (analytics.ts):**
```typescript
export const isInOnboarding = (): boolean => {
  return localStorage.getItem('regimen_in_onboarding') === 'true';
};
```

---

## Part 3: Database Changes

**Add two columns to `profiles` table:**

```sql
ALTER TABLE profiles 
ADD COLUMN first_compound_added_at TIMESTAMPTZ,
ADD COLUMN first_dose_logged_at TIMESTAMPTZ;
```

These enable backend cohort analysis and RevenueCat webhook enrichment.

---

## Part 4: New Analytics Functions

**File: `src/utils/analytics.ts`**

```typescript
// Track first compound added - fires ONCE per user lifetime
export const trackFirstCompoundAdded = async (params: {
  timeSinceSignupHours: number;
}) => {
  const platform = getPlatform();
  const addedDuringOnboarding = isInOnboarding();
  
  ReactGA.event('first_compound_added', {
    platform,
    app_version: APP_VERSION,
    time_since_signup_hours: params.timeSinceSignupHours,
    added_during_onboarding: addedDuringOnboarding,
  });
  
  console.log('[Analytics] First compound added:', { 
    timeSinceSignupHours: params.timeSinceSignupHours,
    addedDuringOnboarding,
    platform 
  });
};

// Track activation complete (first dose logged) - fires ONCE per user lifetime
export const trackActivationComplete = async (params: {
  timeSinceSignupHours: number;
  timeSinceFirstCompoundHours: number | null;
}) => {
  const platform = getPlatform();
  const loggedDuringOnboarding = isInOnboarding();
  
  ReactGA.event('activation_complete', {
    platform,
    app_version: APP_VERSION,
    time_since_signup_hours: params.timeSinceSignupHours,
    time_since_first_compound_hours: params.timeSinceFirstCompoundHours,
    logged_during_onboarding: loggedDuringOnboarding,
  });
  
  console.log('[Analytics] Activation complete:', { 
    timeSinceSignupHours: params.timeSinceSignupHours,
    timeSinceFirstCompoundHours: params.timeSinceFirstCompoundHours,
    loggedDuringOnboarding,
    platform 
  });
};

// Check if user is currently in onboarding flow
export const isInOnboarding = (): boolean => {
  return localStorage.getItem('regimen_in_onboarding') === 'true';
};
```

---

## Part 5: First Compound Tracking

**File: `src/components/AddCompoundScreen.tsx`**

**Changes after successful compound insert (around line 1437):**

```typescript
// After successful insert, check if this is user's first compound
const firstCompoundKey = 'regimen_first_compound_tracked';
if (!localStorage.getItem(firstCompoundKey)) {
  // Get profile for signup timestamp
  const { data: profile } = await supabase
    .from('profiles')
    .select('created_at')
    .eq('user_id', user.id)
    .single();
  
  if (profile?.created_at) {
    const signupTime = new Date(profile.created_at).getTime();
    const now = Date.now();
    const hoursSinceSignup = Math.round((now - signupTime) / (1000 * 60 * 60));
    
    // Fire analytics event
    trackFirstCompoundAdded({ timeSinceSignupHours: hoursSinceSignup });
    
    // Update profile with timestamp
    await supabase
      .from('profiles')
      .update({ first_compound_added_at: new Date().toISOString() })
      .eq('user_id', user.id);
    
    // Set flag to prevent duplicate events
    localStorage.setItem(firstCompoundKey, 'true');
  }
}
```

---

## Part 6: Activation Complete Tracking (First Dose)

**File: `src/components/TodayScreen.tsx`**

**Changes in `toggleDose` after successful dose mark as taken (around line 779):**

```typescript
// After marking dose as taken successfully, check for first dose (activation)
if (!currentStatus) { // Only when checking OFF (marking as taken)
  const activationKey = 'regimen_activation_tracked';
  if (!localStorage.getItem(activationKey)) {
    // Verify this is actually first dose by checking user_stats
    const { data: stats } = await supabase
      .from('user_stats')
      .select('total_doses_logged')
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      .single();
    
    // total_doses_logged includes this dose, so check if it's 1
    if (stats?.total_doses_logged === 1) {
      // Get profile for timing data
      const { data: profile } = await supabase
        .from('profiles')
        .select('created_at, first_compound_added_at')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();
      
      if (profile?.created_at) {
        const signupTime = new Date(profile.created_at).getTime();
        const now = Date.now();
        const hoursSinceSignup = Math.round((now - signupTime) / (1000 * 60 * 60));
        
        let hoursSinceFirstCompound: number | null = null;
        if (profile.first_compound_added_at) {
          const compoundTime = new Date(profile.first_compound_added_at).getTime();
          hoursSinceFirstCompound = Math.round((now - compoundTime) / (1000 * 60 * 60));
        }
        
        // Fire activation event
        trackActivationComplete({
          timeSinceSignupHours: hoursSinceSignup,
          timeSinceFirstCompoundHours: hoursSinceFirstCompound,
        });
        
        // Update profile with timestamp
        await supabase
          .from('profiles')
          .update({ first_dose_logged_at: new Date().toISOString() })
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id);
        
        // Set flag to prevent duplicate events
        localStorage.setItem(activationKey, 'true');
      }
    }
  }
}
```

---

## Part 7: Also Track Onboarding-Added Compounds

Compounds added during onboarding (via `AccountCreationScreen.tsx`) should also trigger the first compound event.

**File: `src/components/onboarding/screens/AccountCreationScreen.tsx`**

After successful compound creation during signup, add:

```typescript
// Track first compound added (during onboarding)
const firstCompoundKey = 'regimen_first_compound_tracked';
if (!localStorage.getItem(firstCompoundKey)) {
  // Onboarding = immediate after signup, so time_since_signup is ~0
  trackFirstCompoundAdded({ timeSinceSignupHours: 0 });
  
  // Update profile
  await supabase
    .from('profiles')
    .update({ first_compound_added_at: new Date().toISOString() })
    .eq('user_id', user.id);
  
  localStorage.setItem(firstCompoundKey, 'true');
}
```

---

## Summary of Changes

| File | Changes |
|------|---------|
| **Database migration** | Add `first_compound_added_at`, `first_dose_logged_at` columns |
| `src/utils/analytics.ts` | Add `trackFirstCompoundAdded()`, `trackActivationComplete()`, `isInOnboarding()` |
| `src/components/onboarding/OnboardingFlow.tsx` | Set `regimen_in_onboarding` on mount, clear on complete |
| `src/components/AddCompoundScreen.tsx` | Fire `first_compound_added` event after insert |
| `src/components/TodayScreen.tsx` | Fire `activation_complete` event on first dose toggle |
| `src/components/onboarding/screens/AccountCreationScreen.tsx` | Fire `first_compound_added` for onboarding compounds |

---

## localStorage Keys

| Key | Purpose |
|-----|---------|
| `regimen_in_onboarding` | Tracks if user is currently IN onboarding flow |
| `regimen_first_compound_tracked` | Prevents duplicate `first_compound_added` events |
| `regimen_activation_tracked` | Prevents duplicate `activation_complete` events |

---

## Testing Plan

1. **Create fresh test account**
2. **During onboarding**, add a compound → verify `first_compound_added` with `added_during_onboarding: true`
3. **Complete onboarding**, log first dose → verify `activation_complete` with `logged_during_onboarding: false`
4. **Alternative path**: Skip medication in onboarding, add compound later → verify `added_during_onboarding: false`

---

## iOS Build Timeline

After these changes are merged:
1. **Sync and build**: `git pull && npm run build && npx cap sync ios`
2. **Upload to TestFlight**: Through Xcode
3. **Wait 24-48h**: For GA4 user properties to populate
4. **Verify**: Check GA4 User Properties for `user_platform: ios`
