
# Half-Life Visualizer: Code Package for Landing Page

## What You're Getting

A complete, self-contained code package to hand to your landing page project. It includes:

1. **The pharmacokinetic engine** (Bateman equation model) -- the exact same math your app uses
2. **The full compound database** (919 lines, 100+ compounds with half-lives, Tmax, brand names)
3. **The chart rendering code** (Recharts AreaChart with gradients, glowing "now" dot, past/future split, tooltips)
4. **The CSS theme variables** (coral primary, dark mode, card styling, animations)

## Will the Look and Feel Match?

**Yes, with one caveat.** The chart itself -- the gradient fills, the glowing animated dot, the dashed future projection line, the tooltip styling -- all of that is defined directly in the component JSX and will transfer exactly. The visual identity comes from CSS custom properties (`hsl(var(--primary))`, `hsl(var(--background))`, etc.) that your landing page project just needs to define.

**What transfers identically:**
- The coral-to-transparent gradient fill under the curve
- The solid past line vs dashed future projection line
- The animated glowing reference dot at "now"
- The Y-axis formatting (smart rounding for different scales)
- The tooltip showing absolute level + percent of peak
- The smooth absorption curve (rises gradually to peak, then decays) rather than simple exponential decay

**What the landing page project needs to provide:**
- The CSS variables (`--primary`, `--background`, `--card`, `--border`, `--muted-foreground`, etc.) -- you already have these defined in your index.css, so this is just a copy
- Recharts, date-fns, and Lucide React as dependencies (standard)

## Files to Package

### File 1: `halfLifeCalculator.ts` (the engine)
Your app's exact `src/utils/halfLifeCalculator.ts` -- Bateman equation with absorption modeling, superposition of multiple doses, clearance estimation. ~230 lines. No app-specific dependencies.

### File 2: `halfLifeData.ts` (compound database)
Your app's exact `src/utils/halfLifeData.ts` -- 100+ compounds with half-life hours, Tmax hours, category, display name, brand names in notes. Includes fuzzy matching. ~919 lines. No dependencies.

### File 3: `doseUtils.ts` (formatting helper)
Just the `formatLevel` function -- 3 lines. Rounds to whole numbers for values >= 1, keeps 2 decimals for small values.

### File 4: Chart rendering reference
The chart JSX from `MedicationLevelsCard.tsx` lines 457-577, including:
- SVG gradient definitions (past fill, future fill, future stroke fade, glow filter)
- YAxis with smart formatting
- XAxis with date labels
- Two Area layers (solid past, dashed future)
- Hidden Area for tooltip interaction
- ReferenceDot with animated glow at "now" point

### File 5: CSS variables
The relevant subset of your `index.css` theme (light + dark mode) so the coral primary, card backgrounds, and muted foreground colors all match.

## Recommended Compound Selection for Web (7 compounds)

Based on search volume, your user base, and variety across categories:

| Compound | Category | Brand Names | Why Include |
|---|---|---|---|
| Semaglutide | GLP-1 | Ozempic, Wegovy | Highest search volume compound |
| Tirzepatide | GLP-1 | Mounjaro, Zepbound | Second most searched GLP-1 |
| Retatrutide | GLP-1 | (Phase 3) | Most hyped upcoming compound |
| Testosterone Cypionate | TRT | -- | Most common TRT protocol |
| BPC-157 | Peptide | -- | Most searched peptide |
| HGH | Peptide | Genotropin, Norditropin | High search volume |
| TB-500 | Peptide | -- | Commonly paired with BPC-157 |

## Web Simplification vs App

The web version should use **simulated doses** (user picks compound + dose + frequency, and the code generates synthetic `TakenDose[]` entries) rather than pulling from a database. The `calculateMedicationLevels` function works identically either way -- it just needs an array of `TakenDose` objects with `takenAt`, `amount`, and `unit`.

## Implementation Notes for Landing Page Project

- The `calculateMedicationLevels` function accepts a `tMaxHours` parameter -- always pass it from the compound data using `getTmax()` for accurate absorption curves
- The chart uses `pointsPerDay: 24` for smooth curves (hourly resolution)
- Past/future split is done by comparing each timestamp to `new Date()` -- the web version can use the same approach or simplify to just show projected levels
- The Bateman equation creates realistic rise-to-peak curves rather than instant jumps, which is what makes the visualization look professional

## What I Will Produce

When you approve this plan, I will create a single comprehensive reference document containing all the code, data, and CSS your landing page project needs -- ready to copy-paste. No changes to this app's codebase.
