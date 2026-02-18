

# Jay's Beta Feedback - Bug Fixes and Improvements

Great feedback from Jay! Here's my analysis and plan for each issue, organized by priority.

---

## 1. Edit Dose Modal - UI Bug (Quick Fix)

**Issue:** In the first screenshot, the Time input field's border extends beyond the card edges, creating a visual overflow.

**Root Cause:** The `DoseEditModal` uses a plain `<Input type="time">` with a `Clock` icon positioned absolutely. On iOS, native time inputs can render wider than their container.

**Fix:** Add `overflow-hidden` to the time input container and ensure the input respects the container width with proper box-sizing. This is a small CSS tweak in `DoseEditModal.tsx`.

---

## 2. "Edit Protocol Adds Extra Entry to Same Day" (Bug)

**Issue:** When Jay edits a dose via "Edit Dose" and chooses "Update schedule for all future doses," the `saveAndUpdateSchedule` function updates all future untaken doses -- but after `onDoseUpdated` calls `loadDoses()`, the UI may show a duplicate because the dose regeneration logic or the compound time update creates a new dose row for the same day.

**Root Cause:** In `saveAndUpdateSchedule()`, the compound's `time_of_day` array gets updated, but if the old time and new time are different, the `doses` table may end up with both the original (updated) dose AND a newly generated one if any background regeneration triggers. Additionally, the update query uses `gte` (greater than or equal) on `scheduled_date`, which could update doses that were already handled.

**Fix:**
- Add a database-level guard: before saving, query for existing doses on the same compound + date to prevent duplicates
- After updating future doses, explicitly deduplicate by checking for multiple untaken doses on the same compound + date + time
- Add a `useRef` guard to prevent rapid double-saves

---

## 3. "Can You Let Me Delete This Log Here" (Three-dot Menu)

**Analysis:** Looking at the screenshot, Jay circled the BPC-157 dose card with the three-dot menu showing "Edit Dose" and "Undo Skip." I believe Jay wants one of two things:
- He wants to **delete** a dose entry entirely (not just skip it) -- perhaps a dose that was logged incorrectly
- OR he's frustrated by accidentally triggering the three-dot menu while scrolling

**Recommendation:** Add a "Delete Dose" option to the three-dot dropdown menu for doses that have been taken or skipped. This gives users the ability to remove incorrectly logged entries. We should add a confirmation dialog before deletion.

I would NOT recommend preventing the menu from opening on scroll -- the three-dot pattern is standard. But adding "Delete Dose" with confirmation gives Jay the control he's asking for.

---

## 4. Visual Progress Section - Collapsible (Enhancement)

**Issue:** Jay says "This section is not important to me and would love the option to hide it."

**Current State:** The Medication Timeline already uses `Collapsible` from Radix. The Visual Progress card does not.

**Fix:** Wrap the Visual Progress card in a `Collapsible` component with a chevron toggle, matching the existing Medication Timeline pattern. Persist the collapsed/expanded state using `persistentStorage` so it remembers the user's preference.

---

## 5. Weight Unit Defaults to lbs (Bug)

**Issue:** The "Log Today" drawer always defaults `weightUnit` to `"lbs"` (line 70 of `LogTodayDrawerContent.tsx`) and never loads the user's preferred unit.

**Root Cause:** Unlike `MetricLogModal` (which loads from `persistentStorage`), `LogTodayDrawerContent` initializes `weightUnit` to `"lbs"` and never checks the user's saved preference. It also shows a dropdown to switch units every time, which is unnecessary.

**Also:** The weight value shows "207.2342795" -- an absurd number of decimal places caused by the kg-to-lbs conversion (94 kg x 2.20462 = 207.23...). The display needs rounding.

**Fix:**
- On mount, load the user's preferred unit from `persistentStorage` (key: `weightUnit`), with database fallback to `profiles.current_weight_unit`
- Remove the unit selector dropdown -- just show the unit as a static label (users can change in Settings)
- Round displayed weight values to 1 decimal place max
- Apply the same fix in `MetricLogModal` for consistency (it already loads from storage but still shows ugly decimals if converting)

---

## 6. Swipe Navigation (Not Recommended Now)

**Issue:** Jay mentions no swipe navigation support.

**Analysis:** This likely refers to swiping between tabs (Today / My Stack / Progress / Settings) or swiping back to go to the previous screen. 

- **Swipe between tabs:** This is non-standard for bottom tab navigation in most iOS apps (Instagram, Spotify, etc. don't do this). It would also conflict with horizontal scrolling elements (photo carousel, calendar).
- **Swipe back (iOS gesture):** This is handled natively by Capacitor/iOS when using the navigation stack. If it's not working, it may be because the app uses client-side routing without native navigation stacks.

**Recommendation:** Skip this for now. The bottom tab bar is the standard iOS pattern. Swipe-back gesture should work automatically on iOS via the native WebView. If it's not working, it's a Capacitor-level issue, not something to solve in React.

---

## Technical Implementation Details

### Files to modify:
1. **`src/components/DoseEditModal.tsx`** - Fix time input overflow CSS
2. **`src/components/TodayScreen.tsx`** - Add "Delete Dose" option to three-dot menu; add duplicate prevention guard on dose edit callback; add `useRef` guard for rapid clicks
3. **`src/components/LogTodayDrawerContent.tsx`** - Load weight unit from user preferences on mount; remove unit dropdown; round weight display
4. **`src/components/ProgressScreen.tsx`** - Wrap Visual Progress in Collapsible; persist state
5. **`src/components/progress/MetricLogModal.tsx`** - Round weight display for consistency

### Database changes: None required

### Estimated scope:
- Fixes 1, 4, 5: Small, straightforward -- can be done together quickly
- Fix 2 (duplicate doses): Moderate -- needs careful logic to prevent race conditions
- Fix 3 (delete dose): Moderate -- needs confirmation dialog and proper cleanup (notifications, streak recalc)
- Fix 6: Deferred

