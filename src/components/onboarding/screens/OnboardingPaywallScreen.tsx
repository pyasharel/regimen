import { useState } from 'react';
import { OnboardingButton } from '../OnboardingButton';
import { PathRouting } from '../hooks/useOnboardingState';
import { Check, X } from 'lucide-react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

interface OnboardingPaywallScreenProps {
  medicationName?: string;
  pathRouting: PathRouting | null;
  promoCode: string | null;
  onSubscribe: () => void;
  onDismiss: () => void;
}


export function OnboardingPaywallScreen({ 
  medicationName, 
  pathRouting,
  promoCode: initialPromoCode,
  onSubscribe, 
  onDismiss 
}: OnboardingPaywallScreenProps) {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('annual');
  const [showPromo, setShowPromo] = useState(false);
  const [promoCode, setPromoCode] = useState(initialPromoCode || '');
  const [loading, setLoading] = useState(false);
  const [applyingPromo, setApplyingPromo] = useState(false);
  
  const handleApplyPromo = async () => {
    const code = promoCode.toUpperCase();
    if (!code) return;
    
    setApplyingPromo(true);
    
    try {
      // First validate the code against the backend (checks both beta codes and Stripe codes)
      const { data: validateData, error: validateError } = await supabase.functions.invoke('validate-promo-code', {
        body: { code }
      });
      
      if (validateError) {
        toast.error(`Failed to validate promo code: ${validateError.message || 'Unknown error'}`);
        return;
      }
      
      if (!validateData?.valid) {
        toast.error('Invalid promo code. Please check and try again.');
        return;
      }
      
      // If it's a backend beta code, activate it directly
      if (validateData.isBackendCode) {
        const { data, error } = await supabase.functions.invoke('activate-beta-access', {
          body: { code }
        });
        
        if (error) {
          toast.error(`Failed to activate promo code: ${error.message || 'Unknown error'}`);
          return;
        }
        
        if (data?.valid) {
          if (data.alreadyActive) {
            toast.success('Promo access already active!');
          } else if (data.activated) {
            const endDate = new Date(data.endDate);
            const now = new Date();
            const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            toast.success(`Promo activated! Enjoy ${daysRemaining} days free - no credit card required.`);
          }
          // Close paywall and proceed
          onSubscribe();
        } else {
          toast.error(data?.message || 'Invalid promo code. Please check and try again.');
        }
      } else {
        // For Stripe promo codes, just proceed - they'll be applied at checkout
        toast.success('Promo code will be applied at checkout');
        setShowPromo(false);
      }
    } catch (error: any) {
      toast.error(`Error: ${error.message || 'Failed to validate promo code'}`);
    } finally {
      setApplyingPromo(false);
    }
  };
  
  const { offerings, purchasePackage, isNativePlatform, subscriptionStatus } = useSubscription();
  
  // If already subscribed, skip paywall
  const isAlreadySubscribed = subscriptionStatus === 'active' || subscriptionStatus === 'trialing';
  
  // Auto-advance if already subscribed
  if (isAlreadySubscribed) {
    // Schedule immediate advance to avoid render loop
    setTimeout(() => onSubscribe(), 0);
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-[#333333] mb-2">You're all set!</h1>
          <p className="text-[#666666]">Your subscription is already active</p>
        </div>
      </div>
    );
  }
  
  const headline = medicationName 
    ? `Your ${medicationName} schedule is ready`
    : "You're ready to start tracking";

  const openCheckoutUrl = async (url: string) => {
    if (Capacitor.isNativePlatform()) {
      await Browser.open({ url });
      return;
    }

    // Stripe Checkout can't render inside an iframe (like the Lovable preview).
    const isEmbedded = (() => {
      try {
        return window.self !== window.top;
      } catch {
        return true;
      }
    })();

    if (isEmbedded) {
      const w = window.open(url, '_blank', 'noopener,noreferrer');
      if (!w) window.location.href = url;
      return;
    }

    window.location.href = url;
  };

  const handleStartTrial = async () => {
    setLoading(true);

    try {
      if (isNativePlatform && offerings) {
        // Use RevenueCat for native
        const availablePackage = selectedPlan === 'annual'
          ? offerings.current?.annual
          : offerings.current?.monthly;

        if (availablePackage) {
          await purchasePackage(availablePackage);
          onSubscribe();
        }
      } else {
        // Use Stripe for web
        const { data, error } = await supabase.functions.invoke('create-checkout', {
          body: {
            // Backend expects `plan`; keep `priceType` for backward compatibility
            plan: selectedPlan,
            priceType: selectedPlan,
            promoCode: promoCode || undefined,
            platform: Capacitor.isNativePlatform() ? 'native' : 'web',
          },
        });

        if (error) throw error;
        if (!data?.url) throw new Error('Checkout unavailable');

        await openCheckoutUrl(data.url);
      }
    } catch (error: any) {
      console.error('[Paywall] Error:', error);
      toast.error(error.message || 'Failed to start subscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col -mx-6 -mb-8">
      {/* Close button - more subtle */}
      <button
        onClick={onDismiss}
        className="absolute top-4 right-4 p-2 text-[#CCCCCC] hover:text-[#999999] transition-colors z-10"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-6 pb-4">
        {/* Headline */}
        <div className="text-center pt-8 pb-6">
          <h1 className="text-2xl font-bold text-[#333333] mb-2">
            {headline}
          </h1>
          <p className="text-xl font-semibold text-primary">
            Try Regimen free for 14 days
          </p>
        </div>

        {/* Vertical Timeline - Cal AI style */}
        <div className="mb-6 pl-4">
          {/* Today */}
          <div className="flex items-start gap-3 relative">
            <div className="flex flex-col items-center">
              <div className="h-3 w-3 rounded-full bg-primary" />
              <div className="w-0.5 h-12 bg-[#E5E5E5]" />
            </div>
            <div className="-mt-0.5">
              <p className="text-sm font-semibold text-[#333333]">TODAY</p>
              <p className="text-xs text-[#666666]">Unlock all features</p>
            </div>
          </div>
          
          {/* In 13 Days */}
          <div className="flex items-start gap-3 relative">
            <div className="flex flex-col items-center">
              <div className="h-3 w-3 rounded-full bg-[#E5E5E5]" />
              <div className="w-0.5 h-12 bg-[#E5E5E5]" />
            </div>
            <div className="-mt-0.5">
              <p className="text-sm font-semibold text-[#333333]">IN 13 DAYS</p>
              <p className="text-xs text-[#666666]">Trial ending reminder</p>
            </div>
          </div>
          
          {/* In 14 Days */}
          <div className="flex items-start gap-3">
            <div className="h-3 w-3 rounded-full bg-[#E5E5E5]" />
            <div className="-mt-0.5">
              <p className="text-sm font-semibold text-[#333333]">IN 14 DAYS</p>
              <p className="text-xs text-[#666666]">First charge. Cancel anytime.</p>
            </div>
          </div>
        </div>

        {/* Side-by-side plan selection - Monthly first, Annual with best value */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Monthly */}
          <button
            onClick={() => setSelectedPlan('monthly')}
            className={`p-4 rounded-xl border-2 transition-all text-center ${
              selectedPlan === 'monthly'
                ? 'border-primary bg-primary/5'
                : 'border-[#E5E5E5] bg-white'
            }`}
          >
            <div>
              <span className="font-semibold text-[#333333]">Monthly</span>
              <p className="text-lg font-bold text-[#333333] mt-1">$4.99</p>
              <p className="text-xs text-[#666666]">per month</p>
            </div>
            
            {/* Selection indicator */}
            <div className={`mt-3 h-5 w-5 mx-auto rounded-full border-2 flex items-center justify-center ${
              selectedPlan === 'monthly' ? 'border-primary bg-primary' : 'border-[#CCCCCC]'
            }`}>
              {selectedPlan === 'monthly' && (
                <Check className="h-3 w-3 text-white" />
              )}
            </div>
          </button>

          {/* Annual */}
          <button
            onClick={() => setSelectedPlan('annual')}
            className={`relative p-4 rounded-xl border-2 transition-all text-center ${
              selectedPlan === 'annual'
                ? 'border-primary bg-primary/5'
                : 'border-[#E5E5E5] bg-white'
            }`}
          >
            {/* Best value badge */}
            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
              <span className="text-xs bg-primary text-white px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                BEST VALUE
              </span>
            </div>
            
            <div className="mt-2">
              <span className="font-semibold text-[#333333]">Annual</span>
              <p className="text-lg font-bold text-[#333333] mt-1">$39.99</p>
              <p className="text-xs text-[#666666]">$3.33/mo</p>
            </div>
            
            {/* Selection indicator */}
            <div className={`mt-3 h-5 w-5 mx-auto rounded-full border-2 flex items-center justify-center ${
              selectedPlan === 'annual' ? 'border-primary bg-primary' : 'border-[#CCCCCC]'
            }`}>
              {selectedPlan === 'annual' && (
                <Check className="h-3 w-3 text-white" />
              )}
            </div>
          </button>
        </div>
        {/* Promo code - cleaner design */}
        <div className="mb-2">
          {!showPromo ? (
            <button
              onClick={() => setShowPromo(true)}
              className="text-sm text-[#999999] hover:text-[#666666] transition-colors"
            >
              Have a promo code?
            </button>
          ) : (
            <div className="bg-white rounded-xl p-4 border border-[#E5E5E5]">
              <label className="text-sm font-medium text-[#666666] mb-2 block">Promo Code</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="Enter code"
                  className="flex-1 h-10 px-4 rounded-lg bg-[#F5F5F5] border-0 text-sm text-[#333333] placeholder:text-[#999999] focus:ring-2 focus:ring-primary focus:outline-none"
                />
                <button
                  onClick={handleApplyPromo}
                  disabled={!promoCode || applyingPromo}
                  className="px-4 h-10 rounded-lg bg-primary text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {applyingPromo ? '...' : 'Apply'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fixed bottom CTA */}
      <div className="px-6 pb-7 pt-3 bg-gradient-to-t from-[#FAF8F5] via-[#FAF8F5] to-transparent">
        <OnboardingButton onClick={handleStartTrial} loading={loading}>
          Start My 14-Day Free Trial
        </OnboardingButton>

        <p className="text-xs text-center text-[#666666] mt-3">
          14 days free, then ${selectedPlan === 'annual' ? '39.99/year' : '4.99/month'}
        </p>

        <p className="text-[10px] text-center text-[#999999] mt-3 leading-relaxed">
          By starting your trial, you agree to our <a href="/terms" className="underline">Terms of Service</a> and <a href="/privacy" className="underline">Privacy Policy</a>. Subscription automatically renews unless canceled at least 24 hours before the end of the current period. Manage or cancel anytime in Settings.
        </p>
        
        <div className="flex items-center justify-center gap-2 mt-3">
          <a href="/terms" className="text-xs text-[#999999] hover:text-[#666666]">Terms</a>
          <span className="text-[#CCCCCC]">·</span>
          <a href="/privacy" className="text-xs text-[#999999] hover:text-[#666666]">Privacy</a>
          <span className="text-[#CCCCCC]">·</span>
          <button className="text-xs text-[#999999] hover:text-[#666666]">Restore</button>
        </div>
      </div>
    </div>
  );
}
