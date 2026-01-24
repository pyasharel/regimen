

## Complete Analytics & Attribution Enhancement Plan

### Overview
This plan adds attribution persistence, RevenueCat enrichment, engagement snapshots, and provides Apple Search Ads guidance to enable full user journey analysis and cohort understanding.

---

### Part 1: Persist Attribution to Database

**Goal**: Store UTM data in Supabase so you can run SQL queries on "which source drives the most conversions"

**Database Migration:**
```sql
-- Add attribution columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS utm_source TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS utm_medium TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS utm_campaign TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS utm_content TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referrer TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS landing_page TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS attributed_at TIMESTAMPTZ;
```

**Code Changes:**

**File: `src/pages/Auth.tsx`**
- After successful signup, retrieve stored attribution from sessionStorage
- Update the user's profile with UTM data
- Clear sessionStorage after persisting

```typescript
// After signup success, persist attribution
const attribution = getStoredAttribution();
if (attribution && (attribution.utm_source || attribution.referrer)) {
  await supabase.from('profiles').update({
    utm_source: attribution.utm_source,
    utm_medium: attribution.utm_medium,
    utm_campaign: attribution.utm_campaign,
    utm_content: attribution.utm_content,
    referrer: attribution.referrer,
    landing_page: attribution.landing_page,
    attributed_at: new Date().toISOString(),
  }).eq('user_id', user.id);
  clearAttribution();
}
```

---

### Part 2: Enrich RevenueCat with User Details

**Goal**: See customer names and emails in RevenueCat dashboard instead of blank fields

**File: `src/contexts/SubscriptionContext.tsx`**
- In the `identifyRevenueCatUser` function, after `Purchases.logIn()`:

```typescript
// After successful login, fetch profile and set attributes
const { data: profile } = await supabase
  .from('profiles')
  .select('full_name')
  .eq('user_id', userId)
  .single();

const { data: { user } } = await supabase.auth.getUser();

// Set display name and email in RevenueCat
if (profile?.full_name) {
  await Purchases.setDisplayName({ displayName: profile.full_name });
}
if (user?.email) {
  await Purchases.setEmail({ email: user.email });
}

// Also set attribution as custom attributes
const attribution = getStoredAttribution();
if (attribution?.utm_source) {
  await Purchases.setAttributes({
    utm_source: attribution.utm_source,
    utm_medium: attribution.utm_medium || '',
    utm_campaign: attribution.utm_campaign || '',
  });
}
```

**Result**: RevenueCat dashboard will show:
- Customer name (from profile)
- Customer email (from auth)
- UTM source/medium/campaign as custom attributes

---

### Part 3: Add Weekly Engagement Snapshot

**Goal**: Track retention metrics over time for cohort analysis

**File: `src/utils/analytics.ts`**
- Add new function:

```typescript
export const trackWeeklyEngagementSnapshot = (metrics: {
  compounds_count: number;
  doses_last_30d: number;
  photos_count: number;
  current_streak: number;
  days_since_install: number;
  subscription_status: string;
}) => {
  ReactGA.event('engagement_snapshot', {
    compounds_count: metrics.compounds_count,
    doses_last_30d: metrics.doses_last_30d,
    photos_count: metrics.photos_count,
    current_streak: metrics.current_streak,
    days_since_install: metrics.days_since_install,
    subscription_status: metrics.subscription_status,
  });
};
```

**File: `src/hooks/useAppStateSync.tsx`**
- Add weekly check on app resume
- If more than 7 days since last snapshot, trigger `trackWeeklyEngagementSnapshot()`
- Store last snapshot date in localStorage

---

### Part 4: Apple Search Ads Setup (Manual Steps)

**Recommended Budget**: $5/day to start, scale to $10/day after 2 weeks

**Step 1: Create Apple Search Ads Account**
1. Go to searchads.apple.com
2. Sign in with your Apple Developer account
3. Accept terms and add payment method

**Step 2: Create Discovery Campaign**
1. Create new campaign → Search Results
2. Campaign name: "Regimen - Discovery"
3. Daily budget: $5
4. Ad Group settings:
   - Search Match: ON (let Apple find keywords)
   - Audience: All Users
   - Locations: United States (start narrow)
5. Run for 2-3 weeks

**Step 3: Analyze & Optimize (Week 3+)**
1. Go to Keywords tab → see which search terms drove installs
2. Export high-performing keywords
3. Create new "Exact Match" campaign with winners
4. Pause underperforming Search Match terms

**What You'll Learn**:
- Exact keywords driving your installs
- Cost per acquisition by keyword
- Keyword opportunities you didn't know about
- Competitive keyword landscape

---

### Part 5: GA4 Landing Page Coordination

**Ensure these match between landing page and app:**

| Custom Dimension | Landing Page | App |
|-----------------|--------------|-----|
| `content_group` | `website` | `app` |
| `platform_type` | `website` | `app` |
| `calculator_type` | ✅ Same values | ✅ Same values |
| `promo_code` | ✅ Tracks | ✅ Tracks |
| `utm_source/medium/campaign` | ✅ Captured | ✅ Captured |

**Landing page additional setup (their project)**:
- Mark `download_initiated` as conversion
- Create "Calculator Users" audience
- Track `cta_location` for A/B insights

**Cross-session funnel you can build after this**:
```
Landing: page_view → calculator_completed → download_initiated
App: app_opened (with UTM) → signup_complete → subscription_started
```

---

### Part 6: Churn Analysis Queries (After Implementation)

Once attribution is persisted, you can run queries like:

```sql
-- Conversion rate by source
SELECT 
  utm_source,
  COUNT(*) as signups,
  SUM(CASE WHEN subscription_status = 'active' THEN 1 ELSE 0 END) as subscribed,
  ROUND(100.0 * SUM(CASE WHEN subscription_status = 'active' THEN 1 ELSE 0 END) / COUNT(*), 1) as conversion_rate
FROM profiles
WHERE utm_source IS NOT NULL
GROUP BY utm_source
ORDER BY signups DESC;

-- Churn analysis by onboarding path
SELECT 
  path_type,
  experience_level,
  COUNT(*) as users,
  SUM(CASE WHEN subscription_status = 'canceled' THEN 1 ELSE 0 END) as churned
FROM profiles
WHERE subscription_status IS NOT NULL
GROUP BY path_type, experience_level;
```

---

### Summary of Changes

| Component | Changes |
|-----------|---------|
| **Database** | Add 7 attribution columns to profiles table |
| **Auth.tsx** | Persist UTM data after signup |
| **SubscriptionContext.tsx** | Set RevenueCat display name, email, and attributes |
| **analytics.ts** | Add `trackWeeklyEngagementSnapshot()` function |
| **useAppStateSync.tsx** | Trigger weekly engagement snapshot |
| **Apple Search Ads** | Create $5/day discovery campaign (manual) |
| **GA4 Dashboard** | Create cross-session funnel exploration (manual) |

---

### Expected Outcomes

After implementation:
1. **RevenueCat**: Customer names and emails visible, UTM source as attribute
2. **Database**: Full attribution data for SQL analysis
3. **GA4**: Weekly engagement snapshots for retention tracking
4. **Apple Search Ads**: Keyword visibility within 2-3 weeks
5. **Cohort Analysis**: Ability to compare subscribers vs churners by source/path

