import { OnboardingButton } from '../OnboardingButton';
import { Star } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

interface RatingScreenProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function RatingScreen({ onComplete, onSkip }: RatingScreenProps) {
  const handleRate = async () => {
    // On iOS, this would trigger the native rating dialog
    // For now, we'll just proceed
    if (Capacitor.isNativePlatform()) {
      // Could use a native rating plugin here
      // For now, just complete
    }
    onComplete();
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Content centered */}
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        {/* Stars */}
        <div 
          className="flex gap-1 mb-6 animate-in zoom-in-50 duration-500"
        >
          {[1, 2, 3, 4, 5].map((_, index) => (
            <Star 
              key={index} 
              className="h-8 w-8 text-yellow-400 fill-yellow-400"
              style={{ 
                animationDelay: `${index * 100}ms`,
              }}
            />
          ))}
        </div>

        {/* Headline */}
        <h1 
          className="text-2xl font-bold text-[#333333] mb-4 animate-in fade-in slide-in-from-bottom-4 duration-500"
          style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}
        >
          Help us grow
        </h1>

        {/* Testimonial */}
        <div 
          className="bg-white rounded-xl p-5 shadow-sm max-w-[300px] mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
          style={{ animationDelay: '300ms', animationFillMode: 'backwards' }}
        >
          <p className="text-[#666666] italic mb-3">
            "This app has been a game-changer for staying consistent."
          </p>
          <p className="text-sm text-[#999999]">— Regimen user</p>
        </div>

        {/* Body */}
        <p 
          className="text-[#666666] max-w-[280px] animate-in fade-in slide-in-from-bottom-4 duration-500"
          style={{ animationDelay: '400ms', animationFillMode: 'backwards' }}
        >
          We're a small team building the best tracking app. A rating goes a long way.
        </p>
      </div>

      {/* CTAs */}
      <div 
        className="space-y-3 animate-in fade-in duration-500"
        style={{ animationDelay: '500ms', animationFillMode: 'backwards' }}
      >
        <OnboardingButton onClick={handleRate}>
          Rate Regimen
        </OnboardingButton>
        
        <button
          onClick={onSkip}
          className="w-full text-center text-[#999999] text-sm py-2 hover:text-[#666666] transition-colors"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
