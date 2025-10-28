import { useSubscription } from "@/contexts/SubscriptionContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Crown, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { SubscriptionPaywall } from "../SubscriptionPaywall";

export const SettingsSubscriptionSection = () => {
  const { 
    subscriptionStatus, 
    subscriptionType, 
    subscriptionEndDate, 
    trialEndDate,
    refreshSubscription 
  } = useSubscription();
  const [isRestoring, setIsRestoring] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  const handleManageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('create-portal-session');
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Portal error:', error);
      toast.error('Failed to open subscription management');
    }
  };

  const handleRestorePurchases = async () => {
    setIsRestoring(true);
    try {
      await refreshSubscription();
      toast.success('Subscription status refreshed');
    } catch (error) {
      console.error('Restore error:', error);
      toast.error('Failed to restore purchases');
    } finally {
      setIsRestoring(false);
    }
  };

  const calculateDaysRemaining = (endDate: string | null) => {
    if (!endDate) return 0;
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (subscriptionStatus === 'active') {
    return (
      <div className="space-y-3">
        <h3 className="text-[12px] uppercase font-semibold text-muted-foreground tracking-wide">
          SUBSCRIPTION
        </h3>
        
        <Card className="border-primary/20">
          <CardContent className="p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Crown className="h-4.5 w-4.5 text-primary" />
                <span className="text-[15px] font-semibold">
                  {subscriptionType === 'annual' ? 'Annual' : 'Monthly'} Plan
                </span>
              </div>
              <div className="px-2.5 py-1 bg-primary/10 rounded-full">
                <span className="text-[12px] font-medium text-primary">Active</span>
              </div>
            </div>
            
            <div className="text-[13px] text-muted-foreground space-y-0.5">
              <p>Next billing {formatDate(subscriptionEndDate)}</p>
              <p className="text-[12px]">
                {subscriptionType === 'annual' ? '$39.99/year ($3.33/mo)' : '$4.99/month'}
              </p>
            </div>
            
            <Button
              onClick={handleManageSubscription}
              variant="outline"
              size="sm"
              className="w-full border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground"
            >
              Manage Subscription
            </Button>
          </CardContent>
        </Card>
        
        <button
          onClick={handleRestorePurchases}
          disabled={isRestoring}
          className="text-[13px] text-muted-foreground hover:text-primary underline transition-colors flex items-center gap-1.5"
        >
          {isRestoring && <Loader2 className="h-3 w-3 animate-spin" />}
          Restore Purchases
        </button>
      </div>
    );
  }

  if (subscriptionStatus === 'trialing') {
    const daysRemaining = calculateDaysRemaining(trialEndDate);
    
    return (
      <div className="space-y-3">
        <h3 className="text-[12px] uppercase font-semibold text-muted-foreground tracking-wide">
          SUBSCRIPTION
        </h3>
        
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Crown className="h-4.5 w-4.5 text-primary" />
                <span className="text-[15px] font-semibold">
                  Free Trial
                </span>
              </div>
              <div className="px-2.5 py-1 bg-primary/10 rounded-full">
                <span className="text-[12px] font-medium text-primary">
                  {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} left
                </span>
              </div>
            </div>
            
            <div className="text-[13px] text-muted-foreground space-y-0.5">
              <p>Trial ends {formatDate(trialEndDate)}</p>
              <p className="text-[12px]">
                Then {subscriptionType === 'annual' ? '$39.99/year' : '$4.99/month'}
              </p>
            </div>
            
            <Button
              onClick={handleManageSubscription}
              variant="outline"
              size="sm"
              className="w-full border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground"
            >
              Manage Subscription
            </Button>
          </CardContent>
        </Card>
        
        <button
          onClick={handleManageSubscription}
          className="text-[13px] text-muted-foreground hover:text-destructive underline transition-colors"
        >
          Cancel Trial
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        <h3 className="text-[12px] uppercase font-semibold text-muted-foreground tracking-wide">
          SUBSCRIPTION
        </h3>
        
        <Card className="border-dashed border-muted-foreground/20">
          <CardContent className="p-4 space-y-3.5">
            <div className="flex items-center gap-2.5">
              <Lock className="h-4.5 w-4.5 text-muted-foreground/70" />
              <span className="text-[15px] font-semibold text-muted-foreground">
                Preview Mode
              </span>
            </div>
            
            <div className="text-[13px] text-muted-foreground space-y-2">
              <p className="font-medium">Subscribe to unlock:</p>
              <ul className="space-y-1.5 text-[12px]">
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-primary" />
                  Unlimited compounds
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-primary" />
                  Advanced calculations
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-primary" />
                  Progress tracking
                </li>
              </ul>
            </div>
            
            <Button
              onClick={() => setShowPaywall(true)}
              size="sm"
              className="w-full bg-gradient-to-r from-[#FF6F61] to-[#8B5CF6] hover:opacity-90"
            >
              Start 14-Day Free Trial
            </Button>
          </CardContent>
        </Card>
        
        <button
          onClick={handleRestorePurchases}
          disabled={isRestoring}
          className="text-[13px] text-muted-foreground hover:text-primary underline transition-colors flex items-center gap-1.5"
        >
          {isRestoring && <Loader2 className="h-3 w-3 animate-spin" />}
          Restore Purchases
        </button>
      </div>
      
      <SubscriptionPaywall 
        open={showPaywall}
        onOpenChange={setShowPaywall}
      />
    </>
  );
};
