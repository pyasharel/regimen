import { useEffect, useState } from 'react';
import { SubscriptionPaywall } from '@/components/SubscriptionPaywall';

interface PreviewModeTimerProps {
  onTimerStart: () => void;
  onPaywallDismiss?: () => void;
}

export const PreviewModeTimer = ({ onTimerStart, onPaywallDismiss }: PreviewModeTimerProps) => {
  const [showPaywall, setShowPaywall] = useState(false);
  const [timerStarted, setTimerStarted] = useState(false);

  useEffect(() => {
    if (timerStarted) return;

    console.log('[PreviewTimer] 🕐 Starting 2-minute countdown...');
    setTimerStarted(true);
    onTimerStart();

    const timer = setTimeout(() => {
      console.log('[PreviewTimer] ⏰ 2 minutes elapsed - showing paywall');
      setShowPaywall(true);
    }, 2 * 60 * 1000); // 2 minutes

    return () => {
      console.log('[PreviewTimer] Cleanup timer');
      clearTimeout(timer);
    };
  }, [timerStarted, onTimerStart]);

  return (
    <SubscriptionPaywall 
      open={showPaywall}
      onOpenChange={(open) => {
        setShowPaywall(open);
        if (!open && onPaywallDismiss) {
          onPaywallDismiss();
        }
      }}
      message="You've explored the app for 2 minutes! Subscribe to continue using all features."
    />
  );
};
