# Titration Schedule Feature — Design Document

> **Status:** Shelved (revisit when demand increases)  
> **Last updated:** 2026-02-13  
> **Related DB columns:** `compounds.has_titration`, `compounds.titration_config`

---

## 1. Current Database State

The `compounds` table already has two columns ready for this feature:

- **`has_titration`** (boolean, default null) — flag indicating whether a compound uses a titration schedule
- **`titration_config`** (JSONB, default null) — intended to store an array of phase objects

These columns exist in production but are **completely unused by the UI**. No frontend code reads or writes to them.

## 2. Original Vision

A multi-step titration planner where users define phases for gradual dose increases:

```
Phase 1: Week 1–2  → 0.25 mg
Phase 2: Week 3–4  → 0.50 mg
Phase 3: Week 5–8  → 1.00 mg
Phase 4: Week 9+   → 1.50 mg
```

The idea was that doses would auto-generate at the correct amount for each phase, and the Today screen would show which phase the user is currently in.

## 3. UX Blockers That Stalled Development

### 3a. Mid-Schedule Edits
What happens when a user changes a phase that's already in progress or in the past?
- Does editing Phase 2's duration shift Phase 3 and 4 start dates?
- Do already-generated doses get retroactively updated?
- What if a user wants to skip a phase or insert a new one?

### 3b. Start Date Cascading
Phases are sequential. Changing the duration of any phase cascades into every subsequent phase's start date. This creates a complex state management problem, especially when doses have already been generated for future phases.

### 3c. Reactive vs. Planned Titration
Most users **don't know their titration schedule ahead of time**. They titrate based on:
- Side effects (or lack thereof)
- Lab results
- How they feel
- Provider guidance at follow-up appointments

A rigid phase planner feels over-engineered for this majority. The feature would primarily serve users on well-defined protocols (e.g., GLP-1 agonists with standard titration schedules like Cagrisema).

### 3d. Complexity vs. Value
Building this properly requires:
- Phase CRUD UI
- Dose regeneration logic per phase
- Phase-aware Today screen
- Edge case handling for mid-cycle edits
- Migration path for existing compounds

The engineering cost is high relative to the number of users who would benefit immediately.

## 4. Manual Workaround (Current Solution)

Users can **edit their compound's dose amount** whenever they titrate up or down. This is simple, requires zero new UI, and covers the vast majority of real-world use cases.

**Steps:**
1. Go to My Stack → tap the compound
2. Edit the dose amount to the new titration level
3. Future doses generate at the new amount

**Limitation:** There's no historical record of previous dose levels within the compound itself (though the `doses` table does store the actual amount logged at each dose, so a retrospective view is technically possible).

## 5. When to Revisit

Consider picking this back up if:
- **3+ users** independently request titration scheduling
- A **"dose history log"** feature is built that naturally supports viewing dose amount changes over time (this would solve the "no historical record" limitation above)
- A **protocol library** is added where standard titration schedules (e.g., Ozempic, Mounjaro, Cagrisema) could be pre-loaded — this would reduce the UX burden since users wouldn't have to manually define phases

## 6. Beta Tester Context

- **User "No_RealPoint"** (Reddit) specifically requested this for **Cagrisema titration** (2.5 mg → 15 mg over several weeks)
- His use case is one of the clearest since GLP-1 titration schedules are well-defined by the manufacturer
- He was informed about the manual workaround (editing dose amounts) as an interim solution
- He was also informed about the **custom compound name** feature for entering "Cagrisema" since it's not in the default medication list

## 7. Technical Notes for Future Implementation

If revisited, consider a **lighter approach**:
- Instead of a rigid phase planner, offer a simple "Schedule dose change" feature: "On [date], change dose to [amount]"
- This avoids the cascading phase problem entirely
- Could be stored as a simple array in `titration_config`: `[{ date: "2026-03-01", dose: 0.5 }, { date: "2026-03-15", dose: 1.0 }]`
- The dose generation logic just checks: "What's the active dose amount for this date?" and uses that instead of `compound.intended_dose`
