import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Check, Sparkles } from "lucide-react";
import { toast } from "sonner";

const GOAL_OPTIONS = [
  "Weight Loss",
  "Muscle Gain",
  "Longevity",
  "Athletic Performance",
  "Energy & Recovery",
  "Skin Improvement",
  "Fertility",
  "Other"
];

const CHALLENGE_OPTIONS = [
  "Missing doses",
  "Tracking multiple compounds",
  "Understanding timing",
  "Measuring progress"
];

export const Onboarding = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [selectedChallenges, setSelectedChallenges] = useState<string[]>([]);
  const navigate = useNavigate();

  const toggleGoal = (goal: string) => {
    setSelectedGoals(prev =>
      prev.includes(goal)
        ? prev.filter(g => g !== goal)
        : [...prev, goal]
    );
  };

  const toggleChallenge = (challenge: string) => {
    setSelectedChallenges(prev =>
      prev.includes(challenge)
        ? prev.filter(c => c !== challenge)
        : [...prev, challenge]
    );
  };

  const handleNext = async () => {
    if (currentStep === 0) {
      // Splash screen - just move to next step
      setCurrentStep(1);
    } else if (currentStep === 1) {
      if (selectedGoals.length === 0) {
        toast.error("Please select at least one goal");
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (selectedChallenges.length === 0) {
        toast.error("Please select at least one challenge");
        return;
      }
      await completeOnboarding();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeOnboarding = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        await supabase
          .from("profiles")
          .update({ 
            onboarding_completed: true,
            goals: selectedGoals,
            challenges: selectedChallenges
          })
          .eq("user_id", user.id);
      }
      
      navigate('/today');
    } catch (error) {
      console.error("Error completing onboarding:", error);
      toast.error("Failed to save preferences");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        {currentStep > 0 && (
          <button
            onClick={handleBack}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Back
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-12">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          
          {/* Step 0: Welcome Splash */}
          {currentStep === 0 && (
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-secondary shadow-lg shadow-primary/20">
                <Sparkles className="h-12 w-12 text-white" />
              </div>
              
              <div className="space-y-3">
                <h1 className="text-4xl font-bold">Welcome to Regimen</h1>
                <p className="text-lg text-muted-foreground max-w-sm">
                  Track everything, reach your goals. Take the guesswork out of dosing, timing, and cycles.
                </p>
              </div>
            </div>
          )}

          {/* Step 1: Goals */}
          {currentStep === 1 && (
            <>
              <div className="space-y-2 text-center">
                <h1 className="text-3xl font-bold">What are your goals?</h1>
                <p className="text-muted-foreground">Select all that apply</p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {GOAL_OPTIONS.map((goal) => (
                  <button
                    key={goal}
                    onClick={() => toggleGoal(goal)}
                    className={`
                      relative flex items-center justify-center gap-2 rounded-xl p-4 text-sm font-medium transition-all
                      ${selectedGoals.includes(goal)
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                        : "bg-muted/50 text-foreground hover:bg-muted"
                      }
                    `}
                  >
                    {selectedGoals.includes(goal) && (
                      <Check className="h-4 w-4" />
                    )}
                    {goal}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Step 2: Challenges */}
          {currentStep === 2 && (
            <>
              <div className="space-y-2 text-center">
                <h1 className="text-3xl font-bold">What are your challenges?</h1>
                <p className="text-muted-foreground">Select all that apply</p>
              </div>
              
              <div className="space-y-3">
                {CHALLENGE_OPTIONS.map((challenge) => (
                  <button
                    key={challenge}
                    onClick={() => toggleChallenge(challenge)}
                    className={`
                      relative flex items-center gap-3 rounded-xl p-4 text-left font-medium transition-all
                      ${selectedChallenges.includes(challenge)
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                        : "bg-muted/50 text-foreground hover:bg-muted"
                      }
                    `}
                  >
                    {selectedChallenges.includes(challenge) && (
                      <Check className="h-5 w-5 flex-shrink-0" />
                    )}
                    <span className={selectedChallenges.includes(challenge) ? "" : "ml-8"}>
                      {challenge}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom section */}
      <div className="px-6 pb-8">
        <div className="w-full max-w-md mx-auto space-y-6">
          {/* Progress dots */}
          <div className="flex justify-center gap-2">
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all ${
                  index === currentStep ? "w-8 bg-primary" : "w-2 bg-muted"
                }`}
              />
            ))}
          </div>

          {/* Next button */}
          <Button onClick={handleNext} className="w-full" size="lg">
            {currentStep === 2 ? "Get Started" : "Next"}
          </Button>
        </div>
      </div>
    </div>
  );
};
