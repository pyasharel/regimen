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
        
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              <span className="text-[16px] font-bold">
                {subscriptionType === 'annual' ? 'Annual' : 'Monthly'} Plan
              </span>
            </div>
            
            <div className="text-[14px] text-muted-foreground space-y-1">
              <p>Next billing: {formatDate(subscriptionEndDate)}</p>
              <p className="text-xs">
                {subscriptionType === 'annual' ? '$39.99/year ($3.33/month)' : '$4.99/month'}
              </p>
            </div>
            
            <Button
              onClick={handleManageSubscription}
              variant="outline"
              className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            >
              Manage Subscription
            </Button>
          </CardContent>
        </Card>
        
        <button
          onClick={handleRestorePurchases}
          disabled={isRestoring}
          className="text-[14px] text-muted-foreground underline hover:text-primary flex items-center gap-2"
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
        
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[24px]">🎉</span>
              <span className="text-[16px] font-bold">
                Free Trial Active
              </span>
            </div>
            
            <div className="text-[20px] font-bold text-primary">
              {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining
            </div>
            
            <div className="text-[14px] text-muted-foreground">
              <p>You'll be charged {subscriptionType === 'annual' ? '$39.99' : '$4.99'} on</p>
              <p>{formatDate(trialEndDate)}</p>
            </div>
            
            <Button
              onClick={handleManageSubscription}
              variant="outline"
              className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            >
              Manage Subscription
            </Button>
          </CardContent>
        </Card>
        
        <button
          onClick={handleManageSubscription}
          className="text-[14px] text-destructive underline hover:opacity-70"
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
        
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-muted-foreground" />
              <span className="text-[16px] font-semibold text-muted-foreground">
                Not Subscribed
              </span>
            </div>
            
            <div className="text-[14px] text-muted-foreground space-y-2">
              <p>Subscribe to unlock:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Unlimited compounds</li>
                <li>Dose calculations</li>
                <li>Progress tracking</li>
              </ul>
            </div>
            
            <Button
              onClick={() => setShowPaywall(true)}
              className="w-full bg-primary hover:bg-primary/90"
            >
              Start 14-Day Free Trial
            </Button>
          </CardContent>
        </Card>
        
        <button
          onClick={handleRestorePurchases}
          disabled={isRestoring}
          className="text-[14px] text-muted-foreground underline hover:text-primary flex items-center gap-2"
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
