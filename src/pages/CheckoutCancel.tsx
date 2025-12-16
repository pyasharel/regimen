import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const CheckoutCancel = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCancel = async () => {
      console.log('[CHECKOUT-CANCEL] Checkout was cancelled');

      // If we're in the native app's webview, close browser
      if (Capacitor.isNativePlatform()) {
        try {
          await Browser.close();
        } catch (e) {
          console.log('[CHECKOUT-CANCEL] Browser.close not needed or failed:', e);
        }
      }

      toast.info('Checkout cancelled. You can try again anytime.');
    };

    handleCancel();
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center space-y-6 max-w-sm">
        <div className="mx-auto w-20 h-20 rounded-full bg-muted flex items-center justify-center">
          <X className="w-10 h-10 text-muted-foreground" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            Checkout Cancelled
          </h1>
          <p className="text-muted-foreground">
            No worries! You can continue using the free features or subscribe anytime from Settings.
          </p>
        </div>

        <div className="space-y-3">
          <Button 
            onClick={() => navigate('/today', { replace: true })}
            className="w-full"
            size="lg"
          >
            Return to App
          </Button>
          <Button 
            onClick={() => navigate('/settings', { replace: true })}
            variant="outline"
            className="w-full"
            size="lg"
          >
            Go to Settings
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CheckoutCancel;
