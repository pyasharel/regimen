import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

interface SubscriptionContextType {
  isSubscribed: boolean;
  subscriptionStatus: 'none' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'paused';
  subscriptionType: 'monthly' | 'annual' | null;
  subscriptionEndDate: string | null;
  trialEndDate: string | null;
  isLoading: boolean;
  refreshSubscription: () => Promise<void>;
  canAddCompound: () => Promise<boolean>;
  previewModeCompoundAdded: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within SubscriptionProvider');
  }
  return context;
};

export const SubscriptionProvider = ({ children }: { children: ReactNode }) => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<'none' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'paused'>('none');
  const [subscriptionType, setSubscriptionType] = useState<'monthly' | 'annual' | null>(null);
  const [subscriptionEndDate, setSubscriptionEndDate] = useState<string | null>(null);
  const [trialEndDate, setTrialEndDate] = useState<string | null>(null);
  const [previewModeCompoundAdded, setPreviewModeCompoundAdded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  const refreshSubscription = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsSubscribed(false);
        setSubscriptionStatus('none');
        return;
      }

      setUser(user);

      // Fetch profile with subscription info
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_status, subscription_type, subscription_end_date, trial_end_date, preview_mode_compound_added')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        const status = (profile.subscription_status || 'none') as 'none' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'paused';
        setSubscriptionStatus(status);
        setSubscriptionType(profile.subscription_type as 'monthly' | 'annual' | null);
        setSubscriptionEndDate(profile.subscription_end_date);
        setTrialEndDate(profile.trial_end_date);
        setPreviewModeCompoundAdded(profile.preview_mode_compound_added || false);
        setIsSubscribed(status === 'active' || status === 'trialing');
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const canAddCompound = async (): Promise<boolean> => {
    // If subscribed, unlimited compounds
    if (isSubscribed) return true;

    // Check compound count
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { count } = await supabase
      .from('compounds')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // Allow first compound in preview mode
    if (count === 0 && !previewModeCompoundAdded) {
      return true;
    }

    return false;
  };

  useEffect(() => {
    refreshSubscription();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        refreshSubscription();
      } else {
        setIsSubscribed(false);
        setSubscriptionStatus('none');
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <SubscriptionContext.Provider
      value={{
        isSubscribed,
        subscriptionStatus,
        subscriptionType,
        subscriptionEndDate,
        trialEndDate,
        isLoading,
        refreshSubscription,
        canAddCompound,
        previewModeCompoundAdded,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};
