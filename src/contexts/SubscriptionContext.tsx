import { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Purchases, LOG_LEVEL, CustomerInfo, PurchasesOfferings, PurchasesPackage } from '@revenuecat/purchases-capacitor';

// RevenueCat configuration
const REVENUECAT_API_KEY = 'appl_uddMVGVjstgaIPpqOpueAFpZWmJ';
const ENTITLEMENT_ID = 'Regimen Premium';

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
  // RevenueCat-specific
  offerings: PurchasesOfferings | null;
  purchasePackage: (pkg: PurchasesPackage) => Promise<{ success: boolean; cancelled?: boolean; error?: string }>;
  restorePurchases: () => Promise<{ success: boolean; isPro?: boolean; error?: string }>;
  isNativePlatform: boolean;
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
  
  // RevenueCat state
  const [revenueCatConfigured, setRevenueCatConfigured] = useState(false);
  const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  
  const isNativePlatform = Capacitor.isNativePlatform();

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
  const refreshingRef = useRef(false);

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
    const startTime = Date.now();
    console.log('[SubscriptionContext] 🚀 Starting refresh...');

    // Track edge-function status so we don't overwrite it with a stale profile read.
    let edgeStatus: 'none' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'paused' | null = null;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('[SubscriptionContext] ⏱️ getUser took:', Date.now() - startTime, 'ms');
      
      if (!user) {
        setIsSubscribed(false);
        setSubscriptionStatus('none');
        setIsLoading(false);
        return;
      }

      setUser(user);

      // ==================== Check RevenueCat on Native Platforms ====================
      if (isNativePlatform && revenueCatConfigured) {
        try {
          console.log('[SubscriptionContext] Checking RevenueCat entitlements...');
          const { customerInfo } = await Purchases.getCustomerInfo();
          setCustomerInfo(customerInfo);
          
          const isPro = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
          console.log('[SubscriptionContext] RevenueCat isPro:', isPro, 'entitlements:', Object.keys(customerInfo.entitlements.active));
          
          if (isPro) {
            const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
            
            // Check if this is a trial period
            const isInTrial = entitlement?.periodType === 'TRIAL' || entitlement?.periodType === 'trial';
            
            console.log('[SubscriptionContext] ✅ RevenueCat: User has active subscription, isInTrial:', isInTrial);
            setIsSubscribed(true);
            setSubscriptionStatus(isInTrial ? 'trialing' : 'active');
            edgeStatus = isInTrial ? 'trialing' : 'active'; // Prevent downgrade from profile read
            
            // Try to determine subscription type from active subscriptions
            const activeSubscriptions = customerInfo.activeSubscriptions || [];
            if (activeSubscriptions.some((s: string) => s.includes('annual'))) {
              setSubscriptionType('annual');
            } else if (activeSubscriptions.some((s: string) => s.includes('monthly'))) {
              setSubscriptionType('monthly');
            }
            
            // Set end date if available
            if (entitlement?.expirationDate) {
              setSubscriptionEndDate(entitlement.expirationDate);
            }
            
            // Set trial end date if applicable
            if (isInTrial && entitlement?.expirationDate) {
              setTrialEndDate(entitlement.expirationDate);
            }
          }
        } catch (rcError) {
          console.error('[SubscriptionContext] RevenueCat check error:', rcError);
        }
      }

      // ==================== Check Stripe (for WEB ONLY) ====================
      // On native platforms, RevenueCat is the source of truth - skip Stripe entirely
      // This prevents Stripe from overwriting RevenueCat's active status with 'none'
      if (!isNativePlatform && edgeStatus !== 'active' && edgeStatus !== 'trialing') {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          console.log('[SubscriptionContext] ⏱️ getSession took:', Date.now() - startTime, 'ms');

          if (session) {
            console.log('[SubscriptionContext] Calling check-subscription...');
            const edgeFnStart = Date.now();
            const { data, error } = await supabase.functions.invoke('check-subscription', {
              headers: {
                Authorization: `Bearer ${session.access_token}`
              }
            });
            console.log('[SubscriptionContext] ⏱️ check-subscription took:', Date.now() - edgeFnStart, 'ms');

            if (error) {
              console.error('[SubscriptionContext] check-subscription error:', error);
            } else {
              console.log('[SubscriptionContext] check-subscription response:', data);

              // Apply server response immediately so the UI updates even if the profile read is slow.
              if (data?.status) {
                const status = (data.status || 'none') as 'none' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'paused';
                edgeStatus = status;
                setSubscriptionStatus(status);
                setSubscriptionType((data.subscription_type as 'monthly' | 'annual' | null) ?? null);
                setSubscriptionEndDate(data.subscription_end ?? null);
                setTrialEndDate(data.trial_end ?? null);
                setIsSubscribed(!!data.subscribed);
              }
            }
          }
        } catch (error) {
          console.error('Error checking subscription with Stripe:', error);
        }
      } else if (isNativePlatform) {
        console.log('[SubscriptionContext] Native platform - skipping Stripe check, using RevenueCat only');
      }

      // Fetch the updated profile with subscription info
      console.log('[SubscriptionContext] Fetching profile...');
      const profileStart = Date.now();
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('subscription_status, subscription_type, subscription_end_date, trial_end_date, preview_mode_compound_added, beta_access_end_date')
        .eq('user_id', user.id)
        .maybeSingle();
      console.log('[SubscriptionContext] ⏱️ profile fetch took:', Date.now() - profileStart, 'ms');
      console.log('[SubscriptionContext] ⏱️ Total refresh took:', Date.now() - startTime, 'ms');

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
          const statusFromProfile = (profile.subscription_status || 'none') as 'none' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'paused';

          // If Stripe just told us the user is active/trialing, don't downgrade to "none" due to a stale profile read.
          const shouldPreventDowngrade =
            (edgeStatus === 'active' || edgeStatus === 'trialing') &&
            statusFromProfile === 'none';

          if (!shouldPreventDowngrade) {
            setSubscriptionStatus(statusFromProfile);
            setSubscriptionType(profile.subscription_type as 'monthly' | 'annual' | null);
            setSubscriptionEndDate(profile.subscription_end_date);
            setTrialEndDate(profile.trial_end_date);
            setIsSubscribed(statusFromProfile === 'active' || statusFromProfile === 'trialing');
          }
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

  // ==================== RevenueCat Functions ====================

  // Initialize RevenueCat (native only)
  const initRevenueCat = useCallback(async () => {
    if (!isNativePlatform) {
      console.log('[RevenueCat] Web platform, skipping initialization');
      return;
    }

    try {
      console.log('[RevenueCat] Initializing...');
      await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
      await Purchases.configure({ apiKey: REVENUECAT_API_KEY });
      setRevenueCatConfigured(true);
      console.log('[RevenueCat] Configuration complete');

      // Get initial customer info and offerings
      const { customerInfo } = await Purchases.getCustomerInfo();
      setCustomerInfo(customerInfo);
      
      const isPro = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
      if (isPro) {
        console.log('[RevenueCat] User has Pro entitlement');
        setIsSubscribed(true);
        setSubscriptionStatus('active');
      }

      const offeringsResult = await Purchases.getOfferings();
      setOfferings(offeringsResult);
      console.log('[RevenueCat] Offerings loaded:', JSON.stringify(offeringsResult, null, 2));
      console.log('[RevenueCat] Current offering:', offeringsResult?.current);
      console.log('[RevenueCat] Available packages:', offeringsResult?.current?.availablePackages);
      
      if (!offeringsResult?.current) {
        console.warn('[RevenueCat] ⚠️ No current offering! Check RevenueCat dashboard configuration.');
      }
      if (!offeringsResult?.current?.availablePackages?.length) {
        console.warn('[RevenueCat] ⚠️ No available packages! Make sure products are configured in RevenueCat and App Store Connect.');
      }
    } catch (error) {
      console.error('[RevenueCat] Initialization error:', error);
    }
  }, [isNativePlatform]);

  // Identify user with RevenueCat after login
  const identifyRevenueCatUser = useCallback(async (userId: string) => {
    if (!isNativePlatform || !revenueCatConfigured) return;

    try {
      console.log('[RevenueCat] Identifying user:', userId);
      const { customerInfo } = await Purchases.logIn({ appUserID: userId });
      setCustomerInfo(customerInfo);
      
      const isPro = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
      if (isPro) {
        setIsSubscribed(true);
        setSubscriptionStatus('active');
      }
    } catch (error) {
      console.error('[RevenueCat] Identify error:', error);
    }
  }, [isNativePlatform, revenueCatConfigured]);

  // Purchase a package
  const purchasePackage = useCallback(async (packageToPurchase: PurchasesPackage): Promise<{ success: boolean; cancelled?: boolean; error?: string }> => {
    if (!isNativePlatform) {
      return { success: false, error: 'Purchases only available on native platforms' };
    }

    try {
      console.log('[RevenueCat] Purchasing package:', packageToPurchase);
      const { customerInfo } = await Purchases.purchasePackage({ aPackage: packageToPurchase });
      setCustomerInfo(customerInfo);
      
      const isPro = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
      console.log('[RevenueCat] Purchase complete. isPro:', isPro, 'entitlements:', Object.keys(customerInfo.entitlements.active));
      
      if (isPro) {
        const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
        
        // Check if this is a trial period
        const isInTrial = entitlement?.periodType === 'TRIAL' || entitlement?.periodType === 'trial';
        
        setIsSubscribed(true);
        setSubscriptionStatus(isInTrial ? 'trialing' : 'active');
        
        // Set subscription type based on package purchased
        if (packageToPurchase.identifier === '$rc_annual' || packageToPurchase.product.identifier.includes('annual')) {
          setSubscriptionType('annual');
        } else {
          setSubscriptionType('monthly');
        }
        
        // Set end date if available
        if (entitlement?.expirationDate) {
          setSubscriptionEndDate(entitlement.expirationDate);
        }
        
        // Set trial end date if applicable
        if (isInTrial && entitlement?.expirationDate) {
          setTrialEndDate(entitlement.expirationDate);
        }
      }
      
      return { success: true };
    } catch (error: any) {
      console.error('[RevenueCat] Purchase error:', error);
      
      // Check for user cancellation - RevenueCat uses different error codes
      if (error.code === 'PURCHASE_CANCELLED' || 
          error.code === 1 || 
          error.message?.includes('cancel') ||
          error.userCancelled) {
        return { success: false, cancelled: true };
      }
      
      return { success: false, error: error.message || 'Purchase failed' };
    }
  }, [isNativePlatform]);

  // Restore purchases
  const restorePurchases = useCallback(async (): Promise<{ success: boolean; isPro?: boolean; error?: string }> => {
    if (!isNativePlatform) {
      return { success: false, error: 'Restore only available on native platforms' };
    }

    try {
      console.log('[RevenueCat] Restoring purchases...');
      const { customerInfo } = await Purchases.restorePurchases();
      setCustomerInfo(customerInfo);
      
      const isPro = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
      console.log('[RevenueCat] Restore complete. isPro:', isPro, 'entitlements:', Object.keys(customerInfo.entitlements.active));
      
      if (isPro) {
        const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
        
        // Check if this is a trial period
        const isInTrial = entitlement?.periodType === 'TRIAL' || entitlement?.periodType === 'trial';
        
        setIsSubscribed(true);
        setSubscriptionStatus(isInTrial ? 'trialing' : 'active');
        
        // Determine subscription type from active subscriptions
        const activeSubscriptions = customerInfo.activeSubscriptions || [];
        if (activeSubscriptions.some((s: string) => s.includes('annual'))) {
          setSubscriptionType('annual');
        } else if (activeSubscriptions.some((s: string) => s.includes('monthly'))) {
          setSubscriptionType('monthly');
        }
        
        // Set end date
        if (entitlement?.expirationDate) {
          setSubscriptionEndDate(entitlement.expirationDate);
        }
        
        // Set trial end date if applicable
        if (isInTrial && entitlement?.expirationDate) {
          setTrialEndDate(entitlement.expirationDate);
        }
      } else {
        // No active subscription found
        setIsSubscribed(false);
        setSubscriptionStatus('none');
      }
      
      return { success: true, isPro };
    } catch (error) {
      console.error('[RevenueCat] Restore error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Restore failed' };
    }
  }, [isNativePlatform]);

  // Logout from RevenueCat
  const logoutRevenueCat = useCallback(async () => {
    if (!isNativePlatform || !revenueCatConfigured) return;

    try {
      console.log('[RevenueCat] Logging out');
      await Purchases.logOut();
      setCustomerInfo(null);
    } catch (error) {
      console.error('[RevenueCat] Logout error:', error);
    }
  }, [isNativePlatform, revenueCatConfigured]);

  // Main initialization effect
  useEffect(() => {
    // Initialize RevenueCat first on native
    if (isNativePlatform) {
      initRevenueCat();
    }
    
    refreshSubscription();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[SubscriptionContext] Auth event:', event);
      if (session?.user) {
        // Identify user with RevenueCat on sign in
        if (event === 'SIGNED_IN' && isNativePlatform) {
          identifyRevenueCatUser(session.user.id);
        }
        
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
        
        // Logout from RevenueCat
        if (isNativePlatform) {
          logoutRevenueCat();
        }
      }
    });

    // Listen for app resume to refresh subscription (important for returning from purchases)
    let appStateListener: { remove: () => void } | undefined;
    if (isNativePlatform) {
      CapacitorApp.addListener('appStateChange', async ({ isActive }) => {
        if (isActive) {
          console.log('[SubscriptionContext] App resumed, refreshing...');
          
          // Refresh RevenueCat customer info
          if (revenueCatConfigured) {
            try {
              const { customerInfo } = await Purchases.getCustomerInfo();
              setCustomerInfo(customerInfo);
              
              const isPro = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
              if (isPro) {
                setIsSubscribed(true);
                setSubscriptionStatus('active');
              }
            } catch (error) {
              console.error('[RevenueCat] Refresh on resume error:', error);
            }
          }
          
          refreshSubscription();
        }
      }).then(listener => {
        appStateListener = listener;
      });
    }

    return () => {
      subscription.unsubscribe();
      appStateListener?.remove();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNativePlatform]);

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
        // RevenueCat
        offerings,
        purchasePackage,
        restorePurchases,
        isNativePlatform,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};
