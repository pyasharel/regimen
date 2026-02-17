

## Smart In-App Rating Prompts -- Final Plan

### Key Research Answers

**Can we detect if they already rated?**
No. Neither Apple nor Google expose whether a user submitted a review. This is a deliberate privacy decision by both platforms. Our approach: track when we last *prompted* and use generous cooldowns (120 days) so we're not annoying, while relying on Apple/Google's own suppression logic (they won't show the dialog if the user already reviewed the current version).

**Can we ask for a 5-star review?**
No. Apple explicitly prohibits this -- apps that say "Give us 5 stars" or "Rate us highly" risk App Store rejection. Google has similar guidelines. The native review dialog doesn't allow any custom text. However, we *engineer* 5-star reviews by only prompting users who are clearly happy (high engagement signals).

**Should we use a pre-prompt ("Are you enjoying the app?")?**
No. Research from Critical Moments and other ASO experts shows that pre-prompt gates ("Do you like this app? Yes/No") actually *reduce* total review volume without meaningfully improving average rating. The native dialog is already the highest-trust, highest-conversion prompt available. Adding a custom screen before it introduces friction and feels like dark pattern territory. Best practice: just call the native API at the right moment for the right user.

**What about free plan users?**
Yes -- engaged free users should absolutely be prompted. They're getting real value from the app (logging doses consistently) and are likely to leave positive reviews. A free user who has been active for 2+ weeks with 15+ doses is a satisfied user. Excluding them would cut out a large segment of potential positive reviewers. The key is the engagement threshold, not the payment status.

**Trial timing fix:**
You caught a real issue. The trial is 14 days, so requiring 14 days of account age means trial users would never be prompted during their trial. Lowering to **7 days** ensures engaged trial users can be prompted in the second half of their trial -- a natural "aha moment" window where they've experienced real value.

**Testing:**
- Android: Can be tested via Play Store internal testing track (not debug builds)
- iOS: Cannot be tested in TestFlight (our code already handles this gracefully)
- Eligibility logic: Fully testable via detailed console logs showing each criterion check
- We'll add comprehensive logging so you can see exactly why a prompt was or wasn't shown

---

### Eligibility Criteria (All Must Be True)

| Criterion | Value | Rationale |
|-----------|-------|-----------|
| Account age | 7+ days | Enough to form a real opinion; catches trial users in week 2 |
| Total doses logged | 15+ | Proves meaningful, sustained engagement |
| Compounds in stack | 2+ | Power user signal (multi-compound = invested) |
| Days since last prompt | 120+ | Stays well under Apple's 3/year cap |
| Same app version | Not prompted for current version | Avoids re-asking after minor updates |
| Session | Not prompted this session | One chance per app open |
| Platform | Native only (not web) | Rating APIs don't exist on web |

### Trigger Moment

After a successful dose log on the Today screen -- specifically, after the checkmark animation completes (~2 second delay). This is the "aha moment": the user just completed their core task and feels accomplishment.

No pre-prompt dialog. No custom UI. No "Would you rate us?" screen. Just the native OS dialog appearing at the perfect moment.

### Why This Engineers 5-Star Reviews (Without Asking For Them)

The system is designed so that only happy, engaged users see the prompt:
- 15 doses = they've used the app consistently, not a tire-kicker
- 7+ days = they've had time to evaluate, not a snap judgment
- 2+ compounds = they're invested in the app's core value
- Triggered after completing a task = positive emotional state
- No store redirect fallback = if the native dialog doesn't show, nothing happens (no interruption)

### Technical Implementation

**New file: `src/hooks/useAutoRatingPrompt.ts`**
- Exposes `triggerIfEligible()` function
- Checks all criteria using existing data (compound count from state, dose count from user_stats query)
- Uses `persistentStorage` for `lastRatingPromptDate` and `lastRatingPromptVersion`
- Session guard via `useRef`
- Detailed console logging for every criterion check

**Edit: `src/components/TodayScreen.tsx`**
- Import the hook
- Call `triggerIfEligible()` after successful dose toggle (in the `!currentStatus` branch, after animation delay)
- Pass compound count from existing state

**Edit: `src/utils/ratingHelper.ts`**
- Add `'auto_prompt'` to source type
- Auto prompts always use `skipStoreFallback: true`

**Edit: `src/utils/persistentStorage.ts`**
- Add `lastRatingPromptDate` and `lastRatingPromptVersion` to `PERSISTENT_STORAGE_KEYS`

**Edit: `src/utils/analytics.ts`**
- Add `'auto_prompt'` to rating tracking source types

### Safety Nets

| Guard | Purpose |
|-------|---------|
| 120-day cooldown | Stays under Apple's 3/year hard limit |
| Once per app version | No re-asking after updates |
| Once per session | No repeated prompts in single use |
| `skipStoreFallback: true` | Never redirects to store unexpectedly |
| Apple/Google suppression | OS has its own logic on top of ours |
| 7-day + 15-dose minimum | Only asks users with real opinions |
| Console logging | Every criterion logged for debugging |
| No pre-prompt UI | No custom dialogs, just native OS prompt |

