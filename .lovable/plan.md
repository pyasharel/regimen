

## Plan: Complete GA4 Analytics Implementation

### Part 1: Fix Missing Event Parameters (Code Changes)

**File: `src/utils/analytics.ts`**

Update `trackCalculatorUsed` to send `calculator_type` as a proper parameter:
```typescript
export const trackCalculatorUsed = (calculatorType: 'iu' | 'ml' | 'peptide' | 'testosterone' | 'oil') => {
  ReactGA.event('calculator_used', {
    calculator_type: calculatorType,
  });
};
```

Update `trackCompoundAdded` to include `compound_type`:
```typescript
export const trackCompoundAdded = (
  compoundName: string, 
  scheduleType: string,
  compoundType?: 'peptide' | 'trt' | 'glp1' | 'supplement' | 'other'
) => {
  ReactGA.event('compound_added', {
    compound_name: compoundName,
    schedule_type: scheduleType,
    compound_type: compoundType || 'other',
  });
};
```

### Part 2: Wire Up Feature First-Use Tracking

Add `trackFeatureFirstUse()` calls to these components:
- **Calculator Modal**: `trackFeatureFirstUse('calculator')`
- **Photo Compare Screen**: `trackFeatureFirstUse('photo_compare')`
- **Cycle Timeline/Setup**: `trackFeatureFirstUse('cycle')`
- **Levels Graph**: `trackFeatureFirstUse('levels_graph')`
- **Share functionality**: `trackFeatureFirstUse('share')`

### Part 3: GA4 Dashboard Configuration (Manual Steps)

**Step 1: Create Audiences**
1. Go to Admin → Audiences → New audience
2. Create "App Users":
   - Condition: `content_group` exactly matches `app`
3. Create "Website Visitors":
   - Condition: `content_group` exactly matches `website`

**Step 2: Create Funnel Exploration**
1. Go to Explore → Create new exploration → Funnel exploration
2. Add steps using `onboarding_step` event
3. Break down by `step_name` dimension

**Step 3: Verify Server-Side Events**
1. Trigger a test purchase or subscription event
2. Check GA4 Realtime → Events for `subscription_started`
3. If not appearing, check edge function logs for errors

### Part 4: Coordinate with Landing Page

Ensure the landing page project has implemented:
- `content_group: 'website'` in their GA4 init
- UTM parameters on all app-bound links
- Matching event naming conventions

### Summary of Changes

| File | Changes |
|------|---------|
| `src/utils/analytics.ts` | Update `trackCalculatorUsed` and `trackCompoundAdded` to send custom parameters |
| `src/components/CalculatorModal.tsx` | Add `trackFeatureFirstUse('calculator')` |
| `src/components/PhotoCompareScreen.tsx` | Add `trackFeatureFirstUse('photo_compare')` |
| `src/components/CycleTimeline.tsx` | Add `trackFeatureFirstUse('cycle')` |
| Components with levels graph | Add `trackFeatureFirstUse('levels_graph')` |
| Share components | Add `trackFeatureFirstUse('share')` |
| GA4 Dashboard | Create audiences and funnel exploration |

