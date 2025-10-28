import { useEffect, useState } from 'react';
import { SubscriptionPaywall } from '@/components/SubscriptionPaywall';

interface PreviewModeTimerProps {
  onTimerStart: () => void;
}

export const PreviewModeTimer = ({ onTimerStart }: PreviewModeTimerProps) => {
  const [showPaywall, setShowPaywall] = useState(false);
  const [timerStarted, setTimerStarted] = useState(false);

  useEffect(() => {
    if (timerStarted) return;

    setTimerStarted(true);
    onTimerStart();

    const timer = setTimeout(() => {
      setShowPaywall(true);
    }, 2 * 60 * 1000);

    return () => clearTimeout(timer);
  }, [timerStarted, onTimerStart]);

  return (
    <SubscriptionPaywall 
      open={showPaywall}
      onOpenChange={setShowPaywall}
      message="You've tried the app! Subscribe to unlock all features."
    />
  );
};
