import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Check, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CheckoutSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshSubscription, subscriptionStatus } = useSubscription();
  const [isProcessing, setIsProcessing] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [mounted, setMounted] = useState(false);
  const sessionId = searchParams.get('session_id');

  // Mark as mounted immediately for debugging
  useEffect(() => {
    console.log('[CHECKOUT-SUCCESS] Component mounted');
    setMounted(true);
  }, []);

  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null;
    let pollAttempts = 0;
    const MAX_POLL_ATTEMPTS = 10;
    let hasNavigated = false;

    const handleSuccess = async () => {
      console.log('[CHECKOUT-SUCCESS] Processing successful checkout, session:', sessionId);
      console.log('[CHECKOUT-SUCCESS] Running in system Safari - Universal Links should return user to app');

      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      const hasAuth = !!user;
      setIsAuthenticated(hasAuth);
      console.log('[CHECKOUT-SUCCESS] User authenticated:', hasAuth, user?.email);

      if (hasAuth) {
        // Give Stripe a moment to finalize
        await new Promise(resolve => setTimeout(resolve, 1500));
        await refreshSubscription('checkout_success_init');
        
        // Start polling if subscription isn't active yet (Stripe webhook delay)
        pollInterval = setInterval(async () => {
          if (hasNavigated) return;
          
          pollAttempts++;
          console.log(`[CHECKOUT-SUCCESS] Polling subscription status (attempt ${pollAttempts}/${MAX_POLL_ATTEMPTS})`);
          
          await refreshSubscription('checkout_success_poll');
          
          // Max attempts reached - navigate anyway
          if (pollAttempts >= MAX_POLL_ATTEMPTS) {
            if (pollInterval) clearInterval(pollInterval);
            hasNavigated = true;
            
            toast.success('Subscription activated! Welcome to Regimen Premium.');
            setIsProcessing(false);
            
            setTimeout(() => {
              navigate('/today', { replace: true });
            }, 1000);
          }
        }, 2000);
        
        // Max timeout fallback
        setTimeout(() => {
          if (pollInterval && !hasNavigated) {
            clearInterval(pollInterval);
            hasNavigated = true;
            setIsProcessing(false);
            toast.success('Subscription activated! Welcome to Regimen Premium.');
            navigate('/today', { replace: true });
          }
        }, 25000);
      } else {
        // Not authenticated - show open app button
        setIsProcessing(false);
      }
    };

    handleSuccess();

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [sessionId, refreshSubscription, navigate]);

  // Auto-navigate when subscription becomes active
  useEffect(() => {
    if (isAuthenticated && (subscriptionStatus === 'active' || subscriptionStatus === 'trialing')) {
      console.log('[CHECKOUT-SUCCESS] Subscription confirmed active, navigating...');
      setIsProcessing(false);
      toast.success('Subscription activated! Welcome to Regimen Premium.');
      navigate('/today', { replace: true });
    }
  }, [subscriptionStatus, isAuthenticated, navigate]);

  // If opened in Safari without auth, show "Open App" button
  const showOpenAppButton = isAuthenticated === false && !isProcessing;

  // Try to open the native app via custom URL scheme
  const handleOpenApp = () => {
    const deepLink = `regimen://checkout/success${sessionId ? `?session_id=${sessionId}` : ''}`;
    console.log('[CHECKOUT-SUCCESS] Attempting deep link:', deepLink);
    window.location.href = deepLink;
    
    // Fallback message
    setTimeout(() => {
      toast.info('If the app didn\'t open, please open Regimen manually.');
    }, 2000);
  };

  // Always render something visible immediately
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/95 flex items-center justify-center p-6">
      <div className="text-center space-y-6 max-w-sm">
        {/* Debug info for troubleshooting */}
        {!mounted && (
          <p className="text-xs text-muted-foreground">Loading...</p>
        )}
        
        <div className="mx-auto w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center animate-in fade-in duration-300">
          {isProcessing ? (
            <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
          ) : (
            <Check className="w-10 h-10 text-emerald-500" />
          )}
        </div>

        <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <h1 className="text-2xl font-bold text-foreground">
            {isProcessing ? 'Processing Payment...' : 'Payment Successful!'}
          </h1>
          <p className="text-muted-foreground">
            {isProcessing 
              ? 'Activating your subscription...'
              : 'Your subscription is now active!'
            }
          </p>
        </div>

        {/* Show "Return to Regimen" button for everyone */}
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
          <Button 
            onClick={handleOpenApp}
            className="w-full"
            size="lg"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Return to Regimen
          </Button>
          <p className="text-xs text-muted-foreground">
            Tap above to return to the app
          </p>
        </div>
      </div>
    </div>
  );
};

export default CheckoutSuccess;
