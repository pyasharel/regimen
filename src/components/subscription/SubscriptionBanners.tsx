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
      <div className="bg-[hsl(var(--warning-light))] border-b border-[hsl(var(--warning))] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="text-[14px] font-medium text-[hsl(var(--warning-foreground))]">
            🎉 Trial: {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining
          </span>
        </div>
        <div className="flex items-center gap-2">
          <a 
            href="/settings" 
            className="text-[14px] text-primary hover:underline font-medium"
          >
            Manage →
          </a>
          <button
            onClick={() => setDismissed('trial')}
            className="text-[hsl(var(--warning-foreground))] hover:opacity-70"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  if (subscriptionStatus === 'past_due' && dismissed !== 'past_due') {
    return (
      <div className="bg-[hsl(var(--destructive-light))] border-b border-[hsl(var(--destructive))] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <span className="text-[14px] font-medium text-destructive">
            ⚠️ Payment failed. Update payment method to continue access.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <a 
            href="/settings" 
            className="text-[14px] text-destructive hover:underline font-medium"
          >
            Fix Now
          </a>
          <button
            onClick={() => setDismissed('past_due')}
            className="text-destructive hover:opacity-70"
          >
            <X className="h-4 w-4" />
          </button>
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
        <div className="bg-[hsl(var(--secondary-light))] border-b border-[hsl(var(--secondary))] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-secondary" />
            <span className="text-[14px] font-medium text-secondary-foreground">
              ℹ️ Subscription ends on {endDate}. Resubscribe to keep access.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a 
              href="/settings" 
              className="text-[14px] text-secondary hover:underline font-medium"
            >
              Resubscribe
            </a>
            <button
              onClick={() => setDismissed('canceled')}
              className="text-secondary-foreground hover:opacity-70"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      );
    }
  }

  return null;
};
