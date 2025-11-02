import { useState } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Input } from "@/components/ui/input";

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

  const promoCodes: Record<string, {duration: number, type: 'free' | 'discount', value: number}> = {
    'BETA3': { duration: 3, type: 'free', value: 100 },
  };

  const handleApplyPromo = async () => {
    const code = promoCode.toUpperCase();
    
    try {
      const { data, error } = await supabase.functions.invoke('validate-promo-code', {
        body: { code }
      });

      if (error) {
        console.error('Promo validation error:', error);
        toast.error('Failed to validate promo code');
        return;
      }
      
      if (data?.valid) {
        const discountText = data.type === 'free' 
          ? `FREE for ${data.duration} months!`
          : `${data.discount}% off first year!`;
        setAppliedPromo({ code, discount: discountText });
        setShowPromoInput(false);
        toast.success(`Promo code applied: ${discountText}`);
      } else {
        toast.error('Invalid promo code');
      }
    } catch (error) {
      console.error('Promo validation error:', error);
      toast.error('Failed to validate promo code');
    }
  };

  const handleStartTrial = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { 
          plan: selectedPlan,
          promoCode: appliedPromo?.code 
        }
      });

      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to start checkout');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    onDismiss?.();
  };

  const getButtonText = () => {
    if (appliedPromo) {
      const promo = promoCodes[appliedPromo.code];
      if (promo.type === 'free') {
        return `Start Free Trial (${promo.duration} Months Free)`;
      }
      return `Start Trial (${promo.value}% Off)`;
    }
    return "Start My 14-Day Free Trial";
  };

  const getPriceText = () => {
    if (appliedPromo) {
      const promo = promoCodes[appliedPromo.code];
      if (promo.type === 'free') {
        return selectedPlan === 'annual' 
          ? `FREE for ${promo.duration} months, then $39.99/year`
          : `FREE for ${promo.duration} months, then $4.99/month`;
      }
      return selectedPlan === 'annual'
        ? `$20 for first year, then $39.99/year`
        : `$2.50/month for 12 months, then $4.99/month`;
    }
    return selectedPlan === 'annual'
      ? "14 days free, then $39.99/year ($3.33/month)"
      : "14 days free, then $4.99/month";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-0" hideClose>
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

        <div className="px-6 space-y-8">
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
                  <Button onClick={handleApplyPromo} size="sm" className="bg-[#FF6F61] hover:bg-[#E55A50]">
                    Apply Code
                  </Button>
                  <Button onClick={() => setShowPromoInput(false)} variant="ghost" size="sm">
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
          <div className="space-y-3 pb-6">
            <Button
              onClick={handleStartTrial}
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-[16px] font-semibold py-4 h-auto rounded-xl"
            >
              {getButtonText()}
            </Button>
            
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
              {' • '}
              <button onClick={() => toast.info('Restore purchases feature coming soon')} className="underline cursor-pointer hover:text-[#FF6F61]">Restore</button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
