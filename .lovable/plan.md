

# Collapsible Inactive Section on My Stack

## Overview
Add a collapsible section for inactive compounds that auto-collapses when there are 3+ inactive items, keeping the screen focused on active compounds and making the Share Stack button more visible.

---

## Behavior

| Inactive Count | Default State | User Can Toggle? |
|---------------|---------------|------------------|
| 0 | Hidden (already works) | N/A |
| 1-2 | Expanded | Yes |
| 3+ | Collapsed | Yes |

---

## Technical Approach

### Component Used
Use the existing `Collapsible` component from `@radix-ui/react-collapsible` (already in the project).

### State Management
Add a single `useState` for the collapsed state, initialized based on count:

```typescript
const [inactiveExpanded, setInactiveExpanded] = useState(
  inactiveCompounds.length < 3
);
```

### UI Changes

**Current header:**
```tsx
<h2 className="text-xs font-semibold uppercase tracking-wider text-header-text">
  Inactive ({inactiveCompounds.length})
</h2>
```

**New collapsible header:**
```tsx
<Collapsible open={inactiveExpanded} onOpenChange={setInactiveExpanded}>
  <CollapsibleTrigger className="w-full flex items-center justify-between py-2 group">
    <h2 className="text-xs font-semibold uppercase tracking-wider text-header-text">
      Inactive ({inactiveCompounds.length})
    </h2>
    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${
      inactiveExpanded ? 'rotate-180' : ''
    }`} />
  </CollapsibleTrigger>
  
  <CollapsibleContent>
    {/* existing inactive compounds list */}
  </CollapsibleContent>
</Collapsible>
```

---

## File Changes

### `src/components/MyStackScreen.tsx`

1. **Add import:**
   ```typescript
   import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
   ```

2. **Add state** (after other useState declarations):
   ```typescript
   const [inactiveExpanded, setInactiveExpanded] = useState(true);
   ```

3. **Add effect to set initial state based on count** (when compounds load):
   ```typescript
   useEffect(() => {
     // Auto-collapse when 3+ inactive compounds
     if (inactiveCompounds.length >= 3) {
       setInactiveExpanded(false);
     }
   }, [inactiveCompounds.length]);
   ```

4. **Wrap inactive section** in Collapsible (lines 660-720):
   - Convert the section header into a `CollapsibleTrigger`
   - Wrap the compound list in `CollapsibleContent`
   - Add chevron rotation animation

---

## Visual Result

**Collapsed state (3+ inactive):**
```
┌─────────────────────────────────────┐
│ INACTIVE (7)                    ▶   │
└─────────────────────────────────────┘
         Share Stack
```

**Expanded state:**
```
┌─────────────────────────────────────┐
│ INACTIVE (7)                    ▼   │
├─────────────────────────────────────┤
│ ○ Testosterone Cypionate            │
│ ○ BPC-157                           │
│ ... (all inactive compounds)        │
└─────────────────────────────────────┘
         Share Stack
```

---

## Implementation Time
~15 minutes

---

## Edge Cases Handled

- **0 inactive**: Section already hidden - no change needed
- **1-2 inactive**: Starts expanded (not worth collapsing)
- **User preference**: Toggling is always available regardless of count
- **Adding/removing compounds**: Effect re-evaluates on count change

