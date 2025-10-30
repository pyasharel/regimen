import { useSubscription } from "@/contexts/SubscriptionContext";
import { X, AlertCircle, Info, Sparkles } from "lucide-react";
import { useState } from "react";

export const SubscriptionBanners = () => {
  const { subscriptionStatus, trialEndDate, subscriptionEndDate } = useSubscription();
  const [dismissed, setDismissed] = useState<string | null>(null);

  const calculateDaysRemaining = (endDate: string | null) => {
    if (!endDate) return 0;
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  if (subscriptionStatus === 'trialing' && trialEndDate && dismissed !== 'trial') {
    const daysRemaining = calculateDaysRemaining(trialEndDate);
    
    return (
      <div className="bg-primary/5 border-b border-primary/20 px-4 py-3">
        <div className="flex items-center justify-between gap-3 max-w-4xl mx-auto">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex-shrink-0 w-1.5 h-8 bg-primary rounded-full" />
            <div className="flex-1">
              <p className="text-[13px] font-medium text-foreground">
                Free Trial Active
              </p>
              <p className="text-[12px] text-muted-foreground">
                {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a 
              href="/settings" 
              className="text-[13px] text-primary hover:text-primary/80 font-medium transition-colors"
            >
              Manage
            </a>
            <button
              onClick={() => setDismissed('trial')}
              className="w-6 h-6 rounded-md hover:bg-muted/80 flex items-center justify-center transition-colors text-muted-foreground/50 hover:text-muted-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (subscriptionStatus === 'past_due' && dismissed !== 'past_due') {
    return (
      <div className="bg-destructive/5 border-b border-destructive/20 px-4 py-3">
        <div className="flex items-center justify-between gap-3 max-w-4xl mx-auto">
          <div className="flex items-center gap-3 flex-1">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
            <div className="flex-1">
              <p className="text-[13px] font-medium text-destructive">
                Payment Failed
              </p>
              <p className="text-[12px] text-destructive/80">
                Update payment method to continue access
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a 
              href="/settings" 
              className="text-[13px] text-destructive hover:text-destructive/80 font-medium transition-colors"
            >
              Fix Now
            </a>
            <button
              onClick={() => setDismissed('past_due')}
              className="w-6 h-6 rounded-md hover:bg-destructive/10 flex items-center justify-center transition-colors text-destructive"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (subscriptionStatus === 'canceled' && subscriptionEndDate && dismissed !== 'canceled') {
    const daysRemaining = calculateDaysRemaining(subscriptionEndDate);
    
    if (daysRemaining > 0) {
      const endDate = new Date(subscriptionEndDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      
      return (
        <div className="bg-muted/30 border-b border-border px-4 py-3">
          <div className="flex items-center justify-between gap-3 max-w-4xl mx-auto">
            <div className="flex items-center gap-3 flex-1">
              <Info className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1">
                <p className="text-[13px] font-medium text-foreground">
                  Subscription Ending
                </p>
                <p className="text-[12px] text-muted-foreground">
                  Access until {endDate}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a 
                href="/settings" 
                className="text-[13px] text-primary hover:text-primary/80 font-medium transition-colors"
              >
                Resubscribe
              </a>
              <button
                onClick={() => setDismissed('canceled')}
                className="w-6 h-6 rounded-md hover:bg-muted/80 flex items-center justify-center transition-colors text-muted-foreground/50 hover:text-muted-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  return null;
};
