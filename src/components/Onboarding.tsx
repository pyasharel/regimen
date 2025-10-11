import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
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
  const [selectedChallenge, setSelectedChallenge] = useState<string>("");
  const navigate = useNavigate();

  const toggleGoal = (goal: string) => {
    setSelectedGoals(prev =>
      prev.includes(goal)
        ? prev.filter(g => g !== goal)
        : [...prev, goal]
    );
  };

  const handleNext = async () => {
    if (currentStep === 0) {
      if (selectedGoals.length === 0) {
        toast.error("Please select at least one goal");
        return;
      }
      setCurrentStep(1);
    } else if (currentStep === 1) {
      if (!selectedChallenge) {
        toast.error("Please select your biggest challenge");
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
            biggest_challenge: selectedChallenge
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
          {/* Question 1: Goals */}
          {currentStep === 0 && (
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

          {/* Question 2: Biggest Challenge */}
          {currentStep === 1 && (
            <>
              <div className="space-y-2 text-center">
                <h1 className="text-3xl font-bold">What's your biggest challenge?</h1>
                <p className="text-muted-foreground">Choose one</p>
              </div>
              
              <div className="space-y-3">
                {CHALLENGE_OPTIONS.map((challenge) => (
                  <button
                    key={challenge}
                    onClick={() => setSelectedChallenge(challenge)}
                    className={`
                      w-full rounded-xl p-4 text-left font-medium transition-all
                      ${selectedChallenge === challenge
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                        : "bg-muted/50 text-foreground hover:bg-muted"
                      }
                    `}
                  >
                    {challenge}
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
            {[0, 1].map((index) => (
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
            {currentStep === 1 ? "Get Started" : "Next"}
          </Button>
        </div>
      </div>
    </div>
  );
};
