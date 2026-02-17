

## Fix Lock Bug, Add Retention Nudges, Tighten Cycle Messaging

### Part 1: Fix the Lock Bug (Critical)

**Problem:** When a free user adds their first compound, the dose card shows as locked and the banner still says "Add your first compound to get started." This happens because `freeCompoundId` in `SubscriptionContext` only re-fetches when `isSubscribed` or `subscriptionStatus` changes -- neither changes when a compound is added.

**Fix:** Add a `refreshFreeCompound()` function to `SubscriptionContext` that can be called manually. It increments an internal counter that the fetch effect depends on, triggering a re-fetch.

| File | Change |
|------|--------|
| `src/contexts/SubscriptionContext.tsx` | Add `refreshFreeCompound()` to context. Add a `freeCompoundRefreshKey` state the fetch effect depends on. |
| `src/components/AddCompoundScreen.tsx` | After saving a compound, call `refreshFreeCompound()`. |
| `src/components/TodayScreen.tsx` | After `loadDoses` completes, call `refreshFreeCompound()` so the lock state is always current on screen load. |
| `src/components/subscription/SubscriptionBanners.tsx` | Listen to `freeCompoundId` changes (or a refresh key) to re-fetch compound count, so the banner text updates without a page reload. |

### Part 2: Retention Push Notifications for Early Users

These are phone-level push notifications (lock screen), not in-app banners.

**Set A: "Add Your First Compound" nudges** (for users who finish onboarding with 0 compounds)

| Notification | When | Message |
|---|---|---|
| Nudge 1 | Next day, 11 AM | "Your protocol tracker is ready. Add your first compound to start tracking." |
| Nudge 2 | 3 days later, 7 PM | "It takes 30 seconds to set up. Add a compound and never miss a dose." |

- **11 AM rationale:** Past the morning rush. People are settled in, checking their phone during a mid-morning break. Not quite lunch (which can be hectic), but past the "getting kids ready / commuting" window.
- **7 PM rationale:** Post-commute, post-dinner prep. People are winding down, scrolling their phone. More receptive than 6 PM (still transitioning from work) and less intrusive than 8-9 PM (personal time).
- Both fire only once ever (throttle = 9999 days).
- Both are cancelled immediately when the user adds their first compound.

**Set B: "Add More Compounds" encouragement** (for trial users with exactly 1 compound)

| Notification | When | Message |
|---|---|---|
| Encourage | 2 days after first compound, 11 AM | "You can track unlimited compounds on your plan. Add another to get the full experience." |

- Only fires if user is on trial AND has exactly 1 compound at schedule time.
- Cancelled if user adds a 2nd compound before it fires.
- Throttle: 30 days.

**Why not more nudges (2 weeks, 1 month later)?** By then, users who haven't added a compound are likely uninstalled or disengaged. Two well-timed nudges in the first 3 days is the highest-leverage window. Adding more risks feeling spammy and hurting the brand. If the first two don't convert, a re-engagement notification (already implemented, fires after dosing gap + 1 day) catches them later anyway.

**Relevance safeguards:**
- Before each notification fires, the scheduling function checks current state. But since these are local notifications (they fire even if the app is closed), the real safeguard is cancelling them proactively when the user takes the action (adds a compound).
- `cancelCompoundNudges()` is called in `AddCompoundScreen.tsx` on save.
- `cancelAddMoreEncouragement()` is called when a 2nd compound is added.

### Part 3: Cycle Off-Phase Notification Messaging

**Current:** "Off-Phase Begins" with body "Off-phase begins today. Next cycle resumes on..."

**Updated:** "Cycle Off-Phase Begins" with body "Your off-phase starts today. Next cycle resumes on..."

Also tightening "Cycle Ending Soon" body copy. The advance warning body currently says "Your cycle ends in X days. Off-phase begins on [date]." which is clear and good -- keeping that.

### Part 4: Weekly Upcoming Doses Summary (Recommendation)

This is a good idea but needs deeper thinking. The current `scheduleWeeklyCheckin` sends a generic "Another week in the books!" message on Sundays. Enhancing it to include "You have X injections this week" requires querying the dose schedule at notification fire time, which local notifications can't do (they're static text set at schedule time). 

**Two options:**
1. **Schedule-time snapshot:** When scheduling the Sunday notification, query upcoming doses for the next 7 days and bake that count into the notification body. Downside: if the user changes their schedule after scheduling, the count could be stale.
2. **Keep it simple for now:** The existing weekly check-in with streak stats already provides value. We can enhance it to include a dose count snapshot.

**Recommendation:** Go with option 1 (snapshot at schedule time) since most users don't change their schedule week to week. This can be done in the existing `scheduleWeeklyCheckin` function. But this adds complexity to an already large change set, so I'd suggest tackling it as a fast follow-up rather than bundling it here.

---

### Technical Details

**New notification types in `engagementNotifications.ts`:**

| Type | ID | Throttle |
|---|---|---|
| `nudge_add_compound` | 90050 | Once ever |
| `nudge_add_compound_2` | 90051 | Once ever |
| `encourage_add_more` | 90052 | 30 days |

**Files to modify:**

| File | Change |
|------|--------|
| `src/contexts/SubscriptionContext.tsx` | Add `refreshFreeCompound` function and `freeCompoundRefreshKey` counter to context |
| `src/components/AddCompoundScreen.tsx` | Call `refreshFreeCompound()` after save. Call `cancelCompoundNudges()`. If trial user with 1 compound, call `scheduleAddMoreEncouragement()`. |
| `src/components/TodayScreen.tsx` | Call `refreshFreeCompound()` after `loadDoses`. |
| `src/components/subscription/SubscriptionBanners.tsx` | Re-fetch compound count when `freeCompoundId` changes (add it as a dependency to the fetch effect). |
| `src/utils/engagementNotifications.ts` | Add 3 new notification types, `scheduleCompoundNudges()`, `cancelCompoundNudges()`, `scheduleAddMoreEncouragement()`, `cancelAddMoreEncouragement()`. |
| `src/components/onboarding/OnboardingFlow.tsx` | In `handleComplete`, call `scheduleCompoundNudges()`. |
| `src/utils/cycleReminderScheduler.ts` | Update "Off-Phase Begins" title to "Cycle Off-Phase Begins". Update body to "Your off-phase starts today." |

**Edge cases covered:**

| Scenario | Behavior |
|---|---|
| User adds compound before nudge fires | Nudges cancelled in `AddCompoundScreen` |
| User adds 2nd compound before encouragement fires | Encouragement cancelled |
| Free user adds first compound | `refreshFreeCompound()` updates ID immediately, no lock |
| Free user with 1 compound, banner | Shows "Subscribe for unlimited compounds" (not "add your first") |
| Subscribed/trialing/active users | No nudge notifications scheduled, no lock icons, no free tier banner |
| User deletes only compound | Nudges don't re-fire (throttled forever) |
| Weekly summary enhancement | Deferred to follow-up session |

