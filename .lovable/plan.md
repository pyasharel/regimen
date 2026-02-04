
# Focused Analytics: User Properties + Pre-Conversion State

## Overview
Two targeted additions to help you understand your user segments and what drives conversion.

---

## Part 1: User Properties for Path Type and Experience Level

### New Function in `src/utils/analytics.ts`

```typescript
/**
 * Sets user profile properties as GA4 user properties.
 * Call this after profile data is loaded (on app init and after auth).
 * These allow segmenting ALL reports by user type.
 */
export const setProfileUserProperties = (profile: {
  pathType: string | null;
  experienceLevel: string | null;
}) => {
  ReactGA.gtag('set', 'user_properties', {
    user_path_type: profile.pathType || 'unknown',
    user_experience_level: profile.experienceLevel || 'unknown',
  });
  console.log('[Analytics] Profile user properties set:', {
    path_type: profile.pathType,
    experience_level: profile.experienceLevel,
  });
};
```

### Integration Point: `src/hooks/useAnalytics.tsx`

Add a new effect that loads the profile and sets user properties on auth state changes:

```typescript
// Add new effect after existing effects
useEffect(() => {
  const setUserProfileProperties = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('path_type, experience_level')
        .eq('user_id', user.id)
        .single();
      
      if (profile) {
        setProfileUserProperties({
          pathType: profile.path_type,
          experienceLevel: profile.experience_level,
        });
      }
    } catch (err) {
      console.log('[Analytics] Could not load profile for user properties');
    }
  };
  
  // Run on initial load
  setUserProfileProperties();
  
  // Also run when auth state changes (login/signup)
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_IN') {
      setUserProfileProperties();
    }
  });
  
  return () => {
    subscription.unsubscribe();
  };
}, []);
```

---

## Part 2: Pre-Conversion State Event

### New Function in `src/utils/analytics.ts`

```typescript
/**
 * Track user engagement state right before subscription purchase attempt.
 * This helps identify what engagement level predicts conversion.
 */
export const trackPreConversionState = (params: {
  dosesLoggedTotal: number;
  compoundsCount: number;
  daysSinceSignup: number;
  sessionsCount: number;
  selectedPlan: 'monthly' | 'annual';
}) => {
  const platform = getPlatform();
  
  ReactGA.event('pre_conversion_state', {
    platform,
    app_version: APP_VERSION,
    doses_logged_total: params.dosesLoggedTotal,
    compounds_count: params.compoundsCount,
    days_since_signup: params.daysSinceSignup,
    sessions_count: params.sessionsCount,
    selected_plan: params.selectedPlan,
  });
  
  console.log('[Analytics] Pre-conversion state:', params);
};
```

### Session Count Tracking

Since we don't currently track session count, we'll use a simple localStorage counter:

**Add to `src/utils/analytics.ts`:**

```typescript
// Session counter for pre-conversion analytics
const SESSION_COUNT_KEY = 'regimen_session_count';

export const incrementSessionCount = (): number => {
  const current = parseInt(localStorage.getItem(SESSION_COUNT_KEY) || '0', 10);
  const next = current + 1;
  localStorage.setItem(SESSION_COUNT_KEY, String(next));
  return next;
};

export const getSessionCount = (): number => {
  return parseInt(localStorage.getItem(SESSION_COUNT_KEY) || '0', 10);
};
```

**Increment session count in `trackSessionStart()` in `analytics.ts`:**

```typescript
export const trackSessionStart = () => {
  const platform = getPlatform();
  const sessionCount = incrementSessionCount();
  
  ReactGA.event('session_started', {
    platform,
    app_version: APP_VERSION,
    session_number: sessionCount,
  });
  
  console.log('[Analytics] Session started:', { platform, app_version: APP_VERSION, session_number: sessionCount });
};
```

### Integration Point: `src/components/SubscriptionPaywall.tsx`

Add at the START of `handleStartTrial()`, before any purchase logic:

```typescript
const handleStartTrial = async () => {
  console.log('[PAYWALL] ========== START TRIAL CLICKED ==========');
  
  // Track pre-conversion engagement state
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Fetch engagement metrics
      const [profileRes, statsRes, compoundsRes] = await Promise.all([
        supabase.from('profiles').select('created_at').eq('user_id', user.id).single(),
        supabase.from('user_stats').select('total_doses_logged').eq('user_id', user.id).single(),
        supabase.from('compounds').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      ]);
      
      const daysSinceSignup = profileRes.data?.created_at
        ? Math.floor((Date.now() - new Date(profileRes.data.created_at).getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      
      trackPreConversionState({
        dosesLoggedTotal: statsRes.data?.total_doses_logged || 0,
        compoundsCount: compoundsRes.count || 0,
        daysSinceSignup,
        sessionsCount: getSessionCount(),
        selectedPlan,
      });
    }
  } catch (err) {
    console.log('[PAYWALL] Could not track pre-conversion state:', err);
  }
  
  // ... rest of existing handleStartTrial logic
};
```

---

## Summary of Changes

| File | Changes |
|------|---------|
| `src/utils/analytics.ts` | Add `setProfileUserProperties()`, `trackPreConversionState()`, `incrementSessionCount()`, `getSessionCount()`, update `trackSessionStart()` |
| `src/hooks/useAnalytics.tsx` | Add effect to fetch profile and call `setProfileUserProperties()` on auth |
| `src/components/SubscriptionPaywall.tsx` | Add `trackPreConversionState()` call at start of `handleStartTrial()` |

---

## What This Enables

### User Properties (GA4 Reports)
- Segment ALL reports by `user_path_type` (GLP-1 vs Protocol)
- Segment ALL reports by `user_experience_level` (Beginner/Intermediate/Advanced)
- Answers: "Do GLP-1 users convert better than protocol users?"

### Pre-Conversion State (Event Analysis)
- See exact engagement levels at moment of purchase attempt
- Parameters: doses_logged_total, compounds_count, days_since_signup, sessions_count
- Answers: "Users who log 5+ doses before purchasing have higher retention"

---

## iOS Build Timeline

After these changes merge:
1. Build and sync: `npm run build && npx cap sync ios`
2. Upload to TestFlight via Xcode
3. Wait 24-48h for GA4 user properties to populate

No database changes required - all client-side.
