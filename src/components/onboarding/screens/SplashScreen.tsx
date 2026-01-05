import { OnboardingButton } from '../OnboardingButton';
import logo from '@/assets/logo-regimen-vertical-new.png';

interface SplashScreenProps {
  onContinue: () => void;
  onSignIn: () => void;
}

export function SplashScreen({ onContinue, onSignIn }: SplashScreenProps) {
  return (
    <div className="flex-1 flex flex-col">
      {/* Content centered vertically */}
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        {/* Logo with animation */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <img 
            src={logo} 
            alt="Regimen" 
            className="h-24 w-auto mb-8"
          />
        </div>

        {/* Headline */}
        <h1 
          className="text-3xl font-bold text-[#333333] mb-3 animate-in fade-in slide-in-from-bottom-4 duration-500"
          style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}
        >
          Get better results from what you're taking
        </h1>

        {/* Subhead */}
        <p 
          className="text-lg text-[#666666] max-w-[280px] animate-in fade-in slide-in-from-bottom-4 duration-500"
          style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}
        >
          Smart tracking that helps you reach your goals
        </p>
      </div>

      {/* Bottom section */}
      <div 
        className="space-y-4 animate-in fade-in duration-500"
        style={{ animationDelay: '400ms', animationFillMode: 'backwards' }}
      >
        <OnboardingButton onClick={onContinue}>
          Get Started
        </OnboardingButton>

        <button
          onClick={onSignIn}
          className="w-full text-center text-[#666666] text-sm py-2"
        >
          Already have an account?{' '}
          <span className="text-primary font-medium hover:underline">
            Sign in
          </span>
        </button>
      </div>
    </div>
  );
}
