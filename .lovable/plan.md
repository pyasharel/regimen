

# Four-Card Ultra-Thin Dashboard Plan

## Summary

This plan implements an ultra-compact four-card horizontal dashboard matching the MyStack screen's single-line button style (~36px height). The design prioritizes information density while maintaining elegance.

---

## Design Decisions

### Card Selection & Reasoning

| Card | Value Proposition | Tap Action |
|------|-------------------|------------|
| **Streak** | Motivational - celebrates consistency, emotional hook | None (celebratory) |
| **Doses** | Actionable - tells user what needs attention NOW | Scroll to doses |
| **Adherence %** | Performance metric - "how am I doing this week?" | Navigate to Progress |
| **Weight** | Health tracking - quick check-in | Open weight modal |

### Why Include Both Streak AND Adherence?

These measure **different things**:
- **Streak** = consecutive days with at least one dose logged (binary per day)
- **Adherence** = percentage of scheduled doses taken over 7 days (precision metric)

Example: A user could have a 30-day streak but 85% adherence (missed a few doses on multi-dose days). Or 100% adherence with a 2-day streak (just started). Both metrics tell different stories.

### Why Not a Dynamic 4th Card?

While creative, a dynamic card (illustrations, goals) adds complexity without clear actionable value. The four metrics chosen are all **quantifiable** and **glanceable** - matching the dashboard's purpose. If goals were universal, it would work, but many users haven't set one.

---

## Visual Design

### Ultra-Thin Styling (from MyStack)

```jsx
// Single-line card: ~36px height
<button className="rounded-lg bg-card border border-border/50 px-3 py-2 
  hover:scale-[1.02] active:scale-[0.97] transition-transform">
  <div className="flex items-center gap-1.5 justify-center">
    <Icon className="w-3.5 h-3.5 text-primary" />
    <span className="text-xs font-semibold">Value</span>
  </div>
</button>
```

### Layout

```text
+----------------------------------------------------------------+
|  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐                        |
|  │🔥 5  │  │📋 3  │  │92%   │  │158 lb│                        |
|  └──────┘  └──────┘  └──────┘  └──────┘                        |
+----------------------------------------------------------------+
   Streak    Doses     Adh.     Weight
   
Height: ~36px (vs current ~56px = 35% reduction)
```

### Card States

| Card | Normal State | Special State |
|------|--------------|---------------|
| Streak | "🔥 5" | "🔥 0" (still show, motivates restart) |
| Doses | "3 today" | "✓ Done" (all complete) or "Next 2d" (no doses today) |
| Adherence | "92%" | "—" if no data yet |
| Weight | "158 lb" | "Log" (no weight recorded) |

---

## Technical Implementation

### File: `src/components/QuickStatsDashboard.tsx`

**Props (add streak data):**
```typescript
interface QuickStatsDashboardProps {
  doses: Dose[];
  compounds: Compound[];
  selectedDate: Date;
  onScrollToDoses: () => void;
  onWeightUpdated: () => void;
}
```

**New Data Fetching:**

1. **Streak** - Use existing `useStreaks` hook
2. **Adherence** - Calculate from doses table (last 7 days)

```typescript
import { useStreaks } from "@/hooks/useStreaks";
import { useNavigate } from "react-router-dom";

// Inside component
const { data: stats } = useStreaks();
const currentStreak = stats?.current_streak || 0;

// Calculate adherence
const [adherenceRate, setAdherenceRate] = useState<number | null>(null);

useEffect(() => {
  loadAdherence();
}, []);

const loadAdherence = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = format(sevenDaysAgo, 'yyyy-MM-dd');

  const { data: doses } = await supabase
    .from('doses')
    .select('taken')
    .eq('user_id', user.id)
    .gte('scheduled_date', sevenDaysAgoStr);

  if (doses && doses.length > 0) {
    const taken = doses.filter(d => d.taken).length;
    setAdherenceRate(Math.round((taken / doses.length) * 100));
  }
};
```

**UI Structure (4 cards):**

```jsx
<div className="mx-4 mb-3">
  <div className="grid grid-cols-4 gap-2">
    {/* Streak */}
    <div className="rounded-lg bg-card border border-border/50 px-2 py-2 flex items-center justify-center gap-1.5">
      <Flame className="w-3.5 h-3.5 text-orange-500" fill="currentColor" />
      <span className="text-xs font-bold text-foreground">{currentStreak}</span>
    </div>

    {/* Doses */}
    <button 
      onClick={onScrollToDoses}
      className="rounded-lg bg-card border border-border/50 px-2 py-2 flex items-center justify-center gap-1.5 hover:bg-muted/50 active:scale-[0.97] transition-all"
    >
      {dosesRemaining > 0 ? (
        <>
          <ListChecks className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-bold text-foreground">{dosesRemaining}</span>
        </>
      ) : totalDoses > 0 ? (
        <>
          <Check className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold text-primary">Done</span>
        </>
      ) : nextDose ? (
        <>
          <CalendarClock className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold text-foreground">{nextDose.daysUntil}d</span>
        </>
      ) : null}
    </button>

    {/* Adherence */}
    <button 
      onClick={() => navigate('/progress')}
      className="rounded-lg bg-card border border-border/50 px-2 py-2 flex items-center justify-center gap-1.5 hover:bg-muted/50 active:scale-[0.97] transition-all"
    >
      <TrendingUp className="w-3.5 h-3.5 text-primary" />
      <span className="text-xs font-bold text-foreground">
        {adherenceRate !== null ? `${adherenceRate}%` : '—'}
      </span>
    </button>

    {/* Weight */}
    <button 
      onClick={() => setShowWeightModal(true)}
      className="rounded-lg bg-card border border-border/50 px-2 py-2 flex items-center justify-center gap-1.5 hover:bg-muted/50 active:scale-[0.97] transition-all"
    >
      <Scale className="w-3.5 h-3.5 text-primary" />
      <span className="text-xs font-bold text-foreground">
        {currentWeight ? `${Math.round(currentWeight)}` : 'Log'}
      </span>
    </button>
  </div>
</div>
```

---

## Streak Badge Behavior

**Keep the header streak badge** (`<StreakBadge />` in TodayScreen greeting). This provides:
- Prominent celebration in the greeting
- Dashboard streak is more compact/functional

The two serve different purposes:
- **Header badge** = Celebratory, personal ("Hi Mike 🔥5")
- **Dashboard streak** = Glanceable metric alongside other stats

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/QuickStatsDashboard.tsx` | Complete rewrite with 4-card grid, streak hook, adherence calc |

---

## Height Comparison

| State | Before | After |
|-------|--------|-------|
| Dashboard height | ~56px | ~36px |
| Reduction | - | **36%** |

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| No streak | Show "🔥 0" |
| No doses today, future dose exists | Show "Next Xd" |
| No doses at all | Hide doses card |
| No adherence data | Show "—" |
| No weight logged | Show "Log" |
| Viewing past/future date | Hide entire dashboard |

---

## Testing Checklist

1. Verify all 4 cards render in a single row on mobile
2. Test streak number matches header badge
3. Confirm adherence % calculates correctly
4. Test tap actions: scroll to doses, open weight modal, navigate to progress
5. Check "All Done" state shows correctly
6. Test "Next Xd" when no doses today
7. Verify ultra-thin height (~36px) is achieved

