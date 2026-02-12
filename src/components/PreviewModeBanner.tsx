import { X } from 'lucide-react';
import { useState, useEffect } from 'react';

interface PreviewModeBannerProps {
  onUpgrade: () => void;
  onDismiss?: () => void;
  compoundCount?: number;
  freeCompoundName?: string;
}

const BENEFIT_MESSAGES = [
  'Track multiple compounds with reminders',
  'Unlock progress photos & medication levels',
  'Add more compounds to your stack',
];

export const PreviewModeBanner = ({ onUpgrade, onDismiss, compoundCount, freeCompoundName }: PreviewModeBannerProps) => {
  const [benefitIndex, setBenefitIndex] = useState(0);

  // Rotate benefit messages every 5 seconds (only for single-compound users)
  useEffect(() => {
    if (compoundCount && compoundCount > 1) return; // Don't rotate for multi-compound
    const interval = setInterval(() => {
      setBenefitIndex(prev => (prev + 1) % BENEFIT_MESSAGES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [compoundCount]);

  const handleSubscribeClick = () => {
    onUpgrade?.();
  };

  // Determine subtitle based on compound count
  const getSubtitle = () => {
    if (compoundCount && compoundCount > 1 && freeCompoundName) {
      return (
        <>
          Reminders for {freeCompoundName} only —{' '}
          <button
            onClick={handleSubscribeClick}
            className="text-secondary hover:text-secondary/90 font-medium transition-colors"
          >
            Subscribe
          </button>{' '}
          for all {compoundCount}
        </>
      );
    }
    return (
      <>
        <button
          onClick={handleSubscribeClick}
          className="text-secondary hover:text-secondary/90 font-medium transition-colors"
        >
          Subscribe
        </button>{' '}
        — {BENEFIT_MESSAGES[benefitIndex]}
      </>
    );
  };

  return (
    <div className="safe-top">
      <div className="bg-background border-b border-border/60 px-4 py-2">
        <div className="flex items-center justify-between gap-4 max-w-4xl mx-auto w-full">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0 w-1 h-8 bg-secondary rounded-full" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-foreground/90">Free Plan</p>
              <p className="text-[12px] text-muted-foreground truncate">
                {getSubtitle()}
              </p>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="flex-shrink-0 w-6 h-6 rounded-md hover:bg-muted/80 flex items-center justify-center transition-colors text-muted-foreground/50 hover:text-muted-foreground"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
