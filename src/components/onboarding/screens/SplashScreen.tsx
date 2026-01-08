import { useState, useEffect } from 'react';
import { OnboardingButton } from '../OnboardingButton';
import logo from '@/assets/regimen-wordmark-transparent.png';

interface SplashScreenProps {
  onContinue: () => void;
  onSignIn: () => void;
}

export function SplashScreen({ onContinue, onSignIn }: SplashScreenProps) {
  const [showLogo, setShowLogo] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [showCTA, setShowCTA] = useState(false);

  // Start animation sequence on mount with small delay for iOS paint
  useEffect(() => {
    const logoTimer = setTimeout(() => setShowLogo(true), 50);
    return () => clearTimeout(logoTimer);
  }, []);

  // Stagger content reveals after logo animation starts
  useEffect(() => {
    if (!showLogo) return;
    
    const textTimer = setTimeout(() => setShowContent(true), 1000);
    const ctaTimer = setTimeout(() => setShowCTA(true), 1800);

    return () => {
      clearTimeout(textTimer);
      clearTimeout(ctaTimer);
    };
  }, [showLogo]);

  return (
    <div className="flex-1 flex flex-col">
      {/* Content centered vertically */}
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        {/* Logo with pronounced scale + fade animation - appears first */}
        <div 
          className={`will-change-transform ${
            showLogo ? 'animate-logo-entrance' : 'opacity-0 scale-75'
          }`}
        >
          <img 
            src={logo} 
            alt="Regimen" 
            className="h-12 w-auto mb-8"
          />
        </div>

        {/* Headline - fades in after logo */}
        <h1 
          className={`text-3xl font-bold text-foreground mb-3 transition-all duration-500 ${
            showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          Get better results from what you're taking
        </h1>

        {/* Subhead - fades in after headline */}
        <p 
          className={`text-lg text-muted-foreground max-w-[280px] transition-all duration-500 delay-100 ${
            showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          Smart tracking that helps you reach your goals
        </p>
      </div>

      {/* Bottom section - fades in after text has been read */}
      <div 
        className={`space-y-4 transition-all duration-500 ${
          showCTA ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <OnboardingButton onClick={onContinue}>
          Get Started
        </OnboardingButton>

        <button
          onClick={onSignIn}
          className="w-full text-center text-muted-foreground text-sm py-2"
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
