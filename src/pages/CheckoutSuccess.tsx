import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Check, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CheckoutSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshSubscription } = useSubscription();
  const [isProcessing, setIsProcessing] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    const handleSuccess = async () => {
      console.log('[CHECKOUT-SUCCESS] Processing successful checkout, session:', sessionId);

      // Check if user is authenticated (will be true in native app, false in Safari)
      const { data: { user } } = await supabase.auth.getUser();
      const hasAuth = !!user;
      setIsAuthenticated(hasAuth);
      console.log('[CHECKOUT-SUCCESS] User authenticated:', hasAuth);

      // If we're in the native app context, close browser
      if (Capacitor.isNativePlatform()) {
        try {
          await Browser.close();
        } catch (e) {
          console.log('[CHECKOUT-SUCCESS] Browser.close not needed or failed:', e);
        }
      }

      // Only try to refresh subscription if authenticated
      if (hasAuth) {
        // Give Stripe a moment to finalize
        await new Promise(resolve => setTimeout(resolve, 1500));
        await refreshSubscription();
        toast.success('Subscription activated! Welcome to Regimen Pro.');
        
        // Navigate to today screen
        setTimeout(() => {
          navigate('/today', { replace: true });
        }, 1000);
      }
      
      setIsProcessing(false);
    };

    handleSuccess();
  }, [sessionId, refreshSubscription, navigate]);

  // If opened in Safari without auth, show "Open App" button
  const showOpenAppButton = isAuthenticated === false && !isProcessing;

  // Try to open the native app via custom URL scheme
  const handleOpenApp = () => {
    // This will attempt to open the app via custom URL scheme
    window.location.href = 'regimen://checkout/success';
    
    // Fallback: if app doesn't open after 2 seconds, show message
    setTimeout(() => {
      toast.info('If the app didn\'t open, please open Regimen manually.');
    }, 2000);
  };

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
            {isProcessing ? 'Processing Payment...' : 'Payment Successful!'}
          </h1>
          <p className="text-muted-foreground">
            {isProcessing 
              ? 'Please wait while we activate your subscription...'
              : isAuthenticated 
                ? 'Your subscription is now active. Enjoy all premium features!'
                : 'Your payment was successful! Return to the app to start using your subscription.'
            }
          </p>
        </div>

        {/* Authenticated in-app: show return button */}
        {isAuthenticated && !isProcessing && (
          <Button 
            onClick={() => navigate('/today', { replace: true })}
            className="w-full"
            size="lg"
          >
            Return to App
          </Button>
        )}

        {/* Not authenticated (Safari): show open app button */}
        {showOpenAppButton && (
          <div className="space-y-3">
            <Button 
              onClick={handleOpenApp}
              className="w-full"
              size="lg"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open Regimen App
            </Button>
            <p className="text-xs text-muted-foreground">
              If the app doesn't open automatically, please open Regimen from your home screen.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CheckoutSuccess;
