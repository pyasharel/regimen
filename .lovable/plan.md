

## Free Tier Messaging + Post-Cancellation Restrictions

### 1. Update the Free Plan Banner (PreviewModeBanner)

**Current messaging** (what you see now):
- Title: "Free Plan"  
- Subtitle: "Subscribe for reminders on all X compounds" or "Subscribe to unlock all features"

**Problem:** Doesn't communicate what free users actually get, and doesn't clearly show the value gap.

**Proposed messaging options:**

**Option A (Recommended - Clear value statement):**
- Title: "Free Plan -- Track 1 Compound"
- For users with 1 compound: "Subscribe to add more compounds and unlock reminders"
- For users with 2+ compounds (post-cancellation): "Subscribe to track all [X] compounds with reminders"

**Option B (Shorter):**
- Title: "Free Plan"
- Subtitle: "Tracking 1 compound free. Subscribe for unlimited compounds + reminders"

The key change: lead with what the free tier includes ("1 compound free") rather than just saying "Subscribe."

---

### 2. Post-Cancellation Compound Restrictions

**Current behavior:** When a subscription expires, users keep ALL compounds active. They can log doses on all of them. Only push notifications are gated (oldest compound only).

**Proposed behavior:** When a user's subscription lapses and they have multiple compounds, deactivate all but their oldest compound (by `created_at`). This means:

- Their data is preserved (nothing deleted)
- They can still VIEW all compounds in My Stack (greyed out / locked indicator)
- They can only LOG DOSES on their oldest (free) compound
- The dose toggle button on non-free compounds shows a lock icon that triggers the paywall
- They can reactivate everything by subscribing

**Implementation approach:**

1. **TodayScreen `toggleDose` gate:** Before allowing a dose to be marked taken/skipped, check if the compound is the user's "free" compound (oldest active). If not and user isn't subscribed, open the paywall instead.

2. **Visual indicator on locked doses:** Show a small lock icon or muted styling on dose cards for non-free compounds, with a tap-to-upgrade interaction.

3. **No automatic `is_active` changes:** Rather than bulk-deactivating compounds in the database (which is destructive and hard to reverse), enforce the restriction at the UI level. The compounds stay active in the DB, but the app prevents dose logging on non-free ones.

4. **Banner update:** When the user has locked compounds, the banner message becomes more specific: "Subscribe to log doses on all [X] compounds"

---

### 3. Win-Back / Retention Messaging

**Assessment:** This requires setting up scheduled backend jobs, email templates, and notification logic. It's a 2-4 hour project minimum. 

**Recommendation:** Save for a separate session. The compound restriction (item 2 above) is itself a strong win-back mechanism -- when users can't log their other compounds, that friction drives conversion naturally.

---

### Technical Details

**Files to modify:**

| File | Change |
|------|--------|
| `src/components/PreviewModeBanner.tsx` | Update title and subtitle messaging to communicate free tier value |
| `src/components/TodayScreen.tsx` | Add subscription + compound ownership check in `toggleDose` to block non-free compounds |
| `src/components/TodayScreen.tsx` | Add visual lock indicator on dose cards for non-free compounds |
| `src/contexts/SubscriptionContext.tsx` | Add helper `isFreeCompound(compoundId)` that checks if a compound is the user's oldest |
| `src/components/subscription/SubscriptionBanners.tsx` | Update subtitle logic to reflect new messaging |

**No database changes needed.** The restriction is enforced client-side by comparing compound `created_at` dates. The oldest compound (first created) is always the "free" one.

**Edge case handling:**
- User with 0 compounds: Banner says "Free Plan -- Track 1 Compound" with "Add your first compound to get started" or similar
- User with exactly 1 compound: Full access, banner says "Subscribe for reminders and unlimited compounds"
- User with 2+ compounds, not subscribed: Only oldest compound is unlockable; others show lock icon on dose cards

