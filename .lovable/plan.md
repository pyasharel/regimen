
# Fix: 5 AM (and any pre-6 AM) Doses Showing Under "Evening"

## The Bug

A user emailed reporting that peptides scheduled for 5 AM show as "Evening" instead of "Morning." This is not a timezone issue — it's a bucketing logic bug in TodayScreen.tsx.

The three time buckets are defined as:

```
Morning:   hours >= 6  && hours < 12
Afternoon: hours >= 12 && hours < 18
Evening:   hours >= 18 || hours < 6    ← BUG: 5 AM falls here
```

`5:00 AM` has `hours = 5`, which satisfies `hours < 6`, so the app incorrectly places it under **Evening**. The same is true for any time between midnight and 5:59 AM.

The intent is clearly: early morning hours like 5 AM should be "Morning," not "Evening." Evening should only be late night (after 6 PM). There's no real use case for scheduling peptides at midnight/2 AM that wouldn't still make more sense in "Morning."

## The Fix

Redefine the buckets so that:
- **Morning** = midnight through 11:59 AM (hours 0–11) — catches 5 AM correctly
- **Afternoon** = 12:00 PM through 5:59 PM (hours 12–17)
- **Evening** = 6:00 PM through 11:59 PM (hours 18–23) — no more `hours < 6` trap

Also add a "Bedtime" fallback for the `Bedtime` keyword (currently missing from the filter logic — only string-matched in `formatTime` but not in the bucket filters), so any `Bedtime`-labeled dose doesn't get lost.

## Files to Change

**Edit `src/components/TodayScreen.tsx`** — three bucket filter functions around lines 1740–1771:

```
Morning   → if (time === 'Morning') true; else hours >= 0 && hours < 12
Afternoon → if (time === 'Afternoon') true; else hours >= 12 && hours < 18
Evening   → if (time === 'Evening' || time === 'Bedtime') true; else hours >= 18
```

This is a 3-line change. No data changes, no schema changes, no auth changes.

## Why This Isn't the Timezone Issue

The Australia/Jay issue was about dates shifting by a day due to UTC conversion. This is different — Rohit's compounds are appearing on the right day, just under the wrong time section header. The `scheduled_time` value is stored as a string like `"05:00"`, the parsing is correct, but the bucket check puts anything before 6 AM into Evening by accident.

## Regarding the User (rohitsuryastudios@gmail.com)

No matching account was found in the database under that email. They may not have signed up yet, or signed up with a different address. The reply to them should be: confirm it's a known bug and that it'll be fixed in the next update — doses scheduled before 6 AM were incorrectly showing under "Evening" instead of "Morning."
