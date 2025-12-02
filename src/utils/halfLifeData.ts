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
  },
  'testosterone enanthate': {
    halfLifeHours: 168, // ~7 days
    category: 'steroid',
    displayName: 'Testosterone Enanthate',
  },
  'testosterone propionate': {
    halfLifeHours: 48, // ~2 days
    category: 'steroid',
    displayName: 'Testosterone Propionate',
  },
  'testosterone undecanoate': {
    halfLifeHours: 504, // ~21 days
    category: 'steroid',
    displayName: 'Testosterone Undecanoate',
    notes: 'Nebido'
  },
  'nandrolone decanoate': {
    halfLifeHours: 360, // ~15 days
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
    notes: 'Human Chorionic Gonadotropin'
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
