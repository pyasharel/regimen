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
  category: 'glp1' | 'steroid' | 'peptide' | 'other';
  displayName: string;
  notes?: string;
}

// Map medication names (lowercase) to half-life data
export const HALF_LIFE_DATA: Record<string, MedicationHalfLife> = {
  // GLP-1 Agonists
  'semaglutide': {
    halfLifeHours: 168, // ~7 days
    category: 'glp1',
    displayName: 'Semaglutide',
    notes: 'Ozempic, Wegovy, Rybelsus'
  },
  'tirzepatide': {
    halfLifeHours: 120, // ~5 days
    category: 'glp1',
    displayName: 'Tirzepatide',
    notes: 'Mounjaro, Zepbound'
  },
  'liraglutide': {
    halfLifeHours: 13,
    category: 'glp1',
    displayName: 'Liraglutide',
    notes: 'Victoza, Saxenda'
  },
  'dulaglutide': {
    halfLifeHours: 120, // ~5 days
    category: 'glp1',
    displayName: 'Dulaglutide',
    notes: 'Trulicity'
  },
  'exenatide': {
    halfLifeHours: 2.4,
    category: 'glp1',
    displayName: 'Exenatide',
    notes: 'Byetta (immediate release)'
  },
  'exenatide er': {
    halfLifeHours: 168, // ~7 days (extended release)
    category: 'glp1',
    displayName: 'Exenatide ER',
    notes: 'Bydureon'
  },
  'retatrutide': {
    halfLifeHours: 144, // ~6 days (estimated from trials)
    category: 'glp1',
    displayName: 'Retatrutide',
    notes: 'Triple agonist (GLP-1/GIP/Glucagon)'
  },
  'survodutide': {
    halfLifeHours: 144, // ~6 days (estimated)
    category: 'glp1',
    displayName: 'Survodutide',
    notes: 'Dual agonist'
  },
  'mazdutide': {
    halfLifeHours: 144, // ~6 days (estimated)
    category: 'glp1',
    displayName: 'Mazdutide',
    notes: 'Dual agonist'
  },

  // Anabolic Steroids / TRT
  'testosterone cypionate': {
    halfLifeHours: 192, // ~8 days
    category: 'steroid',
    displayName: 'Testosterone Cypionate',
    notes: 'Injectable (oil-based)'
  },
  'testosterone enanthate': {
    halfLifeHours: 168, // ~7 days
    category: 'steroid',
    displayName: 'Testosterone Enanthate',
    notes: 'Injectable (oil-based)'
  },
  'testosterone propionate': {
    halfLifeHours: 48, // ~2 days
    category: 'steroid',
    displayName: 'Testosterone Propionate',
    notes: 'Injectable (oil-based)'
  },
  'testosterone gel': {
    halfLifeHours: 24, // Designed for daily application to maintain steady state
    category: 'steroid',
    displayName: 'Testosterone Gel',
    notes: 'Transdermal (AndroGel, Testim) - apply daily'
  },
  'testosterone cream': {
    halfLifeHours: 24, // Similar to gel - daily application
    category: 'steroid',
    displayName: 'Testosterone Cream',
    notes: 'Transdermal - apply daily'
  },
  'testosterone patch': {
    halfLifeHours: 24, // Designed for daily patch replacement
    category: 'steroid',
    displayName: 'Testosterone Patch',
    notes: 'Transdermal (Androderm) - apply daily'
  },
  'testosterone undecanoate': {
    halfLifeHours: 504, // ~21 days (injectable Nebido)
    category: 'steroid',
    displayName: 'Testosterone Undecanoate',
    notes: 'Nebido (injectable). Oral form (Jatenzo) has ~5hr half-life'
  },
  'testosterone undecanoate oral': {
    halfLifeHours: 5, // ~5 hours for oral Jatenzo
    category: 'steroid',
    displayName: 'Testosterone Undecanoate (Oral)',
    notes: 'Jatenzo - take twice daily with food'
  },
  'androgel': {
    halfLifeHours: 24,
    category: 'steroid',
    displayName: 'AndroGel',
    notes: 'Testosterone gel - apply daily'
  },
  'testim': {
    halfLifeHours: 24,
    category: 'steroid',
    displayName: 'Testim',
    notes: 'Testosterone gel - apply daily'
  },
  'nandrolone decanoate': {
    halfLifeHours: 288, // ~12 days (range: 6-12 days)
    category: 'steroid',
    displayName: 'Nandrolone Decanoate',
    notes: 'Deca-Durabolin'
  },
  'nandrolone phenylpropionate': {
    halfLifeHours: 72, // ~3 days
    category: 'steroid',
    displayName: 'Nandrolone Phenylpropionate',
    notes: 'NPP'
  },
  'boldenone undecylenate': {
    halfLifeHours: 336, // ~14 days
    category: 'steroid',
    displayName: 'Boldenone Undecylenate',
    notes: 'Equipoise'
  },
  'trenbolone acetate': {
    halfLifeHours: 48, // ~2 days
    category: 'steroid',
    displayName: 'Trenbolone Acetate',
  },
  'trenbolone enanthate': {
    halfLifeHours: 168, // ~7 days
    category: 'steroid',
    displayName: 'Trenbolone Enanthate',
  },
  'masteron': {
    halfLifeHours: 72, // ~3 days (propionate)
    category: 'steroid',
    displayName: 'Masteron',
    notes: 'Drostanolone Propionate'
  },
  'primobolan': {
    halfLifeHours: 240, // ~10 days (enanthate)
    category: 'steroid',
    displayName: 'Primobolan',
    notes: 'Methenolone Enanthate'
  },
  'hcg': {
    halfLifeHours: 36,
    category: 'peptide',
    displayName: 'HCG',
  },
  
  // Additional steroids
  'testosterone': {
    halfLifeHours: 168, // Default to enanthate-like
    category: 'steroid',
    displayName: 'Testosterone',
  },
  'sustanon': {
    halfLifeHours: 384, // ~16 days (due to decanoate ester)
    category: 'steroid',
    displayName: 'Sustanon 250',
  },
  'deca': {
    halfLifeHours: 288, // ~12 days (range: 6-12 days)
    category: 'steroid',
    displayName: 'Deca',
  },
  'anavar': {
    halfLifeHours: 9,
    category: 'steroid',
    displayName: 'Anavar',
  },
  'oxandrolone': {
    halfLifeHours: 9,
    category: 'steroid',
    displayName: 'Oxandrolone',
  },
  'winstrol': {
    halfLifeHours: 9, // Oral version
    category: 'steroid',
    displayName: 'Winstrol',
  },
  'stanozolol': {
    halfLifeHours: 9,
    category: 'steroid',
    displayName: 'Stanozolol',
  },
  'dianabol': {
    halfLifeHours: 5,
    category: 'steroid',
    displayName: 'Dianabol',
  },
  'methandrostenolone': {
    halfLifeHours: 5,
    category: 'steroid',
    displayName: 'Methandrostenolone',
  },
  'anadrol': {
    halfLifeHours: 9,
    category: 'steroid',
    displayName: 'Anadrol',
  },
  'oxymetholone': {
    halfLifeHours: 9,
    category: 'steroid',
    displayName: 'Oxymetholone',
  },
  'turinabol': {
    halfLifeHours: 16,
    category: 'steroid',
    displayName: 'Turinabol',
  },
  'halotestin': {
    halfLifeHours: 9,
    category: 'steroid',
    displayName: 'Halotestin',
  },
  'proviron': {
    halfLifeHours: 12,
    category: 'steroid',
    displayName: 'Proviron',
  },
  'superdrol': {
    halfLifeHours: 8,
    category: 'steroid',
    displayName: 'Superdrol',
  },
  
  // More peptides with known half-lives
  'bpc-157': {
    halfLifeHours: 5, // ~4-6 hours estimated
    category: 'peptide',
    displayName: 'BPC-157',
  },
  'tb-500': {
    halfLifeHours: 2,
    category: 'peptide',
    displayName: 'TB-500',
  },
  'thymosin beta-4': {
    halfLifeHours: 2,
    category: 'peptide',
    displayName: 'Thymosin Beta-4',
  },
  'ipamorelin': {
    halfLifeHours: 2,
    category: 'peptide',
    displayName: 'Ipamorelin',
  },
  'cjc-1295': {
    halfLifeHours: 168, // ~7 days WITH DAC (without DAC: ~30 min)
    category: 'peptide',
    displayName: 'CJC-1295',
    notes: 'With DAC modification - without DAC only ~30 min'
  },
  'cjc-1295 dac': {
    halfLifeHours: 168, // ~5-8 days
    category: 'peptide',
    displayName: 'CJC-1295 DAC',
    notes: 'Drug Affinity Complex extends half-life'
  },
  'cjc-1295 no dac': {
    halfLifeHours: 0.5, // ~30 minutes
    category: 'peptide',
    displayName: 'CJC-1295 (no DAC)',
    notes: 'Also called Mod GRF 1-29'
  },
  'mod grf 1-29': {
    halfLifeHours: 0.5, // ~30 minutes
    category: 'peptide',
    displayName: 'Mod GRF 1-29',
    notes: 'CJC-1295 without DAC'
  },
  'sermorelin': {
    halfLifeHours: 0.2, // ~10-20 minutes
    category: 'peptide',
    displayName: 'Sermorelin',
  },
  'ghrp-6': {
    halfLifeHours: 0.5,
    category: 'peptide',
    displayName: 'GHRP-6',
  },
  'ghrp-2': {
    halfLifeHours: 0.5,
    category: 'peptide',
    displayName: 'GHRP-2',
  },
  'mk-677': {
    halfLifeHours: 24,
    category: 'peptide',
    displayName: 'MK-677',
  },
  'ibutamoren': {
    halfLifeHours: 24,
    category: 'peptide',
    displayName: 'Ibutamoren',
  },
  'pt-141': {
    halfLifeHours: 2,
    category: 'peptide',
    displayName: 'PT-141',
  },
  'bremelanotide': {
    halfLifeHours: 2,
    category: 'peptide',
    displayName: 'Bremelanotide',
  },
  'melanotan ii': {
    halfLifeHours: 0.5,
    category: 'peptide',
    displayName: 'Melanotan II',
  },
  'melanotan 2': {
    halfLifeHours: 0.5,
    category: 'peptide',
    displayName: 'Melanotan 2',
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
