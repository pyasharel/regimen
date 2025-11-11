import { useSubscription } from "@/contexts/SubscriptionContext";
import { X, AlertCircle, Info } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PreviewModeBanner } from "@/components/PreviewModeBanner";
import { useLocation } from "react-router-dom";

interface SubscriptionBannersProps {
  subscriptionStatus: string;
  onUpgrade: () => void;
}

export const SubscriptionBanners = ({ subscriptionStatus, onUpgrade }: SubscriptionBannersProps) => {
  // CRITICAL: All hooks must be called BEFORE any conditional returns
  const location = useLocation();
  const { trialEndDate, subscriptionEndDate } = useSubscription();
  const [dismissed, setDismissed] = useState<string | null>(() => {
    return sessionStorage.getItem('dismissedBanner');
  });

  useEffect(() => {
    if (dismissed) {
      sessionStorage.setItem('dismissedBanner', dismissed);
    } else {
      sessionStorage.removeItem('dismissedBanner');
    }
  }, [dismissed]);

  // Don't show any banners on auth, onboarding, or landing pages
  const hideOnRoutes = ['/', '/auth', '/landing', '/onboarding'];
  if (hideOnRoutes.includes(location.pathname)) {
    return null;
  }

  const calculateDaysRemaining = (endDate: string | null) => {
    if (!endDate) return 0;
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  // Trial banner removed - users can see trial status in settings for cleaner UX

  if (subscriptionStatus === 'past_due' && dismissed !== 'past_due') {
    const handleFixNow = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          window.location.href = '/settings';
          return;
        }

        const { data, error } = await supabase.functions.invoke('create-portal-session', {
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        });
        if (error) throw error;
        if (data?.url) {
          window.location.href = data.url;
        }
      } catch (error) {
        console.error('Portal error:', error);
        window.location.href = '/settings';
      }
    };

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
            <button 
              onClick={handleFixNow}
              className="text-[13px] text-destructive hover:text-destructive/80 font-medium transition-colors"
            >
              Fix Now
            </button>
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

      const handleResubscribe = async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            window.location.href = '/settings';
            return;
          }

          const { data, error } = await supabase.functions.invoke('create-portal-session', {
            headers: {
              Authorization: `Bearer ${session.access_token}`
            }
          });
          if (error) throw error;
          if (data?.url) {
            window.location.href = data.url;
          }
        } catch (error) {
          console.error('Portal error:', error);
          window.location.href = '/settings';
        }
      };
      
      return (
        <div className="bg-muted/30 border-b border-border px-4 py-3">
          <div className="flex items-center justify-between gap-3 max-w-4xl mx-auto">
            <div className="flex items-center gap-3 flex-1">
              <Info className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1">
                <p className="text-[13px] font-medium text-foreground">
                  Subscription Ends {endDate}
                </p>
                <p className="text-[12px] text-muted-foreground">
                  {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleResubscribe}
                className="text-[13px] text-primary hover:text-primary/80 font-medium transition-colors"
              >
                Renew
              </button>
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

  // Show preview mode banner only when truly in preview/none state AND subscription is fully loaded
  const { isLoading } = useSubscription();
  
  if (!isLoading && (subscriptionStatus === 'preview' || subscriptionStatus === 'none')) {
    return <PreviewModeBanner onUpgrade={onUpgrade} />;
  }

  return null;
};
