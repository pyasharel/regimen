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
  markPreviewCompoundAdded: () => Promise<void>;
  getCompoundCount: () => Promise<number>;
  previewModeCompoundAdded: boolean;
  setMockState: (state: 'none' | 'preview' | 'trialing' | 'active' | 'past_due' | 'canceled') => void;
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
  const [mockState, setMockState] = useState<'none' | 'preview' | 'trialing' | 'active' | 'past_due' | 'canceled'>('none');

  // Apply mock state for development testing
  const applyMockState = (state: typeof mockState) => {
    if (state === 'none') return; // Use real data
    
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const fifteenDaysFromNow = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
    
    switch (state) {
      case 'preview':
        setIsSubscribed(false);
        setSubscriptionStatus('none');
        setSubscriptionType(null);
        setSubscriptionEndDate(null);
        setTrialEndDate(null);
        break;
      case 'trialing':
        setIsSubscribed(true);
        setSubscriptionStatus('trialing');
        setSubscriptionType('monthly');
        setTrialEndDate(sevenDaysFromNow.toISOString());
        setSubscriptionEndDate(null);
        break;
      case 'active':
        setIsSubscribed(true);
        setSubscriptionStatus('active');
        setSubscriptionType('monthly');
        setSubscriptionEndDate(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString());
        setTrialEndDate(null);
        break;
      case 'past_due':
        setIsSubscribed(false);
        setSubscriptionStatus('past_due');
        setSubscriptionType('monthly');
        setSubscriptionEndDate(null);
        setTrialEndDate(null);
        break;
      case 'canceled':
        setIsSubscribed(true);
        setSubscriptionStatus('canceled');
        setSubscriptionType('annual');
        setSubscriptionEndDate(fifteenDaysFromNow.toISOString());
        setTrialEndDate(null);
        break;
    }
  };

  useEffect(() => {
    if (mockState !== 'none') {
      applyMockState(mockState);
    }
  }, [mockState]);

  // Prevent concurrent refreshes
  const refreshingRef = { current: false };

  const refreshSubscription = async () => {
    // Prevent concurrent calls
    if (refreshingRef.current) {
      console.log('[SubscriptionContext] Already refreshing, skipping...');
      return;
    }

    // Don't fetch real data if we're in mock mode
    if (mockState !== 'none') {
      setIsLoading(false);
      return;
    }

    refreshingRef.current = true;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsSubscribed(false);
        setSubscriptionStatus('none');
        setIsLoading(false);
        return;
      }

      setUser(user);

      // First verify subscription with Stripe to ensure database is up to date
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log('[SubscriptionContext] Calling check-subscription...');
          const { data, error } = await supabase.functions.invoke('check-subscription', {
            headers: {
              Authorization: `Bearer ${session.access_token}`
            }
          });
          
          if (error) {
            console.error('[SubscriptionContext] check-subscription error:', error);
          } else {
            console.log('[SubscriptionContext] check-subscription response:', data);
          }
          
          // Wait a bit to ensure database update propagates
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      } catch (error) {
        console.error('Error checking subscription with Stripe:', error);
      }

      // Then fetch the updated profile with subscription info
      console.log('[SubscriptionContext] Fetching profile...');
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('subscription_status, subscription_type, subscription_end_date, trial_end_date, preview_mode_compound_added, beta_access_end_date')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('[SubscriptionContext] Profile fetch error:', profileError);
      }

      if (profile) {
        console.log('[SubscriptionContext] Profile data:', profile);
        
        // Check for active beta access
        const betaAccessEndDate = profile.beta_access_end_date ? new Date(profile.beta_access_end_date) : null;
        const hasBetaAccess = betaAccessEndDate && betaAccessEndDate > new Date();
        
        if (hasBetaAccess) {
          console.log('[SubscriptionContext] Active beta access detected until:', betaAccessEndDate);
          setIsSubscribed(true);
          setSubscriptionStatus('active');
          setSubscriptionType(null); // Beta users don't have a subscription type
          setSubscriptionEndDate(profile.beta_access_end_date);
          setTrialEndDate(null);
        } else {
          const status = (profile.subscription_status || 'none') as 'none' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'paused';
          setSubscriptionStatus(status);
          setSubscriptionType(profile.subscription_type as 'monthly' | 'annual' | null);
          setSubscriptionEndDate(profile.subscription_end_date);
          setTrialEndDate(profile.trial_end_date);
          setIsSubscribed(status === 'active' || status === 'trialing');
        }
        
        setPreviewModeCompoundAdded(profile.preview_mode_compound_added || false);
        console.log('[SubscriptionContext] Updated state:', { 
          status: hasBetaAccess ? 'active (beta)' : profile.subscription_status, 
          isSubscribed: hasBetaAccess || profile.subscription_status === 'active' || profile.subscription_status === 'trialing' 
        });
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setIsLoading(false);
      refreshingRef.current = false;
    }
  };

  const canAddCompound = async (): Promise<boolean> => {
    console.log('[canAddCompound] Checking...', { isSubscribed });
    
    if (isSubscribed) {
      console.log('[canAddCompound] ✅ Subscribed - unlimited');
      return true;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('[canAddCompound] ❌ No user');
      return false;
    }

    const { count, error } = await supabase
      .from('compounds')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    console.log('[canAddCompound] Compound count:', count);

    if (error) {
      console.error('[canAddCompound] Error:', error);
      return false;
    }

    if (count === 0 && !previewModeCompoundAdded) {
      console.log('[canAddCompound] ✅ First compound allowed');
      return true;
    }

    console.log('[canAddCompound] ❌ Blocked - already has compound(s)');
    return false;
  };

  const getCompoundCount = async (): Promise<number> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { count, error } = await supabase
      .from('compounds')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (error) {
      console.error('Error getting compound count:', error);
      return 0;
    }

    return count || 0;
  };

  const markPreviewCompoundAdded = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('profiles')
      .update({ preview_mode_compound_added: true })
      .eq('user_id', user.id);

    setPreviewModeCompoundAdded(true);
  };

  useEffect(() => {
    refreshSubscription();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[SubscriptionContext] Auth event:', event);
      if (session?.user) {
        // Refresh immediately on sign in
        if (event === 'SIGNED_IN') {
          console.log('[SubscriptionContext] User signed in, refreshing subscription...');
          refreshSubscription();
        } else {
          // For other events, use a small delay
          setTimeout(() => {
            refreshSubscription();
          }, 100);
        }
      } else {
        console.log('[SubscriptionContext] No session, resetting state');
        setIsSubscribed(false);
        setSubscriptionStatus('none');
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SubscriptionContext.Provider
      value={{
        isSubscribed,
        subscriptionStatus,
        subscriptionType,
        subscriptionEndDate,
        trialEndDate,
        previewModeCompoundAdded,
        isLoading,
        refreshSubscription,
        canAddCompound,
        markPreviewCompoundAdded,
        getCompoundCount,
        setMockState,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};
