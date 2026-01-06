import { OnboardingButton } from '../OnboardingButton';
import { Star } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

interface RatingScreenProps {
  onComplete: () => void;
  onSkip: () => void;
}

// Testimonials with initials - updated copy
const TESTIMONIALS = [
  {
    initials: 'J.M.',
    color: 'bg-primary',
    text: '"This app has been a game-changer for reaching my goals."',
  },
  {
    initials: 'R.K.',
    color: 'bg-secondary',
    text: '"Finally an app that helps me stay on top of everything."',
  },
  {
    initials: 'S.T.',
    color: 'bg-[#10B981]',
    text: '"I love seeing my progress. It keeps me motivated!"',
  },
];

export function RatingScreen({ onComplete, onSkip }: RatingScreenProps) {
  const handleRate = async () => {
    // On iOS, this would trigger the native rating dialog
    // For now, we'll just proceed
    if (Capacitor.isNativePlatform()) {
      // Could use a native rating plugin here (SKStoreReviewController)
      // For now, just complete
    }
    onComplete();
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Content centered */}
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        {/* Coral Stars */}
        <div 
          className="flex gap-1 mb-6 animate-in zoom-in-50 duration-500"
        >
          {[1, 2, 3, 4, 5].map((_, index) => (
            <Star 
              key={index} 
              className="h-7 w-7 text-primary fill-primary animate-in zoom-in-50 duration-300"
              style={{ 
                animationDelay: `${index * 80}ms`,
                animationFillMode: 'backwards',
              }}
            />
          ))}
        </div>

        {/* Headline */}
        <h1 
          className="text-2xl font-bold text-[#333333] mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
          style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}
        >
          Help others find us
        </h1>

        {/* Testimonials with initials */}
        <div className="space-y-3 w-full max-w-[320px]">
          {TESTIMONIALS.map((testimonial, index) => (
            <div 
              key={index}
              className="bg-white rounded-xl p-4 shadow-sm text-left animate-in fade-in slide-in-from-bottom-4 duration-300"
              style={{ animationDelay: `${300 + index * 100}ms`, animationFillMode: 'backwards' }}
            >
              <div className="flex items-start gap-3">
                {/* Avatar with initials */}
                <div className={`h-10 w-10 rounded-full ${testimonial.color} flex items-center justify-center flex-shrink-0`}>
                  <span className="text-white text-sm font-semibold">{testimonial.initials}</span>
                </div>
                {/* Quote */}
                <div className="flex-1">
                  <div className="flex gap-0.5 mb-1">
                    {[1, 2, 3, 4, 5].map((_, i) => (
                      <Star key={i} className="h-3 w-3 text-primary fill-primary" />
                    ))}
                  </div>
                  <p className="text-sm text-[#666666] italic">{testimonial.text}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Body */}
        <p 
          className="text-[#666666] mt-6 max-w-[300px] animate-in fade-in slide-in-from-bottom-4 duration-500"
          style={{ animationDelay: '600ms', animationFillMode: 'backwards' }}
        >
          We designed Regimen for people like you. Your rating goes a long way!
        </p>
      </div>

      {/* CTAs */}
      <div 
        className="space-y-3 animate-in fade-in duration-500"
        style={{ animationDelay: '700ms', animationFillMode: 'backwards' }}
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
