import { useEffect, useState } from 'react';
import splashLogo from '@/assets/splash-logo.png';

export const AnimatedSplash = ({ onComplete }: { onComplete: () => void }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Hide after 2.5 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      // Wait for fade out animation before calling onComplete
      setTimeout(onComplete, 300);
    }, 2500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="animate-bounce-subtle">
        <img
          src={splashLogo}
          alt="Regimen"
          className="w-64 h-auto"
        />
      </div>
    </div>
  );
};
