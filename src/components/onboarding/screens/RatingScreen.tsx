import { useState } from 'react';
import { OnboardingButton } from '../OnboardingButton';
import { Star, Loader2 } from 'lucide-react';
import { requestRating } from '@/utils/ratingHelper';
import { toast } from 'sonner';

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
  const [isRequesting, setIsRequesting] = useState(false);

  const handleRate = async () => {
    console.log('[RatingScreen] handleRate called');
    setIsRequesting(true);
    
    try {
      const result = await requestRating('onboarding');
      
      console.log('[RatingScreen] Rating result:', result);
      
      // Show feedback if we fell back to store
      if (result.method === 'store_fallback') {
        toast.success('Opening store page...', {
          description: 'Leave us a review to help others discover Regimen!',
          duration: 3000,
        });
      } else if (result.method === 'not_available' && result.reason === 'web_platform') {
        toast.info('Rating is available in the mobile app');
      }
    } catch (error) {
      console.error('[RatingScreen] Rating error:', error);
    }
    
    setIsRequesting(false);
    onComplete();
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Content positioned higher with better spacing */}
      <div className="pt-[6vh] flex flex-col items-center text-center">
        {/* Coral Stars */}
        <div 
          className="flex gap-1 mb-4 animate-in zoom-in-50 duration-500"
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
          className="text-2xl font-bold text-[#333333] mb-4 animate-in fade-in slide-in-from-bottom-4 duration-500"
          style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}
        >
          Help spread the word
        </h1>

        {/* Testimonials with initials */}
        <div className="space-y-2.5 w-full max-w-[340px]">
          {TESTIMONIALS.map((testimonial, index) => (
            <div 
              key={index}
              className="bg-white rounded-xl p-3.5 shadow-sm text-left animate-in fade-in slide-in-from-bottom-4 duration-300"
              style={{ animationDelay: `${300 + index * 100}ms`, animationFillMode: 'backwards' }}
            >
              <div className="flex items-start gap-3">
                {/* Avatar with initials */}
                <div className={`h-9 w-9 rounded-full ${testimonial.color} flex items-center justify-center flex-shrink-0`}>
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
          className="text-[#666666] mt-4 max-w-[300px] animate-in fade-in slide-in-from-bottom-4 duration-500"
          style={{ animationDelay: '600ms', animationFillMode: 'backwards' }}
        >
          We designed Regimen for people like you. Your rating goes a long way!
        </p>
      </div>

      {/* CTAs */}
      <div className="mt-auto space-y-3">
        <OnboardingButton onClick={handleRate} disabled={isRequesting}>
          {isRequesting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Requesting...
            </>
          ) : (
            'Rate Regimen'
          )}
        </OnboardingButton>
        
        <button
          onClick={onSkip}
          disabled={isRequesting}
          className="w-full text-center text-[#999999] text-sm py-2 hover:text-[#666666] transition-colors disabled:opacity-50"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
