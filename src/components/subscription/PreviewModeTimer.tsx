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

    console.log('[PreviewTimer] Starting 2-minute countdown...');
    setTimerStarted(true);
    onTimerStart();

    const timer = setTimeout(() => {
      console.log('[PreviewTimer] ⏰ 2 minutes elapsed - showing paywall');
      setShowPaywall(true);
    }, 2 * 60 * 1000);

    return () => {
      console.log('[PreviewTimer] Cleanup');
      clearTimeout(timer);
    };
  }, [timerStarted, onTimerStart]);

  return (
    <SubscriptionPaywall 
      open={showPaywall}
      onOpenChange={setShowPaywall}
      message="You've tried the app! Subscribe to unlock all features."
    />
  );
};
