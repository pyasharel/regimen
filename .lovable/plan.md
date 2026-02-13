

# Document Titration Feature for Future Reference

## Summary

Create a design document in `.storage/memory/features/` capturing everything we know about the titration feature: what exists in the database, what was never built in the UI, the UX challenges that blocked us, and the manual workaround users can use today.

## What the Document Will Cover

1. **Current database state** -- `has_titration` (boolean) and `titration_config` (JSONB) columns already exist on the `compounds` table but are unused by the UI
2. **Original vision** -- Multi-step titration schedule where users define phases (e.g., Week 1-2 at 0.25mg, Week 3-4 at 0.5mg, etc.)
3. **UX blockers that stalled the feature**:
   - What happens when a user edits a phase mid-schedule? Does it shift all future phases?
   - How do start dates cascade when one phase is modified?
   - Most users titrate reactively based on results, not on a pre-planned schedule, making a rigid planner feel over-engineered
4. **Manual workaround** -- Users can simply edit their compound's dose amount whenever they titrate up/down. This covers the majority of real-world use cases.
5. **When to revisit** -- If multiple users request it, or if a "dose history log" feature is added that would naturally support phase tracking
6. **Beta tester context** -- User feedback from "No_RealPoint" specifically requested this for Cagrisema titration (2.5mg to 15mg over weeks)

## File Created

- `.storage/memory/features/titration-schedule-design-doc.md`

## No Code Changes

This is a documentation-only task. No UI or database modifications.

