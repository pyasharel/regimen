import { useState, useEffect } from 'react';
import { OnboardingButton } from '../OnboardingButton';
import logo from '@/assets/regimen-wordmark-transparent.png';

interface SplashScreenProps {
  onContinue: () => void;
  onSignIn: () => void;
}

export function SplashScreen({ onContinue, onSignIn }: SplashScreenProps) {
  const [showContent, setShowContent] = useState(false);

  // Stagger the content reveal after logo animation completes
  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex-1 flex flex-col">
      {/* Content centered vertically */}
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        {/* Logo with pronounced scale + fade animation - appears first */}
        <div 
          className="animate-in fade-in duration-1000 ease-out"
          style={{ 
            animationFillMode: 'backwards',
            animation: 'logo-entrance 1s ease-out forwards'
          }}
        >
          <img 
            src={logo} 
            alt="Regimen" 
            className="h-12 w-auto mb-8"
          />
        </div>

        {/* Headline - fades in after logo */}
        <h1 
          className={`text-3xl font-bold text-[#333333] mb-3 transition-all duration-500 ${
            showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          Get better results from what you're taking
        </h1>

        {/* Subhead - fades in after headline */}
        <p 
          className={`text-lg text-[#666666] max-w-[280px] transition-all duration-500 delay-100 ${
            showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          Smart tracking that helps you reach your goals
        </p>
      </div>

      {/* Bottom section - fades in last */}
      <div 
        className={`space-y-4 transition-all duration-500 delay-200 ${
          showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
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