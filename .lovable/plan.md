

## Android Notification Fix + Reminder-Gated Freemium

Two independent changes: (1) fix Android notifications, (2) smarter monetization.

---

### Part 1: Android Notification Fix

**The problem:** `notificationScheduler.ts` line 165 sets `sound: 'light_bubble_pop_regimen.m4a'` for all platforms. The `android/app/src/main/res/raw/` directory doesn't exist — there's no sound file for Android. Some Android versions silently fail or produce invisible notifications when a referenced sound resource is missing.

**The fix:** Make the `sound` property platform-conditional:
- iOS: keep `'light_bubble_pop_regimen.m4a'` (works today)
- Android: omit the `sound` property entirely so Android uses its system default notification sound

This is a one-line change in `scheduleDoseNotification()` using `Capacitor.getPlatform()`.

---

### Part 2: Monetization — Thinking Through Every User Segment

Here is every permutation and what they experience:

**Segment A: Free user, 1 compound, never trialed (the majority)**
- Current: sees "Preview Mode — Subscribe for unlimited access" banner, full reminders for their 1 compound
- Problem: the banner copy is vague — it doesn't tell them WHY they should upgrade
- Change: Update the PreviewModeBanner subtitle to rotate through specific premium benefits:
  - "Track multiple compounds with reminders"  
  - "Unlock progress photos and medication levels"
  - "Add more compounds to your stack"
- This educates users on what premium offers, without being pushy
- Banner still dismisses per session (sessionStorage) and returns on next app open — no change to that behavior

**Segment B: Free user, 0 compounds**
- No changes. Onboarding guides them to add their first compound. Paywall hits if they try to add a second.

**Segment C: Trialed, canceled, has 2+ compounds (the exploit case)**
- Current: full reminders for ALL compounds forever, just can't add/edit
- Change: Reminders only fire for their OLDEST compound (first added). Other compounds remain visible, doses can still be logged manually, but no push notifications
- The preview banner copy becomes contextual: "Reminders for [First Compound] only — Subscribe for all"
- No new popups, no blocking modals. The natural loss of automation is the conversion lever

**Segment D: Trialed, canceled, has 1 compound**
- Same as Segment A. Full reminders for their 1 compound, preview banner shows. No friction beyond the banner.

**Segment E: Active subscriber**
- No changes. Full access, no banners.

**Segment F: Past due / canceled with time remaining**
- No changes. Existing banners for these states already work well.

#### Where upgrade messaging appears (and where it does NOT)

1. **PreviewModeBanner (top of screen)** — already exists, already reappears each session. We just improve the copy to be benefit-specific instead of generic. For users with 2+ compounds, the copy becomes compound-aware.

2. **No new Today Screen inline card** — after thinking it through, for the majority of free users (1 compound), this card would never show. For the minority with 2+ compounds, the banner copy change + missing reminders is sufficient friction. Adding another UI element would feel cluttered.

3. **No periodic popup modals** — this would feel cheap and hurt the premium brand positioning. The persistent-but-dismissable banner is the right balance.

4. **Calculator to stack flow** — already gated. When a user tries to add a compound from the calculator and they already have 1, `canAddCompound()` triggers the paywall. No changes needed.

#### Technical implementation

**File 1: `src/utils/notificationScheduler.ts`**
- In `scheduleDoseNotification()`: wrap `sound` property with platform check (iOS keeps custom, Android uses default)
- In `scheduleAllUpcomingDoses()`: accept new optional param `freeCompoundId?: string`. When provided, filter out doses whose `compound_id` doesn't match before scheduling. All existing reconciliation logic stays the same.

**File 2: `src/hooks/useAppStateSync.tsx`**
- When calling `scheduleAllUpcomingDoses()`, pass `freeCompoundId` if user is not subscribed. Determine the oldest compound by querying compounds ordered by `created_at ASC LIMIT 1`.

**File 3: `src/hooks/useNotificationPermissionPrompt.ts`**
- Same change — pass `freeCompoundId` when calling `scheduleAllUpcomingDoses()` after permission grant.

**File 4: `src/components/PreviewModeBanner.tsx`**
- Accept optional `compoundCount` and `freeCompoundName` props
- If `compoundCount > 1`: show "Reminders for [freeCompoundName] only — Subscribe for all [N] compounds"
- If `compoundCount <= 1` or not provided: rotate through benefit-focused subtitles

**File 5: `src/components/subscription/SubscriptionBanners.tsx`**
- Fetch compound count and oldest compound name, pass to `PreviewModeBanner`

**File 6: Other callers of `scheduleAllUpcomingDoses()`**
- `DoseEditModal.tsx`, `AddCompoundScreen.tsx`, `TodayScreen.tsx`, `NotificationsSettings.tsx` — pass `freeCompoundId` when applicable

No database changes needed. No new tables, no schema modifications.

