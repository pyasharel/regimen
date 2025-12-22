/**
 * Half-life data for medications (in hours)
 * 
 * Sources:
 * - GLP-1s: FDA prescribing information
 * - Steroids: Published pharmacokinetic studies
 * 
 * Note: Half-life can vary by individual, injection site, and formulation.
 * These are approximate averages for educational purposes.
 */

export interface MedicationHalfLife {
  halfLifeHours: number;
  tMaxHours?: number; // Time to reach peak concentration (default calculated from half-life)
  category: 'glp1' | 'steroid' | 'peptide' | 'other';
  displayName: string;
  notes?: string;
}

/**
 * Get the Tmax (time to peak) for a medication
 * Uses explicit tMaxHours if available, otherwise estimates based on category and half-life
 */
export const getTmax = (data: MedicationHalfLife): number => {
  // Use explicit Tmax if provided
  if (data.tMaxHours !== undefined) {
    return data.tMaxHours;
  }
  
  // Estimate Tmax based on category and half-life
  // Generally, Tmax is much shorter than half-life for injectable medications
  switch (data.category) {
    case 'glp1':
      // GLP-1s (subcutaneous) typically reach peak in 1-3 days
      // Longer-acting formulations take longer to peak
      if (data.halfLifeHours >= 120) {
        return 24; // ~1 day for weekly injectables (semaglutide, tirzepatide)
      }
      return 8; // 8 hours for shorter-acting (liraglutide)
    case 'steroid':
      // Injectable steroids: Tmax varies by ester
      if (data.halfLifeHours >= 168) {
        return 48; // Long esters (cypionate, enanthate) ~2 days
      } else if (data.halfLifeHours >= 48) {
        return 24; // Medium esters (propionate) ~1 day
      }
      return 4; // Oral steroids ~4 hours
    case 'peptide':
      // Most peptides peak quickly (15 min - 2 hours)
      if (data.halfLifeHours >= 24) {
        return 4; // Longer-acting peptides (MK-677, CJC-1295 DAC)
      }
      return Math.max(0.25, data.halfLifeHours * 0.3); // Quick peptides peak at ~30% of half-life
    default:
      // Default: estimate Tmax as roughly 20% of half-life, min 1 hour
      return Math.max(1, data.halfLifeHours * 0.2);
  }
};

// Map medication names (lowercase) to half-life data
export const HALF_LIFE_DATA: Record<string, MedicationHalfLife> = {
  // GLP-1 Agonists - Tmax values from FDA prescribing information & clinical studies
  // Sources: NCBI StatPearls, FDA/EMA assessment reports, PMC clinical reviews
  'semaglutide': {
    halfLifeHours: 168, // ~7 days (FDA label)
    tMaxHours: 48, // Peak at 1-3 days, median ~2 days (NCBI StatPearls)
    category: 'glp1',
    displayName: 'Semaglutide',
    notes: 'Ozempic, Wegovy, Rybelsus'
  },
  'tirzepatide': {
    halfLifeHours: 120, // ~5 days (FDA label)
    tMaxHours: 41, // Peak at 8-72h, median ~1.7 days (FDA/EMA assessment reports)
    category: 'glp1',
    displayName: 'Tirzepatide',
    notes: 'Mounjaro, Zepbound'
  },
  'liraglutide': {
    halfLifeHours: 13, // ~13 hours (FDA label)
    tMaxHours: 11, // Peak at 8-12 hours (FDA label)
    category: 'glp1',
    displayName: 'Liraglutide',
    notes: 'Victoza, Saxenda'
  },
  'dulaglutide': {
    halfLifeHours: 120, // ~5 days (FDA label)
    tMaxHours: 48, // Peak at 24-72 hours (FDA label)
    category: 'glp1',
    displayName: 'Dulaglutide',
    notes: 'Trulicity'
  },
  'exenatide': {
    halfLifeHours: 2.4, // ~2.4 hours (FDA label)
    tMaxHours: 2, // Peak at ~2 hours (FDA label)
    category: 'glp1',
    displayName: 'Exenatide',
    notes: 'Byetta (immediate release)'
  },
  'exenatide er': {
    halfLifeHours: 168, // ~7 days extended release (FDA label)
    tMaxHours: 48, // Slow release peaks later
    category: 'glp1',
    displayName: 'Exenatide ER',
    notes: 'Bydureon'
  },
  'retatrutide': {
    halfLifeHours: 144, // ~6 days (phase 2 trial data)
    tMaxHours: 36, // Estimated from trial PK data
    category: 'glp1',
    displayName: 'Retatrutide',
    notes: 'Triple agonist (GLP-1/GIP/Glucagon)'
  },
  'survodutide': {
    halfLifeHours: 144, // ~6 days (estimated from trials)
    tMaxHours: 36, // Estimated similar to other dual agonists
    category: 'glp1',
    displayName: 'Survodutide',
    notes: 'Dual agonist'
  },
  'mazdutide': {
    halfLifeHours: 144, // ~6 days (estimated)
    tMaxHours: 36, // Estimated similar to other dual agonists
    category: 'glp1',
    displayName: 'Mazdutide',
    notes: 'Dual agonist'
  },

  // Anabolic Steroids / TRT - Updated with clinical research data
  // Sources: PubMed PMC5915615, DrugBank, SteroidPlotter research
  'testosterone cypionate': {
    halfLifeHours: 108, // ~4.5 days (PubMed: 4.05 days median)
    tMaxHours: 96, // Peak at 4-5 days post-injection (DrugBank)
    category: 'steroid',
    displayName: 'Testosterone Cypionate',
    notes: 'Injectable (oil-based)'
  },
  'testosterone enanthate': {
    halfLifeHours: 108, // ~4.5 days (similar to cypionate)
    tMaxHours: 96, // Peak at ~4 days
    category: 'steroid',
    displayName: 'Testosterone Enanthate',
    notes: 'Injectable (oil-based)'
  },
  'testosterone propionate': {
    halfLifeHours: 19, // ~0.8 days (fast ester)
    tMaxHours: 24, // Peak at ~1 day
    category: 'steroid',
    displayName: 'Testosterone Propionate',
    notes: 'Injectable (oil-based)'
  },
  'testosterone gel': {
    halfLifeHours: 24, // Designed for daily application to maintain steady state
    tMaxHours: 4, // Peak at ~4 hours after application
    category: 'steroid',
    displayName: 'Testosterone Gel',
    notes: 'Transdermal (AndroGel, Testim) - apply daily'
  },
  'testosterone cream': {
    halfLifeHours: 24, // Similar to gel - daily application
    tMaxHours: 4,
    category: 'steroid',
    displayName: 'Testosterone Cream',
    notes: 'Transdermal - apply daily'
  },
  'testosterone patch': {
    halfLifeHours: 24, // Designed for daily patch replacement
    tMaxHours: 8,
    category: 'steroid',
    displayName: 'Testosterone Patch',
    notes: 'Transdermal (Androderm) - apply daily'
  },
  'testosterone undecanoate': {
    halfLifeHours: 504, // ~21 days (injectable Nebido)
    tMaxHours: 168, // Peak at ~7 days
    category: 'steroid',
    displayName: 'Testosterone Undecanoate',
    notes: 'Nebido (injectable). Oral form (Jatenzo) has ~5hr half-life'
  },
  'testosterone undecanoate oral': {
    halfLifeHours: 5, // ~5 hours for oral Jatenzo
    tMaxHours: 2,
    category: 'steroid',
    displayName: 'Testosterone Undecanoate (Oral)',
    notes: 'Jatenzo - take twice daily with food'
  },
  'androgel': {
    halfLifeHours: 24,
    tMaxHours: 4,
    category: 'steroid',
    displayName: 'AndroGel',
    notes: 'Testosterone gel - apply daily'
  },
  'testim': {
    halfLifeHours: 24,
    tMaxHours: 4,
    category: 'steroid',
    displayName: 'Testim',
    notes: 'Testosterone gel - apply daily'
  },
  'nandrolone decanoate': {
    halfLifeHours: 144, // ~6 days (clinical studies)
    tMaxHours: 72, // Peak at ~3 days
    category: 'steroid',
    displayName: 'Nandrolone Decanoate',
    notes: 'Deca-Durabolin'
  },
  'nandrolone phenylpropionate': {
    halfLifeHours: 60, // ~2.5 days
    tMaxHours: 24, // Peak at ~1 day
    category: 'steroid',
    displayName: 'Nandrolone Phenylpropionate',
    notes: 'NPP'
  },
  'boldenone undecylenate': {
    halfLifeHours: 336, // ~14 days
    tMaxHours: 96, // Peak at ~4 days
    category: 'steroid',
    displayName: 'Boldenone Undecylenate',
    notes: 'Equipoise'
  },
  'trenbolone acetate': {
    halfLifeHours: 24, // ~1 day (fast ester)
    tMaxHours: 12, // Peak at ~12 hours
    category: 'steroid',
    displayName: 'Trenbolone Acetate',
  },
  'trenbolone enanthate': {
    halfLifeHours: 120, // ~5 days
    tMaxHours: 72, // Peak at ~3 days
    category: 'steroid',
    displayName: 'Trenbolone Enanthate',
  },
  'masteron': {
    halfLifeHours: 48, // ~2 days (propionate default)
    tMaxHours: 24,
    category: 'steroid',
    displayName: 'Masteron',
    notes: 'Drostanolone - specify Propionate or Enanthate'
  },
  'masteron propionate': {
    halfLifeHours: 48, // ~2 days
    tMaxHours: 24,
    category: 'steroid',
    displayName: 'Masteron Propionate',
    notes: 'Drostanolone Propionate'
  },
  'masteron enanthate': {
    halfLifeHours: 120, // ~5 days
    tMaxHours: 72,
    category: 'steroid',
    displayName: 'Masteron Enanthate',
    notes: 'Drostanolone Enanthate'
  },
  'drostanolone propionate': {
    halfLifeHours: 48, // ~2 days
    tMaxHours: 24,
    category: 'steroid',
    displayName: 'Drostanolone Propionate',
  },
  'drostanolone enanthate': {
    halfLifeHours: 120, // ~5 days
    tMaxHours: 72,
    category: 'steroid',
    displayName: 'Drostanolone Enanthate',
  },
  'primobolan': {
    halfLifeHours: 120, // ~5 days (depot/enanthate)
    tMaxHours: 72,
    category: 'steroid',
    displayName: 'Primobolan',
    notes: 'Methenolone - Injectable depot form'
  },
  'primobolan depot': {
    halfLifeHours: 120, // ~5 days
    tMaxHours: 72,
    category: 'steroid',
    displayName: 'Primobolan Depot',
    notes: 'Methenolone Enanthate (injectable)'
  },
  'methenolone enanthate': {
    halfLifeHours: 120, // ~5 days
    tMaxHours: 72,
    category: 'steroid',
    displayName: 'Methenolone Enanthate',
  },
  'methenolone acetate': {
    halfLifeHours: 6, // ~6 hours (oral)
    tMaxHours: 2,
    category: 'steroid',
    displayName: 'Methenolone Acetate',
    notes: 'Oral Primobolan'
  },
  'hcg': {
    halfLifeHours: 29, // ~29 hours (clinical data)
    tMaxHours: 6, // Peak at ~6 hours
    category: 'peptide',
    displayName: 'HCG',
  },
  
  // Additional steroids - with Tmax for oral steroids (fast absorption)
  'testosterone': {
    halfLifeHours: 108, // Default to enanthate-like
    tMaxHours: 96,
    category: 'steroid',
    displayName: 'Testosterone',
  },
  'sustanon': {
    halfLifeHours: 360, // ~15 days (blend of esters)
    tMaxHours: 48, // Fast esters peak early, slow esters extend
    category: 'steroid',
    displayName: 'Sustanon 250',
    notes: 'Blend: propionate, phenylpropionate, isocaproate, decanoate'
  },
  'deca': {
    halfLifeHours: 144, // ~6 days
    tMaxHours: 72,
    category: 'steroid',
    displayName: 'Deca',
  },
  'anavar': {
    halfLifeHours: 9,
    tMaxHours: 1, // Oral - peaks quickly
    category: 'steroid',
    displayName: 'Anavar',
  },
  'oxandrolone': {
    halfLifeHours: 9,
    tMaxHours: 1,
    category: 'steroid',
    displayName: 'Oxandrolone',
  },
  'winstrol': {
    halfLifeHours: 9, // Oral version
    tMaxHours: 1,
    category: 'steroid',
    displayName: 'Winstrol',
  },
  'winstrol depot': {
    halfLifeHours: 24, // Injectable version
    tMaxHours: 12,
    category: 'steroid',
    displayName: 'Winstrol Depot',
    notes: 'Stanozolol injectable (water-based)'
  },
  'stanozolol': {
    halfLifeHours: 9,
    tMaxHours: 1,
    category: 'steroid',
    displayName: 'Stanozolol',
  },
  'dianabol': {
    halfLifeHours: 5,
    tMaxHours: 1.5, // Peak at 1-2 hours
    category: 'steroid',
    displayName: 'Dianabol',
  },
  'methandrostenolone': {
    halfLifeHours: 5,
    tMaxHours: 1.5,
    category: 'steroid',
    displayName: 'Methandrostenolone',
  },
  'anadrol': {
    halfLifeHours: 9,
    tMaxHours: 2,
    category: 'steroid',
    displayName: 'Anadrol',
  },
  'oxymetholone': {
    halfLifeHours: 9,
    tMaxHours: 2,
    category: 'steroid',
    displayName: 'Oxymetholone',
  },
  'turinabol': {
    halfLifeHours: 16,
    tMaxHours: 3,
    category: 'steroid',
    displayName: 'Turinabol',
  },
  'halotestin': {
    halfLifeHours: 9,
    tMaxHours: 2,
    category: 'steroid',
    displayName: 'Halotestin',
  },
  'proviron': {
    halfLifeHours: 12,
    tMaxHours: 3,
    category: 'steroid',
    displayName: 'Proviron',
  },
  'superdrol': {
    halfLifeHours: 8,
    tMaxHours: 1,
    category: 'steroid',
    displayName: 'Superdrol',
  },
  
  // Sexual Health / ED Medications
  'cialis': {
    halfLifeHours: 17.5, // ~17.5 hours (FDA label)
    tMaxHours: 2, // Peak at ~2 hours (range 0.5-6 hours)
    category: 'other',
    displayName: 'Cialis',
    notes: 'Tadalafil - half-life allows for daily or as-needed dosing'
  },
  'tadalafil': {
    halfLifeHours: 17.5,
    tMaxHours: 2,
    category: 'other',
    displayName: 'Tadalafil',
    notes: 'Generic Cialis'
  },
  'viagra': {
    halfLifeHours: 4, // ~4 hours
    tMaxHours: 1, // Peak at ~1 hour
    category: 'other',
    displayName: 'Viagra',
    notes: 'Sildenafil'
  },
  'sildenafil': {
    halfLifeHours: 4,
    tMaxHours: 1,
    category: 'other',
    displayName: 'Sildenafil',
    notes: 'Generic Viagra'
  },
  
  // Peptides with known half-lives and Tmax values
  'bpc-157': {
    halfLifeHours: 5, // ~4-6 hours estimated
    tMaxHours: 0.5, // Peak at ~30 min (subcutaneous)
    category: 'peptide',
    displayName: 'BPC-157',
  },
  'tb-500': {
    halfLifeHours: 2,
    tMaxHours: 0.25, // Peak at ~15 min
    category: 'peptide',
    displayName: 'TB-500',
  },
  'thymosin beta-4': {
    halfLifeHours: 2,
    tMaxHours: 0.25,
    category: 'peptide',
    displayName: 'Thymosin Beta-4',
  },
  'bpc + tb-500': {
    halfLifeHours: 3.5, // Average of BPC-157 (~5h) and TB-500 (~2h)
    tMaxHours: 0.5,
    category: 'peptide',
    displayName: 'BPC + TB-500',
    notes: 'BPC-157 and TB-500 combination'
  },
  'ipamorelin': {
    halfLifeHours: 2,
    tMaxHours: 0.25, // Peak at ~15-30 min
    category: 'peptide',
    displayName: 'Ipamorelin',
  },
  'cjc-1295': {
    halfLifeHours: 168, // ~7 days WITH DAC (without DAC: ~30 min)
    tMaxHours: 4, // Peak at ~4 hours
    category: 'peptide',
    displayName: 'CJC-1295',
    notes: 'With DAC modification - without DAC only ~30 min'
  },
  'cjc-1295 dac': {
    halfLifeHours: 168, // ~5-8 days
    tMaxHours: 4,
    category: 'peptide',
    displayName: 'CJC-1295 DAC',
    notes: 'Drug Affinity Complex extends half-life'
  },
  'cjc-1295 no dac': {
    halfLifeHours: 0.5, // ~30 minutes
    tMaxHours: 0.1, // Peak at ~6 min
    category: 'peptide',
    displayName: 'CJC-1295 (no DAC)',
    notes: 'Also called Mod GRF 1-29'
  },
  'mod grf 1-29': {
    halfLifeHours: 0.5, // ~30 minutes
    tMaxHours: 0.1,
    category: 'peptide',
    displayName: 'Mod GRF 1-29',
    notes: 'CJC-1295 without DAC'
  },
  'sermorelin': {
    halfLifeHours: 0.2, // ~10-20 minutes
    tMaxHours: 0.05, // Peak at ~3 min
    category: 'peptide',
    displayName: 'Sermorelin',
  },
  'ghrp-6': {
    halfLifeHours: 0.5,
    tMaxHours: 0.25,
    category: 'peptide',
    displayName: 'GHRP-6',
  },
  'ghrp-2': {
    halfLifeHours: 0.5,
    tMaxHours: 0.25,
    category: 'peptide',
    displayName: 'GHRP-2',
  },
  'mk-677': {
    halfLifeHours: 24,
    tMaxHours: 4, // Peak at ~4 hours (oral)
    category: 'peptide',
    displayName: 'MK-677',
  },
  'ibutamoren': {
    halfLifeHours: 24,
    tMaxHours: 4,
    category: 'peptide',
    displayName: 'Ibutamoren',
  },
  'pt-141': {
    halfLifeHours: 2,
    tMaxHours: 0.5,
    category: 'peptide',
    displayName: 'PT-141',
  },
  'bremelanotide': {
    halfLifeHours: 2,
    tMaxHours: 0.5,
    category: 'peptide',
    displayName: 'Bremelanotide',
  },
  'melanotan ii': {
    halfLifeHours: 0.5,
    tMaxHours: 0.1,
    category: 'peptide',
    displayName: 'Melanotan II',
  },
  'melanotan 2': {
    halfLifeHours: 0.5,
    tMaxHours: 0.1,
    category: 'peptide',
    displayName: 'Melanotan 2',
  },
  
  // HGH & Growth Hormone
  'hgh': {
    halfLifeHours: 4, // ~3-5 hours (FDA label)
    tMaxHours: 3, // Peak at 2-4 hours
    category: 'peptide',
    displayName: 'HGH',
    notes: 'Human Growth Hormone / Somatropin'
  },
  'somatropin': {
    halfLifeHours: 4,
    tMaxHours: 3,
    category: 'peptide',
    displayName: 'Somatropin',
    notes: 'Genotropin, Humatrope, Norditropin'
  },
  'genotropin': {
    halfLifeHours: 4,
    tMaxHours: 3,
    category: 'peptide',
    displayName: 'Genotropin',
  },
  'humatrope': {
    halfLifeHours: 4,
    tMaxHours: 3,
    category: 'peptide',
    displayName: 'Humatrope',
  },
  'norditropin': {
    halfLifeHours: 4,
    tMaxHours: 3,
    category: 'peptide',
    displayName: 'Norditropin',
  },
  
  // Health & Metabolic Medications
  'metformin': {
    halfLifeHours: 6, // ~4-8.7 hours
    tMaxHours: 2.5, // Peak at 2-3 hours
    category: 'other',
    displayName: 'Metformin',
    notes: 'Glucophage - blood sugar control & longevity'
  },
  'berberine': {
    halfLifeHours: 4, // ~4 hours
    tMaxHours: 2,
    category: 'other',
    displayName: 'Berberine',
    notes: 'Natural supplement for blood sugar'
  },
  'dhea': {
    halfLifeHours: 12, // Variable, ~12 hours
    tMaxHours: 2,
    category: 'other',
    displayName: 'DHEA',
    notes: 'Hormone precursor'
  },
  'pregnenolone': {
    halfLifeHours: 24, // Estimated
    tMaxHours: 3,
    category: 'other',
    displayName: 'Pregnenolone',
    notes: 'Hormone precursor'
  },
  'levothyroxine': {
    halfLifeHours: 168, // ~7 days
    tMaxHours: 6,
    category: 'other',
    displayName: 'Levothyroxine',
    notes: 'Synthroid - thyroid hormone (T4)'
  },
  'synthroid': {
    halfLifeHours: 168,
    tMaxHours: 6,
    category: 'other',
    displayName: 'Synthroid',
    notes: 'Levothyroxine (T4)'
  },
  'liothyronine': {
    halfLifeHours: 24, // ~1 day
    tMaxHours: 3,
    category: 'other',
    displayName: 'Liothyronine',
    notes: 'Cytomel - thyroid hormone (T3)'
  },
  'cytomel': {
    halfLifeHours: 24,
    tMaxHours: 3,
    category: 'other',
    displayName: 'Cytomel',
    notes: 'Liothyronine (T3)'
  },
  'armour thyroid': {
    halfLifeHours: 48, // Blend of T3/T4
    tMaxHours: 4,
    category: 'other',
    displayName: 'Armour Thyroid',
    notes: 'Natural desiccated thyroid (T3+T4)'
  },
  'aspirin': {
    halfLifeHours: 4, // ~4 hours for acetylsalicylic acid (effect lasts longer)
    tMaxHours: 1,
    category: 'other',
    displayName: 'Low-dose Aspirin',
    notes: 'Baby aspirin 81mg - cardiovascular protection'
  },
  'atorvastatin': {
    halfLifeHours: 14, // ~14 hours
    tMaxHours: 2,
    category: 'other',
    displayName: 'Atorvastatin',
    notes: 'Lipitor - cholesterol'
  },
  'rosuvastatin': {
    halfLifeHours: 19, // ~19 hours
    tMaxHours: 5,
    category: 'other',
    displayName: 'Rosuvastatin',
    notes: 'Crestor - cholesterol'
  },
  'lisinopril': {
    halfLifeHours: 12, // ~12 hours
    tMaxHours: 7,
    category: 'other',
    displayName: 'Lisinopril',
    notes: 'ACE inhibitor - blood pressure'
  },
  'losartan': {
    halfLifeHours: 6, // ~2 hours for losartan, ~6-9 for active metabolite
    tMaxHours: 3,
    category: 'other',
    displayName: 'Losartan',
    notes: 'ARB - blood pressure'
  },
  'amlodipine': {
    halfLifeHours: 40, // ~30-50 hours
    tMaxHours: 8,
    category: 'other',
    displayName: 'Amlodipine',
    notes: 'Calcium channel blocker - blood pressure'
  },
  
  // Bioregulators (keeping popular ones)
  'epitalon': {
    halfLifeHours: 4, // Short peptide half-life
    tMaxHours: 0.5,
    category: 'peptide',
    displayName: 'Epitalon',
    notes: 'Telomere/longevity peptide'
  },
  'thymalin': {
    halfLifeHours: 4,
    tMaxHours: 0.5,
    category: 'peptide',
    displayName: 'Thymalin',
    notes: 'Immune peptide'
  },
};

/**
 * Get half-life data for a medication by name
 * Performs fuzzy matching to handle variations
 */
export const getHalfLifeData = (medicationName: string): MedicationHalfLife | null => {
  const normalized = medicationName.toLowerCase().trim();
  
  // Direct match
  if (HALF_LIFE_DATA[normalized]) {
    return HALF_LIFE_DATA[normalized];
  }
  
  // Fuzzy matching for common variations
  for (const [key, data] of Object.entries(HALF_LIFE_DATA)) {
    // Check if the medication name contains the key or vice versa
    if (normalized.includes(key) || key.includes(normalized)) {
      return data;
    }
    
    // Check display name
    if (data.displayName.toLowerCase() === normalized) {
      return data;
    }
    
    // Check notes for brand names
    if (data.notes?.toLowerCase().includes(normalized)) {
      return data;
    }
  }
  
  return null;
};

/**
 * Check if a medication has half-life tracking available
 */
export const hasHalfLifeTracking = (medicationName: string): boolean => {
  return getHalfLifeData(medicationName) !== null;
};

/**
 * Get all medications with half-life tracking
 */
export const getSupportedMedications = (): string[] => {
  return Object.values(HALF_LIFE_DATA).map(d => d.displayName);
};
