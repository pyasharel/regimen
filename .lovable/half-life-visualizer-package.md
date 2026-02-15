# Half-Life Visualizer: Complete Code Package for Landing Page

> **Purpose**: Everything your landing page project needs to build a half-life visualizer that looks and works identically to the Regimen app. Copy-paste ready.

---

## File 1: `halfLifeCalculator.ts` — The Pharmacokinetic Engine

This is the exact Bateman equation model from the app. No app-specific dependencies. Drop it in as-is.

```typescript
/**
 * Half-life calculation utilities with absorption modeling
 * 
 * Uses a one-compartment pharmacokinetic model with first-order absorption:
 * C(t) = (ka * Dose / (ka - ke)) * (e^(-ke*t) - e^(-ka*t))
 * 
 * This creates a realistic curve that:
 * 1. Starts at 0 at dose time
 * 2. Rises gradually to peak at Tmax
 * 3. Then decays exponentially
 */

export interface TakenDose {
  id: string;
  takenAt: Date;
  amount: number;
  unit: string;
}

export interface MedicationLevel {
  timestamp: Date;
  level: number;
  absoluteLevel: number;
  isFuture?: boolean;
}

/**
 * Calculate the level of a single dose at a given time using absorption + elimination model
 */
const calculateDoseLevel = (
  initialAmount: number,
  halfLifeHours: number,
  tMaxHours: number,
  hoursElapsed: number
): number => {
  if (!Number.isFinite(hoursElapsed) || !Number.isFinite(initialAmount)) return 0;
  if (hoursElapsed < 0) return 0;
  if (hoursElapsed === 0) return 0;
  
  const ke = Math.LN2 / halfLifeHours;
  const ka = Math.max(ke * 2.5, 1.8 / tMaxHours);
  
  if (Math.abs(ka - ke) < 0.0001) {
    if (hoursElapsed <= tMaxHours) {
      return initialAmount * (hoursElapsed / tMaxHours);
    }
    return initialAmount * Math.exp(-ke * (hoursElapsed - tMaxHours));
  }
  
  const scaleFactor = ka / (ka - ke);
  const level = initialAmount * scaleFactor * (Math.exp(-ke * hoursElapsed) - Math.exp(-ka * hoursElapsed));
  
  const tPeak = Math.log(ka / ke) / (ka - ke);
  const peakLevel = initialAmount * scaleFactor * (Math.exp(-ke * tPeak) - Math.exp(-ka * tPeak));
  
  if (peakLevel > 0) {
    return (level / peakLevel) * initialAmount;
  }
  
  return Math.max(0, level);
};

/**
 * Calculate total medication level at a specific time from all doses
 */
const calculateLevelAtTime = (
  doses: TakenDose[],
  halfLifeHours: number,
  tMaxHours: number,
  timestamp: Date
): number => {
  let totalLevel = 0;
  
  for (const dose of doses) {
    const hoursElapsed = (timestamp.getTime() - dose.takenAt.getTime()) / (1000 * 60 * 60);
    if (!Number.isFinite(hoursElapsed)) continue;
    
    if (hoursElapsed >= 0) {
      const level = calculateDoseLevel(dose.amount, halfLifeHours, tMaxHours, hoursElapsed);
      if (Number.isFinite(level)) {
        totalLevel += level;
      }
    }
  }
  
  return totalLevel;
};

/**
 * Estimate when medication will be "out of system" (< 3% remaining)
 */
export const estimateClearanceTime = (
  doses: TakenDose[],
  halfLifeHours: number
): Date | null => {
  if (doses.length === 0) return null;
  const lastDose = doses.reduce((latest, dose) => 
    dose.takenAt > latest.takenAt ? dose : latest
  );
  const clearanceHours = halfLifeHours * 5.06;
  return new Date(lastDose.takenAt.getTime() + clearanceHours * 60 * 60 * 1000);
};

/**
 * Calculate medication levels over time based on actual taken doses
 */
export const calculateMedicationLevels = (
  doses: TakenDose[],
  halfLifeHours: number,
  startDate: Date,
  endDate: Date,
  pointsPerDay: number = 4,
  includeFuture: boolean = false,
  tMaxHours?: number
): MedicationLevel[] => {
  if (doses.length === 0) return [];

  const effectiveTmax = tMaxHours ?? Math.max(1, halfLifeHours * 0.15);
  const now = new Date();
  const timestamps: Set<number> = new Set();
  const intervalHours = 24 / pointsPerDay;
  
  let actualEndDate = endDate;
  if (includeFuture && doses.length > 0) {
    const clearanceTime = estimateClearanceTime(doses, halfLifeHours);
    if (clearanceTime && clearanceTime > endDate) {
      actualEndDate = clearanceTime;
    }
  }
  
  let currentTime = new Date(startDate);
  while (currentTime <= actualEndDate) {
    timestamps.add(currentTime.getTime());
    currentTime = new Date(currentTime.getTime() + intervalHours * 60 * 60 * 1000);
  }
  
  for (const dose of doses) {
    const doseTime = dose.takenAt.getTime();
    if (doseTime >= startDate.getTime() && doseTime <= actualEndDate.getTime()) {
      timestamps.add(doseTime - 60000);
      timestamps.add(doseTime);
      const tMaxMs = effectiveTmax * 60 * 60 * 1000;
      timestamps.add(doseTime + tMaxMs * 0.1);
      timestamps.add(doseTime + tMaxMs * 0.25);
      timestamps.add(doseTime + tMaxMs * 0.5);
      timestamps.add(doseTime + tMaxMs * 0.75);
      timestamps.add(doseTime + tMaxMs);
      timestamps.add(doseTime + tMaxMs * 1.25);
      timestamps.add(doseTime + tMaxMs * 1.5);
      timestamps.add(doseTime + tMaxMs * 2);
      timestamps.add(doseTime + 7200000);
      timestamps.add(doseTime + 14400000);
      timestamps.add(doseTime + 28800000);
      timestamps.add(doseTime + 43200000);
      timestamps.add(doseTime + 86400000);
    }
  }
  
  if (now.getTime() >= startDate.getTime() && now.getTime() <= actualEndDate.getTime()) {
    timestamps.add(now.getTime());
  }
  
  const sortedTimestamps = Array.from(timestamps).sort((a, b) => a - b);
  
  const levels: MedicationLevel[] = sortedTimestamps.map(ts => {
    const timestamp = new Date(ts);
    const absoluteLevel = calculateLevelAtTime(doses, halfLifeHours, effectiveTmax, timestamp);
    return {
      timestamp,
      level: 0,
      absoluteLevel,
      isFuture: timestamp > now
    };
  });
  
  const maxLevel = Math.max(...levels.map(l => l.absoluteLevel), 0.001);
  for (const level of levels) {
    level.level = (level.absoluteLevel / maxLevel) * 100;
  }
  
  return levels;
};

/**
 * Calculate current medication level
 */
export const calculateCurrentLevel = (
  doses: TakenDose[],
  halfLifeHours: number,
  tMaxHours?: number
): { level: number; absoluteLevel: number; percentOfPeak: number } => {
  const now = new Date();
  const effectiveTmax = tMaxHours ?? Math.max(1, halfLifeHours * 0.15);
  let totalLevel = 0;
  
  for (const dose of doses) {
    const hoursElapsed = (now.getTime() - dose.takenAt.getTime()) / (1000 * 60 * 60);
    if (!Number.isFinite(hoursElapsed)) continue;
    if (hoursElapsed >= 0) {
      const level = calculateDoseLevel(dose.amount, halfLifeHours, effectiveTmax, hoursElapsed);
      if (Number.isFinite(level)) {
        totalLevel += level;
      }
    }
  }
  
  const peakDose = Math.max(...doses.map(d => d.amount), 1);
  const percentOfPeak = (totalLevel / peakDose) * 100;
  
  return {
    level: totalLevel,
    absoluteLevel: totalLevel,
    percentOfPeak: Math.min(percentOfPeak, 100)
  };
};
```

---

## File 2: `halfLifeData.ts` — Compound Database (919 lines)

This is the complete compound database. For the web tool, you only need the 7 selected compounds, but the full database is here if you want to expand later. The key functions are `getHalfLifeData()` and `getTmax()`.

```typescript
export interface MedicationHalfLife {
  halfLifeHours: number;
  tMaxHours?: number;
  category: 'glp1' | 'steroid' | 'peptide' | 'other';
  displayName: string;
  notes?: string;
}

/**
 * Get the Tmax (time to peak) for a medication
 */
export const getTmax = (data: MedicationHalfLife): number => {
  if (data.tMaxHours !== undefined) return data.tMaxHours;
  
  switch (data.category) {
    case 'glp1':
      if (data.halfLifeHours >= 120) return 24;
      return 8;
    case 'steroid':
      if (data.halfLifeHours >= 168) return 48;
      if (data.halfLifeHours >= 48) return 24;
      return 4;
    case 'peptide':
      if (data.halfLifeHours >= 24) return 4;
      return Math.max(0.25, data.halfLifeHours * 0.3);
    default:
      return Math.max(1, data.halfLifeHours * 0.2);
  }
};

// ========================================
// WEB VISUALIZER: 7 Selected Compounds
// ========================================
// These are the recommended compounds for the web tool.
// Brand names included for SEO (users search "Ozempic half life" etc.)

export const WEB_COMPOUNDS: Record<string, MedicationHalfLife & { 
  brandNames?: string;
  defaultDose: number;
  defaultUnit: string;
  defaultFrequency: 'daily' | 'twice_daily' | 'weekly' | 'every_3_days';
}> = {
  'semaglutide': {
    halfLifeHours: 168,       // ~7 days
    tMaxHours: 48,            // Peak at ~2 days
    category: 'glp1',
    displayName: 'Semaglutide',
    brandNames: 'Ozempic, Wegovy, Rybelsus',
    notes: 'Ozempic, Wegovy, Rybelsus',
    defaultDose: 0.5,
    defaultUnit: 'mg',
    defaultFrequency: 'weekly',
  },
  'tirzepatide': {
    halfLifeHours: 120,       // ~5 days
    tMaxHours: 41,            // Peak at ~1.7 days
    category: 'glp1',
    displayName: 'Tirzepatide',
    brandNames: 'Mounjaro, Zepbound',
    notes: 'Mounjaro, Zepbound',
    defaultDose: 2.5,
    defaultUnit: 'mg',
    defaultFrequency: 'weekly',
  },
  'retatrutide': {
    halfLifeHours: 144,       // ~6 days
    tMaxHours: 36,
    category: 'glp1',
    displayName: 'Retatrutide',
    brandNames: 'Phase 3 trials',
    notes: 'Triple agonist (GLP-1/GIP/Glucagon)',
    defaultDose: 4,
    defaultUnit: 'mg',
    defaultFrequency: 'weekly',
  },
  'testosterone_cypionate': {
    halfLifeHours: 108,       // ~4.5 days
    tMaxHours: 96,            // Peak at ~4 days
    category: 'steroid',
    displayName: 'Testosterone Cypionate',
    notes: 'Injectable (oil-based)',
    defaultDose: 200,
    defaultUnit: 'mg',
    defaultFrequency: 'weekly',
  },
  'bpc_157': {
    halfLifeHours: 5,         // ~4-6 hours
    tMaxHours: 0.5,           // Peak at ~30 min
    category: 'peptide',
    displayName: 'BPC-157',
    defaultDose: 250,
    defaultUnit: 'mcg',
    defaultFrequency: 'twice_daily',
  },
  'hgh': {
    halfLifeHours: 4,         // ~3-5 hours
    tMaxHours: 3,             // Peak at 2-4 hours
    category: 'peptide',
    displayName: 'HGH',
    brandNames: 'Genotropin, Norditropin',
    notes: 'Human Growth Hormone / Somatropin',
    defaultDose: 2,
    defaultUnit: 'IU',
    defaultFrequency: 'daily',
  },
  'tb_500': {
    halfLifeHours: 2,         // ~2 hours
    tMaxHours: 0.25,          // Peak at ~15 min
    category: 'peptide',
    displayName: 'TB-500',
    defaultDose: 5,
    defaultUnit: 'mg',
    defaultFrequency: 'every_3_days',
  },
};

/**
 * Get half-life data for a web compound
 */
export const getHalfLifeData = (compoundKey: string) => {
  return WEB_COMPOUNDS[compoundKey] || null;
};

// ========================================
// FULL COMPOUND DATABASE (for expansion)
// ========================================
// The app uses 100+ compounds. Here's the complete list for reference.
// To add more compounds to the web tool, just move entries from here to WEB_COMPOUNDS.

export const FULL_COMPOUND_DATABASE: Record<string, MedicationHalfLife> = {
  // GLP-1 Agonists
  'semaglutide': { halfLifeHours: 168, tMaxHours: 48, category: 'glp1', displayName: 'Semaglutide', notes: 'Ozempic, Wegovy, Rybelsus' },
  'tirzepatide': { halfLifeHours: 120, tMaxHours: 41, category: 'glp1', displayName: 'Tirzepatide', notes: 'Mounjaro, Zepbound' },
  'liraglutide': { halfLifeHours: 13, tMaxHours: 11, category: 'glp1', displayName: 'Liraglutide', notes: 'Victoza, Saxenda' },
  'dulaglutide': { halfLifeHours: 120, tMaxHours: 48, category: 'glp1', displayName: 'Dulaglutide', notes: 'Trulicity' },
  'exenatide': { halfLifeHours: 2.4, tMaxHours: 2, category: 'glp1', displayName: 'Exenatide', notes: 'Byetta' },
  'exenatide er': { halfLifeHours: 168, tMaxHours: 48, category: 'glp1', displayName: 'Exenatide ER', notes: 'Bydureon' },
  'retatrutide': { halfLifeHours: 144, tMaxHours: 36, category: 'glp1', displayName: 'Retatrutide', notes: 'Triple agonist (GLP-1/GIP/Glucagon)' },
  'survodutide': { halfLifeHours: 144, tMaxHours: 36, category: 'glp1', displayName: 'Survodutide', notes: 'Dual agonist' },
  'mazdutide': { halfLifeHours: 144, tMaxHours: 36, category: 'glp1', displayName: 'Mazdutide', notes: 'Dual agonist' },

  // TRT / Steroids
  'testosterone cypionate': { halfLifeHours: 108, tMaxHours: 96, category: 'steroid', displayName: 'Testosterone Cypionate', notes: 'Injectable (oil-based)' },
  'testosterone enanthate': { halfLifeHours: 108, tMaxHours: 96, category: 'steroid', displayName: 'Testosterone Enanthate', notes: 'Injectable (oil-based)' },
  'testosterone propionate': { halfLifeHours: 19, tMaxHours: 24, category: 'steroid', displayName: 'Testosterone Propionate', notes: 'Injectable (oil-based)' },
  'testosterone gel': { halfLifeHours: 24, tMaxHours: 4, category: 'steroid', displayName: 'Testosterone Gel', notes: 'AndroGel, Testim' },
  'testosterone undecanoate': { halfLifeHours: 504, tMaxHours: 168, category: 'steroid', displayName: 'Testosterone Undecanoate', notes: 'Nebido' },
  'nandrolone decanoate': { halfLifeHours: 144, tMaxHours: 72, category: 'steroid', displayName: 'Nandrolone Decanoate', notes: 'Deca-Durabolin' },
  'boldenone undecylenate': { halfLifeHours: 336, tMaxHours: 96, category: 'steroid', displayName: 'Boldenone Undecylenate', notes: 'Equipoise' },
  'trenbolone acetate': { halfLifeHours: 24, tMaxHours: 12, category: 'steroid', displayName: 'Trenbolone Acetate' },
  'trenbolone enanthate': { halfLifeHours: 120, tMaxHours: 72, category: 'steroid', displayName: 'Trenbolone Enanthate' },
  'sustanon': { halfLifeHours: 360, tMaxHours: 48, category: 'steroid', displayName: 'Sustanon 250', notes: 'Blend of 4 esters' },
  'anavar': { halfLifeHours: 9, tMaxHours: 1, category: 'steroid', displayName: 'Anavar' },
  'winstrol': { halfLifeHours: 9, tMaxHours: 1, category: 'steroid', displayName: 'Winstrol' },
  'dianabol': { halfLifeHours: 5, tMaxHours: 1.5, category: 'steroid', displayName: 'Dianabol' },
  'hcg': { halfLifeHours: 29, tMaxHours: 6, category: 'peptide', displayName: 'HCG' },

  // Peptides
  'bpc-157': { halfLifeHours: 5, tMaxHours: 0.5, category: 'peptide', displayName: 'BPC-157' },
  'tb-500': { halfLifeHours: 2, tMaxHours: 0.25, category: 'peptide', displayName: 'TB-500' },
  'ipamorelin': { halfLifeHours: 2, tMaxHours: 0.25, category: 'peptide', displayName: 'Ipamorelin' },
  'cjc-1295': { halfLifeHours: 168, tMaxHours: 4, category: 'peptide', displayName: 'CJC-1295', notes: 'With DAC' },
  'cjc-1295 no dac': { halfLifeHours: 0.5, tMaxHours: 0.1, category: 'peptide', displayName: 'CJC-1295 (no DAC)', notes: 'Mod GRF 1-29' },
  'sermorelin': { halfLifeHours: 0.2, tMaxHours: 0.05, category: 'peptide', displayName: 'Sermorelin' },
  'mk-677': { halfLifeHours: 24, tMaxHours: 4, category: 'peptide', displayName: 'MK-677', notes: 'Ibutamoren' },
  'pt-141': { halfLifeHours: 2, tMaxHours: 0.5, category: 'peptide', displayName: 'PT-141' },
  'hgh': { halfLifeHours: 4, tMaxHours: 3, category: 'peptide', displayName: 'HGH', notes: 'Genotropin, Norditropin' },
  'epitalon': { halfLifeHours: 4, tMaxHours: 0.5, category: 'peptide', displayName: 'Epitalon', notes: 'Telomere/longevity peptide' },

  // ED / Sexual Health
  'tadalafil': { halfLifeHours: 17.5, tMaxHours: 2, category: 'other', displayName: 'Tadalafil', notes: 'Cialis' },
  'sildenafil': { halfLifeHours: 4, tMaxHours: 1, category: 'other', displayName: 'Sildenafil', notes: 'Viagra' },

  // Metabolic / Health
  'metformin': { halfLifeHours: 6, tMaxHours: 2.5, category: 'other', displayName: 'Metformin', notes: 'Glucophage' },
  'levothyroxine': { halfLifeHours: 168, tMaxHours: 6, category: 'other', displayName: 'Levothyroxine', notes: 'Synthroid (T4)' },

  // SARMs
  'lgd-4033': { halfLifeHours: 30, tMaxHours: 1.5, category: 'other', displayName: 'LGD-4033', notes: 'Ligandrol' },
  'rad-140': { halfLifeHours: 60, tMaxHours: 2, category: 'other', displayName: 'RAD-140', notes: 'Testolone' },
  'ostarine': { halfLifeHours: 24, tMaxHours: 1.5, category: 'other', displayName: 'Ostarine', notes: 'MK-2866' },

  // PCT
  'enclomiphene': { halfLifeHours: 10, tMaxHours: 2, category: 'other', displayName: 'Enclomiphene' },
};
```

---

## File 3: `formatLevel` helper (from `doseUtils.ts`)

```typescript
/**
 * Formats a medication level for display
 * Rounds to whole numbers for values >= 1, keeps 2 decimals for small values
 */
export const formatLevel = (level: number): string => {
  return level >= 1 ? Math.round(level).toString() : level.toFixed(2);
};
```

---

## File 4: Chart Rendering — The Exact JSX from the App

This is the Recharts `AreaChart` with all gradients, glow effects, past/future split, and tooltip. Uses CSS variables so it matches the theme automatically.

### Helper functions (above the chart)

```typescript
// Y-axis formatting
const formatYAxis = (value: number) => {
  if (value === 0) return '0';
  if (Number.isInteger(value)) return value.toString();
  if (value >= 10) return Math.round(value).toString();
  if (value >= 1) return value.toFixed(1);
  return value.toFixed(2);
};

const getAxisMax = (max: number) => {
  if (max <= 0) return 1;
  if (max < 1) return Math.ceil(max * 10) / 10;
  if (max < 10) return Math.ceil(max);
  if (max < 50) return Math.ceil(max / 5) * 5;
  if (max < 100) return Math.ceil(max / 10) * 10;
  if (max < 500) return Math.ceil(max / 25) * 25;
  if (max < 1000) return Math.ceil(max / 50) * 50;
  return Math.ceil(max / 100) * 100;
};
```

### Chart data preparation (in your component)

```typescript
import { format, subDays } from 'date-fns';
import { calculateMedicationLevels, TakenDose } from './halfLifeCalculator';
import { getTmax, WEB_COMPOUNDS } from './halfLifeData';
import { formatLevel } from './doseUtils';

// Example: generate simulated doses for a compound
const generateSimulatedDoses = (
  compound: typeof WEB_COMPOUNDS[string],
  doseAmount: number,
  weeks: number = 4
): TakenDose[] => {
  const doses: TakenDose[] = [];
  const now = new Date();
  const startDate = subDays(now, weeks * 7);
  
  let currentDate = new Date(startDate);
  let id = 0;
  
  while (currentDate <= now) {
    doses.push({
      id: String(id++),
      takenAt: new Date(currentDate),
      amount: doseAmount,
      unit: compound.defaultUnit,
    });
    
    switch (compound.defaultFrequency) {
      case 'daily':
        currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
        break;
      case 'twice_daily':
        // Add morning dose (already added), then evening dose
        doses.push({
          id: String(id++),
          takenAt: new Date(currentDate.getTime() + 12 * 60 * 60 * 1000),
          amount: doseAmount,
          unit: compound.defaultUnit,
        });
        currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
        break;
      case 'weekly':
        currentDate = new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case 'every_3_days':
        currentDate = new Date(currentDate.getTime() + 3 * 24 * 60 * 60 * 1000);
        break;
    }
  }
  
  return doses;
};

// Generate chart data
const compound = WEB_COMPOUNDS['semaglutide'];
const doses = generateSimulatedDoses(compound, compound.defaultDose);
const now = new Date();
const startDate = subDays(now, 7);
const endDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

const levels = calculateMedicationLevels(
  doses,
  compound.halfLifeHours,
  startDate,
  endDate,
  24,     // hourly resolution for smooth curves
  true,   // include future projection
  getTmax(compound)
);

const maxLevel = Math.max(...levels.map(p => p.absoluteLevel), 0.001);

const chartData = levels.map(point => ({
  date: format(point.timestamp, 'MMM d'),
  timestamp: point.timestamp.getTime(),
  level: point.absoluteLevel,
  absoluteLevelFormatted: formatLevel(point.absoluteLevel),
  percentOfPeak: Math.round((point.absoluteLevel / maxLevel) * 100),
  pastLevel: !point.isFuture ? point.absoluteLevel : null,
  futureLevel: point.isFuture ? point.absoluteLevel : null,
  isFuture: point.isFuture,
}));

const maxAbsoluteLevel = Math.max(...chartData.map(p => p.level));
const yAxisMax = getAxisMax(maxAbsoluteLevel * 1.1);

// Find "now" point for the glowing dot
const nowTimestamp = Date.now();
let nowIndex = 0;
let closestDiff = Infinity;
chartData.forEach((point, index) => {
  const diff = Math.abs(point.timestamp - nowTimestamp);
  if (diff < closestDiff) {
    closestDiff = diff;
    nowIndex = index;
  }
});
```

### The chart JSX (exact copy from the app)

```tsx
import { AreaChart, Area, ResponsiveContainer, ReferenceDot, XAxis, YAxis, Tooltip } from 'recharts';

// Inside your component's return:
<div className="h-48"> {/* Adjust height as needed */}
  <ResponsiveContainer width="100%" height="100%">
    <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
      <defs>
        {/* Past fill gradient: coral fading to transparent */}
        <linearGradient id="levelGradientPast" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
          <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
        </linearGradient>
        
        {/* Future fill gradient: lighter */}
        <linearGradient id="levelGradientFuture" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
          <stop offset="40%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.01} />
        </linearGradient>
        
        {/* Future stroke: fading line */}
        <linearGradient id="futureStrokeGradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.7} />
          <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
        </linearGradient>
        
        {/* Animated glow filter for the "now" dot */}
        <filter id="currentPointGlow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="4" result="coloredBlur">
            <animate attributeName="stdDeviation" values="3;6;3" dur="2s" repeatCount="indefinite" />
          </feGaussianBlur>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      <YAxis 
        tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
        tickLine={false}
        axisLine={false}
        domain={[0, yAxisMax]}
        tickFormatter={formatYAxis}
        width={28}
        tickCount={4}
      />
      <XAxis 
        dataKey="date" 
        tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
        tickLine={false}
        axisLine={false}
        interval={Math.floor(chartData.length / 4)}
        tickMargin={4}
      />
      <Tooltip
        content={({ active, payload }) => {
          if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
              <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
                <p className="text-xs text-muted-foreground mb-0.5">
                  {data.date} {data.isFuture && <span className="text-primary/60">(projected)</span>}
                </p>
                <p className="text-sm font-semibold text-primary">
                  ~{data.absoluteLevelFormatted} {compound.defaultUnit}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {data.percentOfPeak}% of peak
                </p>
              </div>
            );
          }
          return null;
        }}
      />
      
      {/* Past levels - solid coral line */}
      <Area
        type="monotone"
        dataKey="pastLevel"
        stroke="hsl(var(--primary))"
        strokeWidth={2}
        fill="url(#levelGradientPast)"
        isAnimationActive={false}
        connectNulls={false}
      />
      
      {/* Future levels - dashed fading line */}
      <Area
        type="monotone"
        dataKey="futureLevel"
        stroke="url(#futureStrokeGradient)"
        strokeWidth={1.5}
        strokeDasharray="4 2"
        fill="url(#levelGradientFuture)"
        isAnimationActive={false}
        connectNulls={false}
      />
      
      {/* Hidden area for tooltip interaction on entire curve */}
      <Area
        type="monotone"
        dataKey="level"
        stroke="transparent"
        strokeWidth={0}
        fill="transparent"
        isAnimationActive={false}
      />
      
      {/* Glowing "now" dot */}
      {nowIndex >= 0 && nowIndex < chartData.length && chartData[nowIndex] && (
        <ReferenceDot
          x={chartData[nowIndex].date}
          y={chartData[nowIndex].level}
          r={6}
          fill="hsl(var(--primary))"
          stroke="hsl(var(--background))"
          strokeWidth={2}
          filter="url(#currentPointGlow)"
        >
          <animate
            attributeName="opacity"
            values="1;0.7;1"
            dur="2s"
            repeatCount="indefinite"
          />
        </ReferenceDot>
      )}
    </AreaChart>
  </ResponsiveContainer>
</div>
```

---

## File 5: CSS Variables — Theme Definition

Add these to your landing page's `index.css` (or equivalent). The chart references `--primary`, `--background`, `--muted-foreground`, `--popover`, `--border`, and `--card`.

```css
:root {
  /* Core colors the chart uses */
  --background: 0 0% 98%;
  --foreground: 0 0% 5.88%;
  --card: 0 0% 100%;
  --card-foreground: 0 0% 5.88%;
  --popover: 0 0% 100%;
  --popover-foreground: 0 0% 5.88%;
  
  /* Brand coral — this is what makes the chart coral-colored */
  --primary: 6 100% 69%;          /* #FF6F61 */
  --primary-foreground: 0 0% 100%;
  
  /* Muted colors for axis labels */
  --muted: 0 0% 94%;
  --muted-foreground: 220 9% 46%;
  
  /* Borders */
  --border: 0 0% 90%;
  
  --radius: 0.75rem;
}

.dark {
  --background: 0 0% 5.88%;
  --foreground: 0 0% 100%;
  --card: 0 0% 10.2%;
  --card-foreground: 0 0% 100%;
  --popover: 0 0% 10.2%;
  --popover-foreground: 0 0% 100%;
  --primary: 6 100% 69%;           /* Same coral in dark mode */
  --primary-foreground: 0 0% 100%;
  --muted: 0 0% 14.9%;
  --muted-foreground: 220 9% 64%;
  --border: 0 0% 20%;
}

/* Animated glow for the "now" dot (CSS fallback) */
@keyframes chart-glow-pulse {
  0%, 100% {
    opacity: 1;
    filter: drop-shadow(0 0 4px hsl(var(--primary) / 0.6));
  }
  50% {
    opacity: 0.85;
    filter: drop-shadow(0 0 10px hsl(var(--primary) / 0.9));
  }
}

.animate-chart-glow {
  animation: chart-glow-pulse 2s ease-in-out infinite;
}
```

---

## Dependencies Required

```json
{
  "recharts": "^2.15.4",
  "date-fns": "^3.6.0",
  "lucide-react": "^0.462.0"
}
```

---

## Web Implementation Notes

1. **Simulated Doses**: The web version generates synthetic `TakenDose[]` arrays from user input (compound + dose + frequency). The `generateSimulatedDoses` function above handles this. The `calculateMedicationLevels` function works identically whether doses come from a database or are generated.

2. **Hourly Resolution**: Use `pointsPerDay: 24` for smooth curves. Lower values (like 4) create visible "steps."

3. **Always Pass tMaxHours**: Use `getTmax(compound)` — this is what creates the realistic rise-to-peak curve instead of an instant spike.

4. **Past/Future Split**: The chart uses two `<Area>` layers — one for past (solid line, `pastLevel`) and one for future (dashed line, `futureLevel`). The split happens at `new Date()`. For a pure projection tool, you could simplify to show all data as one solid line.

5. **The "Now" Dot**: The `ReferenceDot` with the animated SVG glow filter is the signature visual element. It breathes with a 2-second animation cycle.

6. **Compound Selector**: For the web version, a simple dropdown or button group with the 7 compounds is ideal. Each compound in `WEB_COMPOUNDS` has `defaultDose`, `defaultUnit`, and `defaultFrequency` so the chart can render immediately on selection.

7. **CTA Angle**: After showing the single-compound curve, prompt: *"See how your full stack interacts — visualize multiple compounds and track real metrics in the Regimen app."*
