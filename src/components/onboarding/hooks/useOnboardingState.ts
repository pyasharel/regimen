import { useState, useEffect, useCallback } from 'react';

export type PathType = 'glp1' | 'peptides' | 'trt' | 'multiple';
export type PathRouting = 'A' | 'B';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'experienced';

export interface OnboardingData {
  // Path selection
  pathType: PathType | null;
  pathRouting: PathRouting | null;
  
  // Goals & Experience
  goals: string[];
  experienceLevel: ExperienceLevel | null;
  painPoints: string[];
  
  // User info (moved earlier for personalization)
  firstName: string;
  
  // Body metrics
  heightFeet: number | null;
  heightInches: number | null;
  heightCm: number | null;
  heightUnit: 'ft' | 'cm';
  currentWeight: number | null;
  goalWeight: number | null;
  weightUnit: 'lb' | 'kg';
  
  // Medication setup
  medication: {
    name: string;
    dose: number;
    doseUnit: string;
    frequency: string;
    frequencyDays?: number;
    specificDays?: string[];
    timeOfDay: string;
    customTime?: string;
  } | null;
  
  // Promo code (if entered during onboarding)
  promoCode: string | null;
  
  // Terms accepted
  termsAccepted: boolean;
  
  // Timestamps
  startedAt: number;
  lastActiveAt: number;
}

const STORAGE_KEY = 'regimen_onboarding_state';
const SCHEMA_VERSION = 2; // Increment this when schema changes
const MAX_STATE_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const initialData: OnboardingData = {
  pathType: null,
  pathRouting: null,
  goals: [],
  experienceLevel: null,
  painPoints: [],
  firstName: '',
  heightFeet: null,
  heightInches: null,
  heightCm: null,
  heightUnit: 'ft',
  currentWeight: null,
  goalWeight: null,
  weightUnit: 'lb',
  medication: null,
  promoCode: null,
  termsAccepted: false,
  startedAt: Date.now(),
  lastActiveAt: Date.now(),
};

// Optimized screen order (removed long-term-results, moved name earlier, moved notifications/rating)
const SCREEN_ORDER = [
  'splash',
  'path-selection',
  'personalization',
  'goals',
  'experience',
  'pain-points',
  'name', // Moved earlier for personalization
  'height-weight', // conditional
  'goal-weight', // conditional
  'goal-validation', // conditional
  'potential', // conditional - now goal-adaptive
  'outcome', // Consolidated (removed long-term-results)
  'rating', // Moved after positive outcome screen
  'notifications', // Moved earlier for psychological commitment
  'features',
  'privacy',
  'medication-setup',
  'account-creation',
  'loading',
  'disclaimer',
  'paywall',
  'complete',
];

export function useOnboardingState() {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<OnboardingData>(initialData);
  const [isLoading, setIsLoading] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        
        // Check schema version - if mismatch, start fresh
        if (parsed.schemaVersion !== SCHEMA_VERSION) {
          console.log('[Onboarding] Schema version mismatch, starting fresh');
          localStorage.removeItem(STORAGE_KEY);
          setIsLoading(false);
          return;
        }
        
        // Check if state is too old (> 30 days)
        if (parsed.data?.startedAt && Date.now() - parsed.data.startedAt > MAX_STATE_AGE_MS) {
          console.log('[Onboarding] State too old, starting fresh');
          localStorage.removeItem(STORAGE_KEY);
          setIsLoading(false);
          return;
        }
        
        setData(prev => ({
          ...prev,
          ...parsed.data,
          lastActiveAt: Date.now(),
        }));
        setCurrentStep(parsed.currentStep || 0);
      }
    } catch (e) {
      console.error('[Onboarding] Failed to load saved state:', e);
    }
    setIsLoading(false);
  }, []);

  // Save to localStorage on changes
  useEffect(() => {
    if (isLoading) return;
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        schemaVersion: SCHEMA_VERSION,
        currentStep,
        data: { ...data, lastActiveAt: Date.now() },
      }));
    } catch (e) {
      console.error('[Onboarding] Failed to save state:', e);
      // Check for private browsing / quota exceeded
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        console.warn('[Onboarding] localStorage quota exceeded - possible private browsing mode');
      }
    }
  }, [currentStep, data, isLoading]);

  // Get the screen list
  const getScreenList = useCallback(() => {
    return SCREEN_ORDER;
  }, []);

  // Check if user has a weight goal
  const hasWeightGoal = data.goals.some(g => 
    g.toLowerCase().includes('weight') || 
    g.toLowerCase().includes('lose') ||
    g.toLowerCase().includes('gain')
  );

  // Calculate total steps (excluding conditional screens if not applicable)
  const getTotalSteps = useCallback(() => {
    let total = SCREEN_ORDER.length;
    
    // Remove conditional weight screens if no weight goal
    if (!hasWeightGoal) {
      total -= 4; // height-weight, goal-weight, goal-validation, potential
    }
    
    return total;
  }, [hasWeightGoal]);

  // Calculate progress percentage
  const getProgress = useCallback(() => {
    const total = getTotalSteps();
    return Math.min(100, Math.round((currentStep / (total - 1)) * 100));
  }, [currentStep, getTotalSteps]);

  // Get current screen ID
  const getCurrentScreen = useCallback(() => {
    return SCREEN_ORDER[currentStep] || 'splash';
  }, [currentStep]);

  // Update data
  const updateData = useCallback((updates: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...updates }));
  }, []);

  // Navigation
  const goToNext = useCallback(() => {
    setCurrentStep(prev => prev + 1);
  }, []);

  const goToPrevious = useCallback(() => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  }, []);

  const goToStep = useCallback((step: number) => {
    setCurrentStep(step);
  }, []);

  // Clear saved state
  const clearState = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setData(initialData);
    setCurrentStep(0);
  }, []);

  // Check if we should skip a screen
  const shouldSkipScreen = useCallback((screenId: string) => {
    // Skip weight-related screens if no weight goal
    if (!hasWeightGoal) {
      if (['height-weight', 'goal-weight', 'goal-validation', 'potential'].includes(screenId)) {
        return true;
      }
    }
    return false;
  }, [hasWeightGoal]);

  return {
    // State
    currentStep,
    data,
    isLoading,
    
    // Computed
    hasWeightGoal,
    progress: getProgress(),
    totalSteps: getTotalSteps(),
    currentScreen: getCurrentScreen(),
    
    // Actions
    updateData,
    goToNext,
    goToPrevious,
    goToStep,
    setCurrentStep,
    clearState,
    shouldSkipScreen,
    getScreenList,
  };
}
