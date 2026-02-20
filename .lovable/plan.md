
## Beta Tester Feedback: Analysis & Recommendations

Based on reviewing the screenshots and the codebase in depth, here is a clear breakdown of every issue raised, what is actually happening technically, and what I recommend — including what I will change in code and what I am recommending you consider rather than build right now.

---

## Issue 1: Unit System Setting — Hard to Discover

### What happened
Aaron did not realize he could change weight units. He set up his account (likely skipping the onboarding unit preference step, or it wasn't memorable enough), then couldn't find where to change it. You pointed him to Settings > Display, which works — but he had to restart the app after saving before the progress tab reflected the new unit.

### What the code does today
- `DisplaySettings.tsx` saves the unit to `persistentStorage` (Capacitor Preferences) immediately on toggle.
- `ProgressScreen.tsx` loads the unit on mount AND re-loads it on `document.visibilityState === 'visible'` (a visibility change event).
- The `MetricLogModal` also loads the unit on `open`.

### The restart bug (confirmed real)
The `visibilitychange` event fires reliably on iOS/web when you switch tabs. On Android with persistent tabs, navigating between the bottom nav tabs does NOT trigger `visibilitychange` — the tabs are mounted and kept alive, so the event never fires when returning to the Progress tab from Settings. This is why Aaron needed to restart the app.

### What I will fix
In `ProgressScreen.tsx`, replace the `visibilitychange` listener with a React Query cache invalidation or a simple `useEffect` that re-reads persistent storage when the component regains focus — using `useAppActive` or React Router's `location` key, both of which already exist in the codebase. The cleanest solution is to add a React Query `staleTime: 0` and call `refetch` on `queryClient` when the component remounts, combined with reading the unit preference inside the query function rather than a separate effect.

The simpler targeted fix: use the existing `useAppStateSync` pattern to trigger a re-read of persistent storage preferences when the app comes back to focus from any navigation event.

### Discoverability
The setting is in Settings > Display under "Body Measurements." This is the right place for it. A small helper text note in the weight log modal like "Unit set in Settings > Display" with a link would make this self-documenting. I will add that.

---

## Issue 2: Progress Tab Doesn't Update After Logging Without Restart

### What happened
Aaron pressed Save in the Log Today modal and the Progress tab did not update until he restarted the app.

### What the code does
`MetricLogModal` calls `onSuccess()` after saving, which is passed in from `ProgressScreen`. Looking at how `ProgressScreen` uses `MetricLogModal`, the `onSuccess` prop calls `refetchEntries()` from React Query. This should work — but on Android, the `refetchEntries()` call may be invalidating the cache correctly while the component is rendered within a persistent tab that is not remounting. React Query's `refetch` should still cause a re-render.

### What I will fix
Add an explicit `queryClient.invalidateQueries(['progress-entries'])` call inside `MetricLogModal.handleSave` after the successful save, in addition to calling `onSuccess`. This guarantees the cache is busted regardless of the persistent tab architecture. This is a one-line addition.

---

## Issue 3: Missing Half-Life Data — Testosterone Decanoate & Undecanoate

### What Aaron reported
Searching "testosterone decanoate" returns no result in the compound selector. "Testosterone undecanoate" also not found.

### What the code actually has
Looking at `halfLifeData.ts`:
- `testosterone undecanoate` IS in the data (line 172–178): 21-day half-life (Nebido/injectable form)
- `testosterone decanoate` is NOT in the data by that exact name

The search issue is likely fuzzy-matching. The `getHalfLifeData` function checks if the input name contains the key OR if the key contains the input. Since "testosterone decanoate" is not a key and none of the existing keys contain "decanoate" as a standalone word (only `nandrolone decanoate` and inside `sustanon`'s notes), it falls through with no match.

Additionally, the compound autocomplete list in `AddCompoundScreen.tsx` does not include "Testosterone Decanoate" or "Testosterone Undecanoate" as standalone entries — only "Testosterone Cypionate," "Testosterone Enanthate," "Testosterone Propionate," and "Testosterone Gel." This explains why Aaron couldn't find them in the dropdown.

### What I will add to the codebase

**In `halfLifeData.ts`** — add:
- `testosterone decanoate`: ~6-7 day half-life (Neotest 250, component of Sustanon). This is a well-documented ester.
- Aliases: `test decanoate`, `test d`

**In `AddCompoundScreen.tsx`** — add to the `COMMON_PEPTIDES` list and `OIL_BASED_COMPOUNDS` list:
- `Testosterone Decanoate`
- `Testosterone Undecanoate` (already has half-life data, just missing from autocomplete list)
- `Testosterone Isocaproate` (component of Sustanon, sometimes used standalone)
- `Testosterone Phenylpropionate` (another Sustanon component sometimes standalone)

These are all legitimate, commonly used compounds. Not illegal. Testosterone esters are prescription medications used in TRT/HRT globally.

---

## Issue 4: Testosterone Blends — How to Handle Them

### What Aaron reported
He uses a custom blend: Test Phenylpropionate (PP) + Enanthate (E) + Cypionate (C) + Undecanoate (U). He's had to log each ester as a separate compound, which creates four separate dose entries per day and four separate half-life curves. His suggestion: total them up and show a single combined curve.

### Is this common?
Yes — testosterone blends are very common in TRT and performance use:
- **Sustanon 250**: Test Propionate (30mg) + Test Phenylpropionate (60mg) + Test Isocaproate (60mg) + Test Decanoate (100mg). One of the most widely prescribed testosterone products in Europe, Australia, and many other markets.
- **Omnadren**: Similar 4-ester blend used in Eastern Europe.
- **Nebido**: Single-ester (undecanoate) long-acting injectable.
- Custom blends from compounding pharmacies are common in the US.

This is not an edge case. Sustanon alone has millions of users globally.

### My recommendation — two-part approach

**Part 1 (implement now — low complexity):** Add "Sustanon 250" and "Omnadren" to the autocomplete list and give them accurate combined half-life data. Sustanon already HAS an entry in `halfLifeData.ts` (line 307–313) with a blended 15-day half-life. It just needs to be added to the `COMMON_PEPTIDES` autocomplete in `AddCompoundScreen`. Sustanon 250 users can then log it as a single compound and get a meaningful combined curve.

**Part 2 (defer — higher complexity):** A true "Blend Builder" where a user defines multiple esters with their percentages and the app calculates a weighted combined pharmacokinetic curve. This is technically feasible using the existing Bateman equation model — you would sum the curves for each ester with their respective doses and half-lives. However, this is a significant UI and data-modeling effort. I recommend deferring this until after HealthKit integration, per the existing roadmap in memory files. For now, the workaround of using Sustanon or entering a custom name is sufficient.

---

## Issue 5: mg/mL Required Validation

### What happened
Aaron saved a compound without entering mg/mL in the oil calculator, which left the mL draw field empty, causing the Today screen to show an incorrect daily dose (500mg displayed as if daily when it was a weekly total entered via the calculator's weekly mode).

### What the code does
Looking at `AddCompoundScreen.tsx`, the `doseInputMode` can be `'weekly'` which calculates a per-injection dose using mg/mL concentration. If the user does not fill in the concentration field (`concentration`), the calculation likely falls back to using the weekly total as the dose amount directly, or saves 0/undefined for the mL value.

### What I will add
When `doseInputMode === 'weekly'` AND the oil calculator is active, the concentration field (`mg/mL`) should be required before the Save button becomes enabled. I will add validation to the save handler that checks: if the user is using the weekly total mode and has not entered a concentration, show a clear inline error ("Enter mg/mL concentration to calculate your per-injection dose") and disable the Save button. This is the same pattern already used for the weight log modal (Save is disabled when weight is empty).

---

## Summary of Code Changes

### What I will implement

1. **Fix progress tab not refreshing after log save** — Add `queryClient.invalidateQueries` inside `MetricLogModal.handleSave` (one line).

2. **Fix settings unit change not reflecting in progress tab without restart** — Replace the unreliable `visibilitychange` listener in `ProgressScreen` with a reliable focus-based re-read using the existing `useAppActive` hook pattern.

3. **Add missing testosterone esters to autocomplete and half-life data** — Add `Testosterone Decanoate`, `Testosterone Undecanoate`, `Testosterone Isocaproate`, `Testosterone Phenylpropionate` to both the compound autocomplete list and `halfLifeData.ts`.

4. **Make mg/mL required when using weekly total mode** — Add validation in `AddCompoundScreen` that blocks saving without a concentration value when using the oil calculator's weekly input mode.

5. **Add "Sustanon 250" to the autocomplete list** — It already has accurate half-life data; it just needs to appear in the dropdown.

### What I am NOT implementing now (recommendations only)

- **Blend builder** — Deferred. Sustanon/Omnadren cover the most common blends. Custom blends are complex to model correctly.
- **Settings discoverability UX change** — The Settings > Display path is correct. I'll add a small hint text in the weight log modal pointing there, but no structural navigation changes.
- **Stone unit for weight** — Aaron mentioned Stone as a unit. This is primarily used in the UK/Ireland. It is a valid addition but low priority for now given your audience. Worth noting for a future update.
