import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Input } from "@/components/ui/input";
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { trackPaywallShown, trackPaywallDismissed, trackSubscriptionStarted } from '@/utils/analytics';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { usePaywall } from '@/contexts/PaywallContext';

interface SubscriptionPaywallProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDismiss?: () => void;
  message?: string;
}

export const SubscriptionPaywall = ({ 
  open, 
  onOpenChange,
  onDismiss,
  message 
}: SubscriptionPaywallProps) => {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('annual');
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{code: string, discount: string} | null>(null);
  const [showPromoInput, setShowPromoInput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { refreshSubscription, offerings, purchasePackage, restorePurchases, isNativePlatform } = useSubscription();
  const { setPaywallOpen } = usePaywall();
  
  // Track when paywall opens and sync with PaywallContext
  useEffect(() => {
    // Sync paywall open state to context so banner knows to hide
    setPaywallOpen(open);
    
    if (open) {
      console.log('[PAYWALL] Component opened/mounted');
      trackPaywallShown(message || 'add_compound');
      console.log('[PAYWALL] Supabase client check:', {
        hasSupabase: typeof supabase !== 'undefined',
        hasFunctions: typeof supabase?.functions !== 'undefined',
        canInvoke: typeof supabase?.functions?.invoke === 'function'
      });
    }
  }, [open, message, setPaywallOpen]);

  // Backend promo codes - these are validated by activate-beta-access function
  const BACKEND_PROMO_CODES = ['BETATESTER', 'REDDIT30', 'FREEMONTH', 'PEPTIDE30', 'REGIMEN30'];

  const handleApplyPromo = async () => {
    const code = promoCode.toUpperCase();
    
    console.log('[PROMO] ========== APPLY PROMO STARTED ==========');
    console.log('[PROMO] Code:', code);
    
    setIsLoading(true);
    
    try {
      // Check if it's one of our backend promo codes
      if (BACKEND_PROMO_CODES.includes(code)) {
        console.log('[PROMO] Backend promo code detected, activating access...');
        
        const { data, error } = await supabase.functions.invoke('activate-beta-access', {
          body: { code }
        });

        console.log('[PROMO] Activation response:', JSON.stringify({ data, error }, null, 2));

        if (error) {
          console.error('[PROMO] Activation ERROR:', error);
          toast.error(`Failed to activate promo code: ${error.message || 'Unknown error'}`);
          return;
        }

        if (data?.valid) {
          if (data.alreadyActive) {
            toast.success('Promo access already active!');
          } else if (data.activated) {
            // Calculate days for message
            const endDate = new Date(data.endDate);
            const now = new Date();
            const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            toast.success(`Promo activated! Enjoy ${daysRemaining} days free - no credit card required.`);
          }
          // Close the modal and refresh subscription
          onOpenChange(false);
          window.location.reload(); // Refresh to update subscription status
          return;
        } else if (!data?.valid) {
          toast.error(data?.message || 'Invalid promo code. Please check and try again.');
          return;
        }
      }

      // Otherwise try Stripe promo code
      console.log('[PROMO] Calling validate-promo-code function...');
      
      const { data, error } = await supabase.functions.invoke('validate-promo-code', {
        body: { code }
      });

      console.log('[PROMO] Response received:', JSON.stringify({ data, error }, null, 2));

      if (error) {
        console.error('[PROMO] ERROR:', error);
        toast.error(`Failed to validate promo code: ${error.message || 'Unknown error'}`);
        return;
      }
      
      if (data?.valid) {
        const discountText = data.type === 'free' 
          ? `FREE for ${data.duration} months!`
          : `${data.discount}% off first year!`;
        setAppliedPromo({ code, discount: discountText });
        setShowPromoInput(false);
        
        // Auto-switch plan based on promo code compatibility
        if (data.planType === 'monthly') {
          setSelectedPlan('monthly');
          console.log('[PROMO] Auto-switched to monthly plan (code only works with monthly)');
          toast.success(`Promo code applied: ${discountText} - Switched to monthly plan`);
        } else if (data.planType === 'annual') {
          setSelectedPlan('annual');
          console.log('[PROMO] Auto-switched to annual plan (code only works with annual)');
          toast.success(`Promo code applied: ${discountText} - Switched to annual plan`);
        } else {
          toast.success(`Promo code applied: ${discountText}`);
        }
        
        console.log('[PROMO] SUCCESS! Applied:', discountText);
      } else {
        console.log('[PROMO] Invalid code');
        toast.error('Invalid promo code. Please check and try again.');
      }
    } catch (error: any) {
      console.error('[PROMO] EXCEPTION:', error);
      toast.error(`Error: ${error.message || 'Failed to validate promo code'}`);
    } finally {
      setIsLoading(false);
      console.log('[PROMO] ========== END ==========');
    }
  };

  const handleStartTrial = async () => {
    console.log('[PAYWALL] ========== START TRIAL CLICKED ==========');
    console.log('[PAYWALL] Current state:', { 
      selectedPlan, 
      appliedPromo: appliedPromo?.code,
      isLoading,
      isNativePlatform,
      hasOfferings: !!offerings
    });
    
    if (isLoading) {
      console.log('[PAYWALL] Already loading, ignoring click');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // ==================== NATIVE IAP (RevenueCat) ====================
      if (isNativePlatform) {
        console.log('[PAYWALL] Native platform - using RevenueCat');
        
        if (!offerings?.current?.availablePackages) {
          console.error('[PAYWALL] No offerings available');
          toast.error('Unable to load subscription options. Please try again.');
          setIsLoading(false);
          return;
        }

        // Find the right package based on selected plan
        const packages = offerings.current.availablePackages;
        console.log('[PAYWALL] Available packages:', packages.map(p => ({ 
          id: p.identifier, 
          product: p.product.identifier 
        })));

        // RevenueCat package identifiers: $rc_monthly, $rc_annual
        const packageId = selectedPlan === 'monthly' ? '$rc_monthly' : '$rc_annual';
        const selectedPackage = packages.find(p => p.identifier === packageId);

        if (!selectedPackage) {
          console.error('[PAYWALL] Package not found:', packageId);
          toast.error(`${selectedPlan} plan not available. Please try the other option.`);
          setIsLoading(false);
          return;
        }

        console.log('[PAYWALL] Purchasing package:', selectedPackage.identifier);
        trackSubscriptionStarted(selectedPlan);

        const result = await purchasePackage(selectedPackage);

        if (result.success) {
          console.log('[PAYWALL] Purchase successful! State already updated by purchasePackage');
          toast.success('Welcome to Regimen Premium! 🎉');
          onOpenChange(false);
          // purchasePackage already updated the subscription state synchronously - no need to refresh
          // This prevents race conditions where refresh could overwrite the correct state
        } else if (result.cancelled) {
          console.log('[PAYWALL] Purchase cancelled by user');
          // Don't show error for user cancellation
        } else {
          console.error('[PAYWALL] Purchase failed:', result.error);
          toast.error(result.error || 'Purchase failed. Please try again.');
        }
        
        setIsLoading(false);
        return;
      }

      // ==================== WEB (Stripe Checkout) ====================
      console.log('[PAYWALL] Web platform - using Stripe checkout');
      console.log('[PAYWALL] About to invoke create-checkout...');
      console.log('[PAYWALL] Request body:', { 
        plan: selectedPlan,
        promoCode: appliedPromo?.code,
        platform: 'web',
      });
      
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { 
          plan: selectedPlan,
          promoCode: appliedPromo?.code,
          platform: 'web',
        }
      });

      console.log('[PAYWALL] Response received:', JSON.stringify({ data, error }, null, 2));

      if (error) {
        console.error('[PAYWALL] ERROR:', error);
        toast.error(`Checkout failed: ${error.message || 'Unknown error'}`);
        return;
      }
      
      if (data?.url) {
        console.log('[PAYWALL] SUCCESS! Opening URL:', data.url);
        trackSubscriptionStarted(selectedPlan);
        
        // Web: Open in new tab
        console.log('[PAYWALL] Web platform, opening in new tab');
        window.open(data.url, '_blank');
        toast.success('Complete checkout in the new tab, then return here');
      } else {
        console.error('[PAYWALL] No URL in response');
        toast.error('Checkout failed - no URL received');
      }
    } catch (error: any) {
      console.error('[PAYWALL] EXCEPTION:', error);
      console.error('[PAYWALL] Exception details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      toast.error(`Error: ${error.message || 'Checkout failed'}`);
    } finally {
      setIsLoading(false);
      console.log('[PAYWALL] ========== END ==========');
    }
  };

  const handleClose = () => {
    trackPaywallDismissed(message || 'add_compound');
    onOpenChange(false);
    onDismiss?.();
  };

  const getButtonText = () => {
    if (appliedPromo) {
      return `Start Free Access`;
    }
    return "Start My 14-Day Free Trial";
  };

  const getPriceText = () => {
    if (appliedPromo) {
      // For applied promo codes, show the discount
      return appliedPromo.discount;
    }
    return selectedPlan === 'annual'
      ? "14 days free, then $39.99/year ($3.33/month)"
      : "14 days free, then $4.99/month";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="safe-top px-4 pb-6 max-w-md max-h-[90vh] overflow-y-auto bg-transparent border-none shadow-none p-0"
        hideClose
      >
        <div className="mt-3 bg-background border border-border rounded-2xl shadow-[var(--shadow-elevated)] overflow-hidden">
          {/* Header */}
          <div className="relative p-6 pb-4">
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <X size={24} />
            </button>
            
            <h1 className="text-center text-[28px] font-bold text-[#1A1A1A] dark:text-white mt-6">
              Start your 14-day FREE trial
            </h1>
          </div>

          <div className="px-6 space-y-8 pb-6">
            {/* Timeline */}
            <div className="space-y-6 relative pl-10">
              <div className="absolute left-[11px] top-[24px] bottom-[24px] w-[2px] bg-border" />
              
              <div className="relative">
                <div className="absolute -left-10 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-[16px] text-foreground">TODAY</h3>
                  <p className="text-[14px] text-muted-foreground mt-1">
                    Unlock all features like compound tracking, dose calculations & reminders
                  </p>
                </div>
              </div>

              <div className="relative">
                <div className="absolute -left-10 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-[16px] text-foreground">IN 13 DAYS</h3>
                  <p className="text-[14px] text-muted-foreground mt-1">
                    We'll send a reminder that your trial is ending soon
                  </p>
                </div>
              </div>

              <div className="relative">
                <div className="absolute -left-10 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-[16px] text-foreground">IN 14 DAYS - BILLING STARTS</h3>
                  <p className="text-[14px] text-muted-foreground mt-1">
                    You'll be charged {selectedPlan === 'annual' ? '$39.99/year' : '$4.99/month'}. Cancel anytime.
                  </p>
                </div>
              </div>
            </div>

            {/* Pricing Cards */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setSelectedPlan('monthly')}
                className={`p-4 rounded-xl border-2 transition-all min-h-[180px] flex flex-col ${
                  selectedPlan === 'monthly'
                    ? 'border-primary bg-primary/5 shadow-lg'
                    : 'border-border bg-card'
                }`}
              >
                <div className="flex-1 space-y-2">
                  <p className="text-[14px] text-muted-foreground">Monthly</p>
                  <p className="text-[24px] font-bold text-foreground">$4.99/mo</p>
                  <p className="text-[12px] text-muted-foreground">Billed monthly</p>
                </div>
                <div className="flex justify-center">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedPlan === 'monthly' ? 'border-primary' : 'border-border'
                  }`}>
                    {selectedPlan === 'monthly' && (
                      <div className="w-3 h-3 rounded-full bg-primary" />
                    )}
                  </div>
                </div>
              </button>

              <button
                onClick={() => setSelectedPlan('annual')}
                className={`p-4 rounded-xl border-2 transition-all min-h-[180px] flex flex-col relative ${
                  selectedPlan === 'annual'
                    ? 'border-primary bg-primary/5 shadow-lg'
                    : 'border-border bg-card'
                }`}
              >
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-primary rounded-full text-primary-foreground text-[11px] font-semibold whitespace-nowrap">
                  BEST VALUE
                </div>
                <div className="flex-1 space-y-2 mt-2">
                  <p className="text-[14px] text-muted-foreground">Annual</p>
                  <p className="text-[24px] font-bold text-foreground">$39.99/yr</p>
                  <p className="text-[16px] font-medium text-primary">$3.33/mo</p>
                  <p className="text-[14px] font-medium text-[#8B5CF6]">Save 33%</p>
                </div>
                <div className="flex justify-center">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedPlan === 'annual' ? 'border-primary' : 'border-border'
                  }`}>
                    {selectedPlan === 'annual' && (
                      <div className="w-3 h-3 rounded-full bg-primary" />
                    )}
                  </div>
                </div>
              </button>
            </div>

            {/* No Payment Due */}
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6]" />
              <span className="text-[16px]">No Payment Due Now</span>
            </div>

            {/* Promo Code */}
            <div className="space-y-2">
              {!showPromoInput ? (
                <button
                  onClick={() => setShowPromoInput(true)}
                  className="text-[14px] text-[#4A4A4A] dark:text-gray-300 underline hover:text-[#FF6F61]"
                >
                  Have a promo code?
                </button>
              ) : (
                <div className="space-y-2">
                  <Input
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="Enter code"
                    className="uppercase"
                  />
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleApplyPromo} 
                      size="sm" 
                      className="bg-[#FF6F61] hover:bg-[#E55A50]"
                      disabled={isLoading || !promoCode.trim()}
                    >
                      {isLoading ? 'Applying...' : 'Apply Code'}
                    </Button>
                    <Button onClick={() => setShowPromoInput(false)} variant="ghost" size="sm" disabled={isLoading}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
              {appliedPromo && (
                <div className="bg-[#8B5CF6]/10 rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6]" />
                    <span className="text-[14px] text-[#8B5CF6] font-medium">
                      Code {appliedPromo.code} applied - {appliedPromo.discount}
                    </span>
                  </div>
                  <button
                    onClick={() => setAppliedPromo(null)}
                    className="text-[12px] text-[#8B5CF6] underline hover:no-underline"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            {/* CTA Button */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={(e) => {
                  console.log('[PAYWALL] ===== RAW BUTTON CLICKED =====');
                  e.preventDefault();
                  e.stopPropagation();
                  handleStartTrial();
                }}
                disabled={isLoading}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-[16px] font-semibold py-4 h-auto rounded-xl transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Processing...' : getButtonText()}
              </button>
              
              <p className="text-center text-[14px] text-[#8A8A8A]">
                {getPriceText()}
              </p>

              <p className="text-center text-[10px] text-[#8A8A8A] leading-relaxed">
                By starting your trial, you agree to our Terms of Service and Privacy Policy. 
                Subscription automatically renews unless canceled at least 24 hours before the end of the current period. 
                Manage or cancel anytime in Settings.
              </p>

              <div className="text-center text-[12px] text-[#8A8A8A]">
                <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline cursor-pointer hover:text-[#FF6F61]">Terms</a>
                {' • '}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline cursor-pointer hover:text-[#FF6F61]">Privacy</a>
                {isNativePlatform && (
                  <>
                    {' • '}
                    <button 
                      onClick={async () => {
                        setIsLoading(true);
                        try {
                          const result = await restorePurchases();
                          if (result.isPro) {
                            toast.success('Subscription restored successfully!');
                            onOpenChange(false);
                          } else if (result.success) {
                            toast.info('No active subscription found to restore');
                          } else {
                            toast.error(result.error || 'Failed to restore purchases');
                          }
                        } catch (error) {
                          toast.error('Failed to restore purchases');
                        } finally {
                          setIsLoading(false);
                        }
                      }} 
                      disabled={isLoading}
                      className="underline cursor-pointer hover:text-[#FF6F61]"
                    >
                      Restore
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
