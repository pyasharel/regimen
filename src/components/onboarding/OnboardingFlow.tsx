import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { OnboardingLayout } from './OnboardingLayout';
import { useOnboardingState, PathType, PathRouting, ExperienceLevel } from './hooks/useOnboardingState';
import { supabase } from '@/integrations/supabase/client';
import { trackOnboardingStep, trackOnboardingComplete, trackOnboardingSkip } from '@/utils/analytics';

// Screen imports
import { SplashScreen } from './screens/SplashScreen';
import { PathSelectionScreen } from './screens/PathSelectionScreen';
import { PersonalizationScreen } from './screens/PersonalizationScreen';
import { GoalsScreen } from './screens/GoalsScreen';
import { ExperienceScreen } from './screens/ExperienceScreen';
import { PainPointsScreen } from './screens/PainPointsScreen';
import { NameScreen } from './screens/NameScreen';
import { HeightWeightScreen } from './screens/HeightWeightScreen';
import { GoalWeightScreen } from './screens/GoalWeightScreen';
import { GoalValidationScreen } from './screens/GoalValidationScreen';
import { PotentialScreen } from './screens/PotentialScreen';
import { OutcomeScreen } from './screens/OutcomeScreen';
import { RatingScreen } from './screens/RatingScreen';
import { NotificationsScreen } from './screens/NotificationsScreen';
import { FeaturesScreen } from './screens/FeaturesScreen';
import { PrivacyScreen } from './screens/PrivacyScreen';
import { MedicationSetupScreen } from './screens/MedicationSetupScreen';
import { AccountCreationScreen } from './screens/AccountCreationScreen';
import { LoadingScreen } from './screens/LoadingScreen';
import { DisclaimerScreen } from './screens/DisclaimerScreen';
import { OnboardingPaywallScreen } from './screens/OnboardingPaywallScreen';
import { CompleteScreen } from './screens/CompleteScreen';

// Screen IDs in order - notifications after medication for contextual relevance
const SCREEN_ORDER = [
  'splash',
  'path-selection',
  'personalization',
  'goals',
  'name', // Moved much earlier for personalization throughout
  'experience',
  'pain-points',
  'height-weight',
  'goal-weight',
  'goal-validation',
  'potential',
  'features', // How Regimen helps - BEFORE 2x graph
  'outcome', // 2x graph - builds to crescendo
  'rating', // After seeing value
  'privacy',
  'medication-setup',
  'notifications', // After medication setup for contextual relevance
  'account-creation',
  'loading',
  'paywall', // Moved before disclaimer
  'disclaimer', // After paywall - less interruption
  'complete',
] as const;

type ScreenId = typeof SCREEN_ORDER[number];

export function OnboardingFlow() {
  const navigate = useNavigate();
  const {
    currentStep,
    data,
    progress,
    hasWeightGoal,
    updateData,
    setCurrentStep,
    clearState,
  } = useOnboardingState();

  // Check if user is already authenticated and has completed onboarding
  useEffect(() => {
    const checkExistingUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // User is already logged in - check if they completed onboarding
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('user_id', session.user.id)
          .single();
        
        if (profile?.onboarding_completed) {
          // Already onboarded, redirect to app
          navigate('/today', { replace: true });
        }
      }
    };
    checkExistingUser();
  }, [navigate]);

  // Set onboarding flag on mount, clear on unmount/complete
  useEffect(() => {
    localStorage.setItem('regimen_in_onboarding', 'true');
    console.log('[Onboarding] Set in-onboarding flag');
    
    return () => {
      // Only clear if not navigating to complete (handleComplete clears it)
      // This handles browser back/refresh edge cases
    };
  }, []);

  // Force light mode during onboarding, default new users to light mode
  useEffect(() => {
    const savedTheme = localStorage.getItem('vite-ui-theme');
    document.documentElement.classList.remove('dark');
    
    return () => {
      // For new users (no saved theme), keep light mode as default
      // Only restore dark if user explicitly chose it before
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      }
      // If no saved theme, ensure light mode stays (new user default)
      if (!savedTheme) {
        localStorage.setItem('vite-ui-theme', 'light');
      }
    };
  }, []);

  // Check if goal-validation should be skipped (no meaningful weight difference)
  const shouldSkipGoalValidation = !data.goalWeight || data.goalWeight === data.currentWeight;

  // Get current screen with skip logic
  const getCurrentScreenId = (): ScreenId => {
    let step = currentStep;
    let screenId = SCREEN_ORDER[step];
    
    // Skip weight-related screens if no weight goal
    while (screenId && !hasWeightGoal && 
      ['height-weight', 'goal-weight', 'goal-validation', 'potential'].includes(screenId)) {
      step++;
      screenId = SCREEN_ORDER[step];
    }
    
    // Skip goal-validation if no meaningful weight difference
    while (screenId === 'goal-validation' && shouldSkipGoalValidation) {
      step++;
      screenId = SCREEN_ORDER[step];
    }
    
    // Skip notifications if user skipped medication setup (will prompt after first compound in app)
    while (screenId === 'notifications' && !data.medication?.name) {
      step++;
      screenId = SCREEN_ORDER[step];
    }
    
    return screenId || 'complete';
  };

  const currentScreen = getCurrentScreenId();

  // Track onboarding screen views for funnel analysis
  useEffect(() => {
    const screenIndex = SCREEN_ORDER.indexOf(currentScreen as typeof SCREEN_ORDER[number]);
    if (screenIndex >= 0) {
      trackOnboardingStep(currentScreen, screenIndex + 1, SCREEN_ORDER.length);
    }
  }, [currentScreen]);

  // Handle navigation
  const handleNext = () => {
    let nextStep = currentStep + 1;
    
    // Skip weight screens if needed
    while (SCREEN_ORDER[nextStep] && !hasWeightGoal &&
      ['height-weight', 'goal-weight', 'goal-validation', 'potential'].includes(SCREEN_ORDER[nextStep])) {
      nextStep++;
    }
    
    // Recalculate goal validation skip with CURRENT data (not stale shouldSkipGoalValidation)
    const skipGoalValidation = !data.goalWeight || data.goalWeight === data.currentWeight;
    while (SCREEN_ORDER[nextStep] === 'goal-validation' && skipGoalValidation) {
      nextStep++;
    }
    
    // Skip notifications if no medication was set up
    while (SCREEN_ORDER[nextStep] === 'notifications' && !data.medication?.name) {
      nextStep++;
    }
    
    setCurrentStep(nextStep);
  };

  const handleBack = () => {
    let prevStep = currentStep - 1;
    
    // Skip weight screens going back
    while (SCREEN_ORDER[prevStep] && !hasWeightGoal &&
      ['height-weight', 'goal-weight', 'goal-validation', 'potential'].includes(SCREEN_ORDER[prevStep])) {
      prevStep--;
    }
    
    // Skip goal-validation going back if no meaningful weight difference
    while (SCREEN_ORDER[prevStep] === 'goal-validation' && shouldSkipGoalValidation) {
      prevStep--;
    }
    
    // Skip notifications going back if no medication was set up
    while (SCREEN_ORDER[prevStep] === 'notifications' && !data.medication?.name) {
      prevStep--;
    }
    
    setCurrentStep(Math.max(0, prevStep));
  };

  const handleSignIn = () => {
    navigate('/auth');
  };

  const handleComplete = () => {
    // Clear in-onboarding flag BEFORE completion tracking
    localStorage.removeItem('regimen_in_onboarding');
    console.log('[Onboarding] Cleared in-onboarding flag');
    
    // Track successful onboarding completion
    trackOnboardingComplete();
    // Force light mode for all users completing onboarding
    localStorage.setItem('vite-ui-theme', 'light');
    document.documentElement.classList.remove('dark');
    clearState();
    navigate('/today', { replace: true });
  };

  // Render current screen
  const renderScreen = () => {
    switch (currentScreen) {
      case 'splash':
        return (
          <SplashScreen
            onContinue={handleNext}
            onSignIn={handleSignIn}
          />
        );

      case 'path-selection':
        return (
          <PathSelectionScreen
            onSelect={(pathType: PathType, routing: PathRouting) => {
              updateData({ pathType, pathRouting: routing });
              handleNext();
            }}
          />
        );

      case 'personalization':
        return (
          <PersonalizationScreen
            pathRouting={data.pathRouting}
            onContinue={handleNext}
          />
        );

      case 'goals':
        return (
          <GoalsScreen
            pathRouting={data.pathRouting}
            initialGoals={data.goals}
            onContinue={(goals) => {
              updateData({ goals });
              handleNext();
            }}
          />
        );

      case 'experience':
        return (
          <ExperienceScreen
            initialLevel={data.experienceLevel}
            onSelect={(level: ExperienceLevel) => {
              updateData({ experienceLevel: level });
              handleNext();
            }}
          />
        );

      case 'pain-points':
        return (
          <PainPointsScreen
            pathRouting={data.pathRouting}
            initialPainPoints={data.painPoints}
            onContinue={(painPoints) => {
              updateData({ painPoints });
              handleNext();
            }}
          />
        );

      case 'name':
        return (
          <NameScreen
            initialName={data.firstName}
            onContinue={(firstName) => {
              updateData({ firstName });
              handleNext();
            }}
            onSkip={() => {
              trackOnboardingSkip('name');
              handleNext();
            }}
          />
        );

      case 'height-weight':
        return (
          <HeightWeightScreen
            initialData={{
              heightFeet: data.heightFeet,
              heightInches: data.heightInches,
              heightCm: data.heightCm,
              heightUnit: data.heightUnit,
              currentWeight: data.currentWeight,
              weightUnit: data.weightUnit,
            }}
            onContinue={(heightWeight) => {
              updateData(heightWeight);
              handleNext();
            }}
            onSkip={() => {
              trackOnboardingSkip('height-weight');
              handleNext();
            }}
          />
        );

      case 'goal-weight':
        return (
          <GoalWeightScreen
            currentWeight={data.currentWeight}
            weightUnit={data.weightUnit}
            initialGoalWeight={data.goalWeight}
            onContinue={(goalWeight) => {
              // Update data first, then navigate with fresh data check
              updateData({ goalWeight });
              // Navigate to next step - skip goal-validation if goalWeight equals currentWeight
              let nextStep = currentStep + 1;
              const skipGoalValidation = !goalWeight || goalWeight === data.currentWeight;
              while (SCREEN_ORDER[nextStep] === 'goal-validation' && skipGoalValidation) {
                nextStep++;
              }
              setCurrentStep(nextStep);
            }}
            onSkip={() => {
              trackOnboardingSkip('goal-weight');
              handleNext();
            }}
          />
        );

      case 'goal-validation':
        return (
          <GoalValidationScreen
            currentWeight={data.currentWeight}
            goalWeight={data.goalWeight}
            weightUnit={data.weightUnit}
            firstName={data.firstName}
            onContinue={handleNext}
          />
        );

      case 'potential':
        return (
          <PotentialScreen
            goals={data.goals}
            firstName={data.firstName}
            onContinue={handleNext}
          />
        );

      case 'outcome':
        return (
          <OutcomeScreen
            onContinue={handleNext}
          />
        );

      case 'rating':
        return (
          <RatingScreen
            onComplete={handleNext}
            onSkip={handleNext}
          />
        );

      case 'notifications':
        return (
          <NotificationsScreen
            medicationName={data.medication?.name}
            onEnable={handleNext}
            onSkip={handleNext}
          />
        );

      case 'features':
        return (
          <FeaturesScreen
            pathRouting={data.pathRouting}
            onContinue={handleNext}
          />
        );

      case 'privacy':
        return (
          <PrivacyScreen
            onContinue={handleNext}
          />
        );

      case 'medication-setup':
        return (
          <MedicationSetupScreen
            pathRouting={data.pathRouting}
            initialMedication={data.medication}
            onContinue={(medication) => {
              // Update data first
              updateData({ medication });
              // Navigate directly - medication is set, so don't skip notifications
              let nextStep = currentStep + 1;
              // Skip any non-notifications screens if needed, but NOT notifications
              while (SCREEN_ORDER[nextStep] && 
                !['notifications', 'account-creation', 'loading', 'paywall', 'disclaimer', 'complete'].includes(SCREEN_ORDER[nextStep])) {
                nextStep++;
              }
              setCurrentStep(nextStep);
            }}
            onSkip={() => {
              trackOnboardingSkip('medication-setup');
              handleNext();
            }}
          />
        );

      case 'account-creation':
        return (
          <AccountCreationScreen
            data={data}
            onSuccess={handleNext}
          />
        );

      case 'loading':
        return (
          <LoadingScreen
            medicationName={data.medication?.name}
            firstName={data.firstName}
            onComplete={handleNext}
          />
        );

      case 'disclaimer':
        return (
          <DisclaimerScreen
            onAccept={(accepted) => {
              updateData({ termsAccepted: accepted });
              handleNext();
            }}
          />
        );

      case 'paywall':
        return (
          <OnboardingPaywallScreen
            medicationName={data.medication?.name}
            pathRouting={data.pathRouting}
            promoCode={data.promoCode}
            onSubscribe={handleNext}
            onDismiss={handleNext}
          />
        );

      case 'complete':
        return (
          <CompleteScreen
            firstName={data.firstName}
            medicationName={data.medication?.name}
            onContinue={handleComplete}
          />
        );

      default:
        return null;
    }
  };

  // Determine if we should show the back button and progress bar
  const showBack = currentStep > 0 && currentScreen !== 'splash' && currentScreen !== 'loading' && currentScreen !== 'complete';
  const showProgress = currentScreen !== 'splash' && currentScreen !== 'loading' && currentScreen !== 'complete';

  return (
    <OnboardingLayout
      progress={progress}
      showBack={showBack}
      onBack={handleBack}
      showProgress={showProgress}
    >
      {renderScreen()}
    </OnboardingLayout>
  );
}
