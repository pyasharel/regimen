import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { OnboardingLayout } from './OnboardingLayout';
import { useOnboardingState, PathType, PathRouting, ExperienceLevel } from './hooks/useOnboardingState';
import { supabase } from '@/integrations/supabase/client';

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

// Screen IDs in order (optimized flow - moved disclaimer after paywall)
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
  'outcome', // 2x graph
  'features', // Show what they get BEFORE rating
  'rating', // After seeing features/value
  'notifications', // Then ask for notifications
  'privacy',
  'medication-setup',
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
    
    return screenId || 'complete';
  };

  const currentScreen = getCurrentScreenId();

  // Handle navigation
  const handleNext = () => {
    let nextStep = currentStep + 1;
    
    // Skip weight screens if needed
    while (SCREEN_ORDER[nextStep] && !hasWeightGoal &&
      ['height-weight', 'goal-weight', 'goal-validation', 'potential'].includes(SCREEN_ORDER[nextStep])) {
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
    
    setCurrentStep(Math.max(0, prevStep));
  };

  const handleSignIn = () => {
    navigate('/auth');
  };

  const handleComplete = () => {
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
            onSkip={handleNext}
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
            onSkip={handleNext}
          />
        );

      case 'goal-weight':
        return (
          <GoalWeightScreen
            currentWeight={data.currentWeight}
            weightUnit={data.weightUnit}
            initialGoalWeight={data.goalWeight}
            onContinue={(goalWeight) => {
              updateData({ goalWeight });
              handleNext();
            }}
            onSkip={handleNext}
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
              updateData({ medication });
              handleNext();
            }}
            onSkip={handleNext}
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
