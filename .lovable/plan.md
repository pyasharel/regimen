
# Plan: Comprehensive RevenueCat Attribution & Analytics Enhancement

## Overview
Enhance RevenueCat subscriber attributes with comprehensive user engagement data for better cohort analysis, segmentation, and understanding what drives conversions. Also increment build number to 32 for the new release.

---

## Part 1: Build Number Increment

### File: `capacitor.config.ts`
**Line 6**: Change build number from 31 to 32

```typescript
export const appBuild = '32';
```

---

## Part 2: RevenueCat Dashboard Configuration (Manual Steps)

### Apple Search Ads Attribution
This gives you **campaign name, ad group, keyword, and creative** data for users who came from your Apple Ads.

**Steps (no code needed):**
1. Go to RevenueCat Dashboard → Your Project → Integrations
2. Find "Apple Search Ads" and enable it
3. Click "Connect with Apple" and authenticate with your Apple Search Ads account via OAuth
4. Once connected, RevenueCat will automatically collect attribution for all new users

**Data you'll see per customer:**
- `$campaign` - Campaign name (e.g., "TRT Keywords Q1")
- `$adgroup` - Ad group name
- `$keyword` - The exact search term they used
- `$creative` - Creative set name

This works via the AdServices framework and does NOT require ATT opt-in.

---

## Part 3: Enhanced RevenueCat Attributes (Code Changes)

### Current State
Already syncing:
- `$displayName`, `$email`
- `utm_source`, `utm_medium`, `utm_campaign`
- `platform`, `app_version`
- `country_code`, `locale`
- `partner_code` (when applicable)

### New Attributes to Add

| Attribute | Value | Analytics Value |
|-----------|-------|-----------------|
| `signup_date` | ISO date (YYYY-MM-DD) | Cohort analysis - LTV by signup month |
| `compounds_count` | Number | Power user indicator - more compounds = deeper engagement |
| `total_sessions` | Number | Return frequency - how sticky is the app? |
| `total_doses_logged` | Number | Core value engagement - are they using the main feature? |
| `days_since_signup` | Number | User maturity - fresh vs veteran users |
| `onboarding_completed` | "true"/"false" | Funnel completion analysis |
| `experience_level` | "beginner"/"intermediate"/"advanced" | User segmentation by self-reported skill |
| `path_type` | "glp1"/"protocol" | Product-market fit by user type |

---

## Implementation Details

### File: `src/contexts/SubscriptionContext.tsx`

#### Location: `identifyRevenueCatUser` function (starting around line 700)

#### Changes Required:

**1. Expand profile query (around line 718-722)**

```typescript
// Current:
const { data: profile } = await supabase
  .from('profiles')
  .select('full_name')
  .eq('user_id', userId)
  .single();

// Updated:
const { data: profile } = await supabase
  .from('profiles')
  .select('full_name, created_at, onboarding_completed, experience_level, path_type')
  .eq('user_id', userId)
  .single();
```

**2. Add new attribute sync block (after existing UTM/platform sync, around line 768)**

```typescript
// Sync comprehensive engagement attributes to RevenueCat
try {
  const engagementAttrs: Record<string, string> = {};
  
  // Profile-based attributes
  if (profile) {
    // Signup date for cohort analysis
    if (profile.created_at) {
      const signupDate = profile.created_at.split('T')[0]; // YYYY-MM-DD
      engagementAttrs.signup_date = signupDate;
      
      // Calculate days since signup
      const signupTime = new Date(profile.created_at).getTime();
      const daysSinceSignup = Math.floor((Date.now() - signupTime) / (1000 * 60 * 60 * 24));
      engagementAttrs.days_since_signup = String(daysSinceSignup);
    }
    
    // Onboarding completion status
    if (profile.onboarding_completed !== null) {
      engagementAttrs.onboarding_completed = String(profile.onboarding_completed);
    }
    
    // User segmentation attributes
    if (profile.experience_level) {
      engagementAttrs.experience_level = profile.experience_level;
    }
    if (profile.path_type) {
      engagementAttrs.path_type = profile.path_type;
    }
  }
  
  // Session count from localStorage (tracks how often they return)
  const sessionCount = localStorage.getItem('regimen_session_count');
  if (sessionCount) {
    engagementAttrs.total_sessions = sessionCount;
  }
  
  // Set profile-based attributes
  if (Object.keys(engagementAttrs).length > 0) {
    await Purchases.setAttributes(engagementAttrs);
    console.log('[RevenueCat] Engagement attributes set:', engagementAttrs);
  }
  
  // Compound count (requires separate query)
  const { count: compoundsCount } = await supabase
    .from('compounds')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  
  await Purchases.setAttributes({
    compounds_count: String(compoundsCount || 0),
  });
  console.log('[RevenueCat] compounds_count set:', compoundsCount);
  
  // Total doses logged (engagement depth)
  const { count: dosesCount } = await supabase
    .from('doses')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('taken', true);
  
  await Purchases.setAttributes({
    total_doses_logged: String(dosesCount || 0),
  });
  console.log('[RevenueCat] total_doses_logged set:', dosesCount);
  
} catch (engagementError) {
  console.warn('[RevenueCat] Could not set engagement attributes:', engagementError);
  // Don't fail the identify flow if engagement sync fails
}
```

---

## Import Required

No new imports needed - `Purchases`, `supabase`, and `Capacitor` are already imported in SubscriptionContext.tsx.

---

## Data You'll See in RevenueCat Dashboard

After implementation, each customer profile will show:

**Attribution (from Apple Search Ads integration):**
- Campaign name
- Ad group
- Keyword (what they searched!)
- Creative set

**User Profile:**
- Name, email
- Platform (iOS/Android)
- App version
- Country, locale

**Engagement Metrics:**
- Signup date
- Days since signup
- Total sessions (return frequency)
- Compounds count
- Total doses logged
- Onboarding completed

**Segmentation:**
- Experience level (beginner/intermediate/advanced)
- Path type (glp1/protocol)
- Partner code (if applicable)

---

## What You Can Do With This Data

1. **Cohort Analysis**: Filter revenue by `signup_date` to see which months have best LTV
2. **Engagement Correlation**: See if users with more `compounds_count` or `total_doses_logged` convert at higher rates
3. **Return Frequency**: Segment by `total_sessions` to find your power users
4. **Keyword Performance**: (After Apple Search Ads integration) See which keywords drive paying users
5. **Partner Attribution**: Track which partner codes lead to conversions
6. **Path Type Segmentation**: Compare GLP-1 users vs Protocol users for conversion rates

---

## Limitations / What We Can't Get

| Data | Reason |
|------|--------|
| City/region | Privacy - only country from locale detection |
| Age/gender | Not collected |
| Organic search keywords | Only paid Apple Search Ads keywords via AdServices |
| Device model | RevenueCat collects this automatically, no code needed |
| OS version | RevenueCat collects this automatically, no code needed |

---

## Files Modified

| File | Changes |
|------|---------|
| `capacitor.config.ts` | Increment build to 32 |
| `src/contexts/SubscriptionContext.tsx` | Add comprehensive engagement attributes to RevenueCat sync |

---

## Risk Assessment

- **Low risk** - All new attribute syncing is wrapped in try/catch
- Failures won't affect subscription flow
- No database schema changes
- Works identically on iOS and Android

---

## Post-Implementation Steps

### Code Deployment
```bash
git pull
./sync-version.sh
npm run build
npx cap sync
```

Then for each platform:
- **iOS**: `npx cap open ios` → Archive → Distribute
- **Android**: `npx cap open android` → Build → Generate Signed Bundle (AAB)

### Dashboard Configuration
1. Go to RevenueCat Dashboard → Integrations → Apple Search Ads
2. Enable and connect with Apple OAuth
3. This unlocks campaign/keyword attribution automatically
