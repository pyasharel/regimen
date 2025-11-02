import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CheckCircle, Loader2 } from 'lucide-react';

export default function PromoSetup() {
  const [isLoading, setIsLoading] = useState(false);
  const [isCreated, setIsCreated] = useState(false);

  const createPromoCode = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-promo-code', {
        body: {
          code: 'BETA3',
          couponId: 'GOOh4O9c' // Beta Tester - 3 Months Free coupon
        }
      });

      if (error) {
        console.error('Error creating promo code:', error);
        toast.error(`Failed: ${error.message}`);
        return;
      }

      console.log('Promo code created:', data);
      setIsCreated(true);
      toast.success(data.message || 'Promo code created successfully!');
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Setup BETA3 Promo Code</h1>
          <p className="text-sm text-muted-foreground">
            Click the button below to create the BETA3 promo code in your Stripe account.
            This only needs to be done once.
          </p>
        </div>

        <div className="space-y-4">
          <div className="text-sm space-y-2">
            <p><strong>Promo Code:</strong> BETA3</p>
            <p><strong>Discount:</strong> 3 months free</p>
            <p><strong>Coupon ID:</strong> GOOh4O9c</p>
          </div>

          {isCreated ? (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Promo code is ready!</span>
            </div>
          ) : (
            <Button 
              onClick={createPromoCode}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create BETA3 Promo Code'
              )}
            </Button>
          )}
        </div>

        <div className="text-xs text-muted-foreground">
          <p>
            Note: If you see an error about authorization, you'll need to create this manually in your{' '}
            <a 
              href="https://dashboard.stripe.com/test/coupons" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Stripe Dashboard
            </a>
            {' '}by creating a Promotion Code linked to the "Beta Tester - 3 Months Free" coupon.
          </p>
        </div>
      </Card>
    </div>
  );
}
