import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { toast } from 'sonner';
import { Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CheckoutSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshSubscription } = useSubscription();
  const [isProcessing, setIsProcessing] = useState(true);
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    const handleSuccess = async () => {
      console.log('[CHECKOUT-SUCCESS] Processing successful checkout, session:', sessionId);

      // If we're in the native app's webview, close browser and refresh
      if (Capacitor.isNativePlatform()) {
        try {
          await Browser.close();
        } catch (e) {
          console.log('[CHECKOUT-SUCCESS] Browser.close not needed or failed:', e);
        }
      }

      // Give Stripe a moment to finalize
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Refresh subscription status
      await refreshSubscription();
      
      toast.success('Subscription activated! Welcome to Regimen Pro.');
      setIsProcessing(false);

      // Navigate to today screen
      setTimeout(() => {
        navigate('/today', { replace: true });
      }, 1000);
    };

    handleSuccess();
  }, [sessionId, refreshSubscription, navigate]);

  // If opened in Safari (not in-app browser), show return button
  const showReturnButton = !Capacitor.isNativePlatform() || !isProcessing;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center space-y-6 max-w-sm">
        <div className="mx-auto w-20 h-20 rounded-full bg-success/20 flex items-center justify-center">
          {isProcessing ? (
            <Loader2 className="w-10 h-10 text-success animate-spin" />
          ) : (
            <Check className="w-10 h-10 text-success" />
          )}
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            {isProcessing ? 'Activating Subscription...' : 'Payment Successful!'}
          </h1>
          <p className="text-muted-foreground">
            {isProcessing 
              ? 'Please wait while we set up your account...'
              : 'Your subscription is now active. Enjoy all premium features!'
            }
          </p>
        </div>

        {showReturnButton && !isProcessing && (
          <Button 
            onClick={() => navigate('/today', { replace: true })}
            className="w-full"
            size="lg"
          >
            Return to App
          </Button>
        )}
      </div>
    </div>
  );
};

export default CheckoutSuccess;
