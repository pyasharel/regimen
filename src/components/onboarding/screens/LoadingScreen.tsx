import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';

interface LoadingScreenProps {
  medicationName?: string;
  firstName?: string;
  onComplete: () => void;
}

export function LoadingScreen({ medicationName, firstName, onComplete }: LoadingScreenProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = medicationName
    ? [
        'Analyzing your goals...',
        `Configuring your ${medicationName}...`,
        'Setting up your schedule...',
        'Your dashboard is ready!',
      ]
    : [
        'Analyzing your goals...',
        'Preparing your dashboard...',
        "You're all set!",
      ];

  const headline = firstName 
    ? `Setting up your Regimen, ${firstName}...`
    : 'Setting up your Regimen...';

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    // Slower timing - 1.2s per step for more premium feel
    steps.forEach((_, index) => {
      const timer = setTimeout(() => {
        setCurrentStep(index + 1);
      }, (index + 1) * 1200);
      timers.push(timer);
    });

    // Complete after all steps with a small delay
    const completeTimer = setTimeout(() => {
      onComplete();
    }, steps.length * 1200 + 800);
    timers.push(completeTimer);

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [steps.length, onComplete]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center">
      {/* Headline */}
      <h1 className="text-2xl font-bold text-[#333333] mb-8 animate-in fade-in duration-500">
        {headline}
      </h1>

      {/* Animated checklist */}
      <div className="w-full max-w-[300px] space-y-4">
        {steps.map((step, index) => {
          const isComplete = currentStep > index;
          const isCurrent = currentStep === index;

          return (
            <div
              key={step}
              className={`flex items-center gap-3 transition-opacity duration-300 ${
                currentStep >= index ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {/* Checkmark or spinner */}
              <div 
                className={`h-7 w-7 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isComplete 
                    ? 'bg-primary' 
                    : 'bg-[#E5E5E5]'
                }`}
              >
                {isComplete ? (
                  <Check className="h-4 w-4 text-white animate-in zoom-in-50 duration-200" />
                ) : isCurrent ? (
                  <div className="h-3 w-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : null}
              </div>

              {/* Text */}
              <span 
                className={`text-base transition-colors duration-300 ${
                  isComplete ? 'text-[#333333] font-medium' : 'text-[#999999]'
                }`}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress ring - thicker stroke, segmented look */}
      <div className="mt-12">
        <svg className="w-20 h-20" viewBox="0 0 80 80">
          {/* Background circle */}
          <circle
            cx="40"
            cy="40"
            r="34"
            fill="none"
            stroke="#E5E5E5"
            strokeWidth="6"
          />
          {/* Progress circle */}
          <circle
            cx="40"
            cy="40"
            r="34"
            fill="none"
            stroke="hsl(6 100% 69%)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 34}
            strokeDashoffset={2 * Math.PI * 34 * (1 - currentStep / steps.length)}
            transform="rotate(-90 40 40)"
            className="transition-all duration-700 ease-out"
          />
        </svg>
      </div>
    </div>
  );
}
