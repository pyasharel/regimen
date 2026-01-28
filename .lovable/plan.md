

# Refined Quick Stats Dashboard Plan

## Summary of Changes

This plan addresses three refinements:
1. Make cards thinner (less vertical space)
2. Handle "no doses today" by showing next scheduled dose
3. Keep streak in header only (not duplicated in dashboard)

---

## Design Decisions

### Why NOT add streak to the dashboard?

The streak is already displayed prominently in the greeting header alongside the user's name. Adding it to the dashboard would:
- Duplicate information with no new value
- Increase dashboard width, requiring smaller cards or a third row
- Dilute focus from actionable items (doses, weight)

The current streak placement is ideal - it's a motivational "badge" that celebrates consistency without demanding action.

### Dashboard Philosophy

The dashboard should answer: **"What needs my attention today?"**
- Doses = primary action
- Weight = quick health check-in
- Streak = celebration (belongs in header, not action area)

---

## Technical Changes

### File: `src/components/QuickStatsDashboard.tsx`

**1. Reduce card height**

Change padding from `py-2.5` to `py-2`:
```jsx
// Before
className="... py-2.5 px-2 ..."

// After
className="... py-2 px-2 ..."
```

Reduce number font size from `text-lg` to `text-base`:
```jsx
// Before
<span className="text-lg font-bold text-foreground">{dosesRemaining}</span>

// After
<span className="text-base font-bold text-foreground">{dosesRemaining}</span>
```

**2. Handle "No doses today" scenario**

When `totalDoses === 0`, instead of hiding the doses card, show the next upcoming dose:

```typescript
// Add new state and logic
const [nextDose, setNextDose] = useState<{
  compoundName: string;
  daysUntil: number;
  date: string;
} | null>(null);

// Fetch next dose if no doses today
useEffect(() => {
  if (isViewingToday && totalDoses === 0) {
    loadNextDose();
  }
}, [isViewingToday, totalDoses]);

const loadNextDose = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const today = format(new Date(), 'yyyy-MM-dd');
  
  const { data } = await supabase
    .from('doses')
    .select('scheduled_date, compounds(name)')
    .eq('user_id', user.id)
    .eq('taken', false)
    .gt('scheduled_date', today)
    .order('scheduled_date', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (data) {
    const daysUntil = differenceInDays(
      new Date(data.scheduled_date),
      new Date()
    );
    setNextDose({
      compoundName: data.compounds?.name || 'Dose',
      daysUntil,
      date: data.scheduled_date
    });
  }
};
```

**3. Update the doses card UI to handle both states**

```jsx
{/* Doses for Today */}
{totalDoses > 0 ? (
  <button onClick={onScrollToDoses} className="...">
    {/* existing doses remaining UI */}
  </button>
) : nextDose ? (
  <button 
    onClick={() => navigate('/today')} // or scroll to calendar
    className="flex-1 flex flex-col items-center justify-center py-2 px-2 rounded-xl bg-card border border-border/50"
  >
    <div className="flex items-center gap-1.5">
      <CalendarClock className="w-3.5 h-3.5 text-primary" />
      <span className="text-xs font-semibold text-foreground truncate max-w-[80px]">
        {nextDose.compoundName}
      </span>
    </div>
    <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
      {nextDose.daysUntil === 1 ? 'tomorrow' : `in ${nextDose.daysUntil}d`}
    </span>
  </button>
) : null}
```

---

## Visual Comparison

### Before (current)
```
+------------------------------------------+
|  ┌─────────────┐   ┌─────────────┐      |
|  │    4        │   │ 158.2 lbs   │      |
|  │ doses today │   │   Weight ✎  │      |
|  └─────────────┘   └─────────────┘      |
+------------------------------------------+
Height: ~56px
```

### After (refined)
```
+------------------------------------------+
|  ┌───────────┐   ┌───────────┐          |
|  │   4       │   │ 158.2 lbs │          |
|  │doses today│   │  Weight ✎ │          |
|  └───────────┘   └───────────┘          |
+------------------------------------------+
Height: ~48px (-14% reduction)
```

### "No doses today" state
```
+------------------------------------------+
|  ┌───────────┐   ┌───────────┐          |
|  │Tirzepatide│   │ 158.2 lbs │          |
|  │ in 2 days │   │  Weight ✎ │          |
|  └───────────┘   └───────────┘          |
+------------------------------------------+
```

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| No doses today, no future doses | Hide doses card, show only weight |
| No doses today, has future dose | Show "Next: [compound] in Xd" |
| All doses complete | Show "All Done ✓ for today" |
| No weight logged | Show "Log Weight" prompt |
| Not viewing today | Hide entire dashboard |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/QuickStatsDashboard.tsx` | Thinner cards, next dose logic, updated UI |

---

## Height Analysis

| State | Before | After |
|-------|--------|-------|
| Dashboard height | ~56px | ~48px |
| Space saved | - | 8px |

While 8px seems small, combined with the collapsible Medication Levels Card, users now have full control over how much "engagement content" they see before the doses list.

---

## Testing Checklist

1. Verify thinner cards look balanced on mobile
2. Test "no doses today" showing next scheduled dose
3. Confirm "All Done" state still works
4. Check weight modal still opens correctly
5. Verify dashboard hides when viewing past dates

