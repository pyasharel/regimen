import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { OnboardingLayout } from './OnboardingLayout';
import { useOnboardingState, PathType, PathRouting, ExperienceLevel } from './hooks/useOnboardingState';

// Screen imports
import { SplashScreen } from './screens/SplashScreen';
import { PathSelectionScreen } from './screens/PathSelectionScreen';
import { PersonalizationScreen } from './screens/PersonalizationScreen';
import { GoalsScreen } from './screens/GoalsScreen';
import { ExperienceScreen } from './screens/ExperienceScreen';
import { PainPointsScreen } from './screens/PainPointsScreen';
import { HeightWeightScreen } from './screens/HeightWeightScreen';
import { GoalWeightScreen } from './screens/GoalWeightScreen';
import { GoalValidationScreen } from './screens/GoalValidationScreen';
import { PotentialScreen } from './screens/PotentialScreen';
import { LongTermResultsScreen } from './screens/LongTermResultsScreen';
import { OutcomeScreen } from './screens/OutcomeScreen';
import { FeaturesScreen } from './screens/FeaturesScreen';
import { MedicationSetupScreen } from './screens/MedicationSetupScreen';
import { PrivacyScreen } from './screens/PrivacyScreen';
import { NameScreen } from './screens/NameScreen';
import { AccountCreationScreen } from './screens/AccountCreationScreen';
import { LoadingScreen } from './screens/LoadingScreen';
import { DisclaimerScreen } from './screens/DisclaimerScreen';
import { RatingScreen } from './screens/RatingScreen';
import { OnboardingPaywallScreen } from './screens/OnboardingPaywallScreen';
import { NotificationsScreen } from './screens/NotificationsScreen';
import { CompleteScreen } from './screens/CompleteScreen';

// Screen IDs in order
const SCREEN_ORDER = [
  'splash',
  'path-selection',
  'personalization',
  'goals',
  'experience',
  'pain-points',
  'height-weight',
  'goal-weight',
  'goal-validation',
  'potential',
  'long-term-results',
  'outcome',
  'features',
  'medication-setup',
  'privacy',
  'name',
  'account-creation',
  'loading',
  'disclaimer',
  'rating',
  'paywall',
  'notifications',
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
    goToNext,
    goToPrevious,
    setCurrentStep,
    clearState,
  } = useOnboardingState();

  // Force light mode during onboarding
  useEffect(() => {
    const savedTheme = localStorage.getItem('vite-ui-theme');
    document.documentElement.classList.remove('dark');
    
    return () => {
      // Restore theme on unmount
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
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
          />
        );

      case 'goal-validation':
        return (
          <GoalValidationScreen
            currentWeight={data.currentWeight}
            goalWeight={data.goalWeight}
            weightUnit={data.weightUnit}
            onContinue={handleNext}
          />
        );

      case 'potential':
        return (
          <PotentialScreen
            currentWeight={data.currentWeight}
            goalWeight={data.goalWeight}
            weightUnit={data.weightUnit}
            onContinue={handleNext}
          />
        );

      case 'long-term-results':
        return (
          <LongTermResultsScreen
            onContinue={handleNext}
          />
        );

      case 'outcome':
        return (
          <OutcomeScreen
            onContinue={handleNext}
          />
        );

      case 'features':
        return (
          <FeaturesScreen
            pathRouting={data.pathRouting}
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

      case 'privacy':
        return (
          <PrivacyScreen
            onContinue={handleNext}
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

      case 'rating':
        return (
          <RatingScreen
            onComplete={handleNext}
            onSkip={handleNext}
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

      case 'notifications':
        return (
          <NotificationsScreen
            onEnable={handleComplete}
            onSkip={handleComplete}
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
