import { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Purchases, LOG_LEVEL, CustomerInfo, PurchasesOfferings, PurchasesPackage } from '@revenuecat/purchases-capacitor';
import { addDiagnosticsLog } from '@/components/subscription/SubscriptionDiagnostics';

// RevenueCat configuration
const REVENUECAT_API_KEY = 'appl_uddMVGVjstgaIPpqOpueAFpZWmJ';
const ENTITLEMENT_ID = 'Regimen Premium';

const isTrialPeriodType = (periodType?: string | null) => {
  const t = (periodType ?? '').toUpperCase();
  return t === 'TRIAL' || t === 'INTRO';
};
interface RevenueCatEntitlementSnapshot {
  isPro: boolean;
  isTrialing: boolean;
}

interface SubscriptionContextType {
  isSubscribed: boolean;
  subscriptionStatus: 'none' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'paused';
  subscriptionType: 'monthly' | 'annual' | null;
  subscriptionEndDate: string | null;
  trialEndDate: string | null;
  isLoading: boolean;
  refreshSubscription: (trigger?: string) => Promise<void>;
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
  // Tracks which payment provider the subscription came from
  subscriptionProvider: 'stripe' | 'revenuecat' | null;

  // Diagnostics
  revenueCatAppUserId: string | null;
  revenueCatEntitlement: RevenueCatEntitlementSnapshot | null;
  lastStatusSource: string;
  lastRefreshTrigger: string;
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
  const [subscriptionStatus, setSubscriptionStatusInternal] = useState<'none' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'paused'>('none');
  const [subscriptionType, setSubscriptionType] = useState<'monthly' | 'annual' | null>(null);
  const [subscriptionEndDate, setSubscriptionEndDate] = useState<string | null>(null);
  const [trialEndDate, setTrialEndDate] = useState<string | null>(null);
  const [previewModeCompoundAdded, setPreviewModeCompoundAdded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [mockState, setMockState] = useState<'none' | 'preview' | 'trialing' | 'active' | 'past_due' | 'canceled'>('none');
  
  // Track source of last status change for diagnostics
  const lastStatusSourceRef = useRef<string>('init');
  const [lastStatusSource, setLastStatusSource] = useState<string>('init');
  const [lastRefreshTrigger, setLastRefreshTrigger] = useState<string>('init');
  
  // Wrapped setter that logs state transitions for diagnostics
  const setSubscriptionStatus = useCallback((newStatus: 'none' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'paused', source?: string) => {
    const logSource = source || lastStatusSourceRef.current || 'unknown';
    lastStatusSourceRef.current = logSource;
    setLastStatusSource(logSource);
    subscriptionStatusRef.current = newStatus; // Keep ref in sync for closures
    
    setSubscriptionStatusInternal(prevStatus => {
      if (prevStatus !== newStatus) {
        addDiagnosticsLog(logSource, prevStatus, newStatus);
      }
      return newStatus;
    });
  }, []);
  // RevenueCat state
  const [revenueCatConfigured, setRevenueCatConfigured] = useState(false);
  const [revenueCatIdentified, setRevenueCatIdentified] = useState(false); // Track if user is identified
  const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);

  /**
   * IMPORTANT: app resume + auth listeners run inside effect closures.
   * Use refs as the source of truth there to avoid stale state causing subscription "downgrades" to preview mode.
   */
  const subscriptionStatusRef = useRef<'none' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'paused'>('none');
  const revenueCatConfiguredRef = useRef(false);
  const revenueCatIdentifiedRef = useRef(false);
  const revenueCatEntitlementRef = useRef<{ isPro: boolean; isTrialing: boolean } | null>(null);
  const revenueCatAppUserIdRef = useRef<string | null>(null);
  // Track which payment provider the subscription came from
  const [subscriptionProvider, setSubscriptionProvider] = useState<'stripe' | 'revenuecat' | null>(null);

  const isNativePlatform = Capacitor.isNativePlatform();

  useEffect(() => {
    revenueCatConfiguredRef.current = revenueCatConfigured;
  }, [revenueCatConfigured]);

  useEffect(() => {
    revenueCatIdentifiedRef.current = revenueCatIdentified;
  }, [revenueCatIdentified]);


  // Apply mock state for development testing
  const applyMockState = (state: typeof mockState) => {
    if (state === 'none') return; // Use real data
    
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const fifteenDaysFromNow = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
    
    switch (state) {
      case 'preview':
        setIsSubscribed(false);
        setSubscriptionStatus('none', 'mock_preview');
        setSubscriptionType(null);
        setSubscriptionEndDate(null);
        setTrialEndDate(null);
        break;
      case 'trialing':
        setIsSubscribed(true);
        setSubscriptionStatus('trialing', 'mock_trialing');
        setSubscriptionType('monthly');
        setTrialEndDate(sevenDaysFromNow.toISOString());
        setSubscriptionEndDate(null);
        break;
      case 'active':
        setIsSubscribed(true);
        setSubscriptionStatus('active', 'mock_active');
        setSubscriptionType('monthly');
        setSubscriptionEndDate(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString());
        setTrialEndDate(null);
        break;
      case 'past_due':
        setIsSubscribed(false);
        setSubscriptionStatus('past_due', 'mock_past_due');
        setSubscriptionType('monthly');
        setSubscriptionEndDate(null);
        setTrialEndDate(null);
        break;
      case 'canceled':
        setIsSubscribed(true);
        setSubscriptionStatus('canceled', 'mock_canceled');
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

  const refreshSubscription = async (trigger: string = 'unknown') => {
    // Prevent concurrent calls
    if (refreshingRef.current) {
      console.log('[SubscriptionContext] Already refreshing, skipping... trigger was:', trigger);
      return;
    }

    // Don't fetch real data if we're in mock mode
    if (mockState !== 'none') {
      setIsLoading(false);
      return;
    }

    refreshingRef.current = true;
    setLastRefreshTrigger(trigger);
    const startTime = Date.now();
    console.log('[SubscriptionContext] 🚀 Starting refresh... trigger:', trigger);

    // Track edge-function status so we don't overwrite it with a stale profile read.
    let edgeStatus: 'none' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'paused' | null = null;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('[SubscriptionContext] ⏱️ getUser took:', Date.now() - startTime, 'ms');
      
      if (!user) {
        setIsSubscribed(false);
        setSubscriptionStatus('none', 'refresh_no_user');
        setIsLoading(false);
        return;
      }

      setUser(user);

      // Native: make sure the current Supabase user is identified in RevenueCat BEFORE checking entitlements.
      // If we skip this, a profile read of subscription_status='none' will incorrectly downgrade the UI to preview.
      if (isNativePlatform && revenueCatConfiguredRef.current && !revenueCatIdentifiedRef.current) {
        console.log('[SubscriptionContext] Native platform - attempting RevenueCat identify before entitlement check...');
        await identifyRevenueCatUser(user.id);
      }

      // ==================== Check RevenueCat on Native Platforms ====================
      // IMPORTANT: Only trust RevenueCat entitlements if the user has been identified
      // Otherwise, sandbox entitlements from a previous user on the same device could leak
      if (isNativePlatform && revenueCatIdentifiedRef.current) {
        try {
          console.log('[SubscriptionContext] Checking RevenueCat entitlements (user identified)...');
          const { customerInfo } = await Purchases.getCustomerInfo();
          setCustomerInfo(customerInfo);

          const isPro = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
          const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
          const isInTrial = isTrialPeriodType(entitlement?.periodType);

          revenueCatEntitlementRef.current = { isPro, isTrialing: !!(isPro && isInTrial) };

          console.log('[SubscriptionContext] RevenueCat isPro:', isPro, 'entitlements:', Object.keys(customerInfo.entitlements.active));

          if (isPro) {
            console.log('[SubscriptionContext] ✅ RevenueCat: User has active subscription, isInTrial:', isInTrial);
            setIsSubscribed(true);
            setSubscriptionStatus(isInTrial ? 'trialing' : 'active', 'rc_entitlement_check');
            setSubscriptionProvider('revenuecat'); // Track that this subscription is from RevenueCat
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
      } else if (isNativePlatform && !revenueCatIdentifiedRef.current) {
        console.log('[SubscriptionContext] Native platform but user not identified with RevenueCat yet - skipping RC check');
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
                setSubscriptionStatus(status, 'stripe_edge_fn');
                setSubscriptionType((data.subscription_type as 'monthly' | 'annual' | null) ?? null);
                setSubscriptionEndDate(data.subscription_end ?? null);
                setTrialEndDate(data.trial_end ?? null);
                setIsSubscribed(!!data.subscribed);
                if (data.subscribed) {
                  setSubscriptionProvider('stripe'); // Web users use Stripe
                }
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
          setSubscriptionStatus('active', 'beta_access');
          setSubscriptionType(null); // Beta users don't have a subscription type
          setSubscriptionEndDate(profile.beta_access_end_date);
          setTrialEndDate(null);
          } else {
            const statusFromProfile = (profile.subscription_status || 'none') as 'none' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'paused';

            // Prevent stale backend reads from downgrading a real active subscription.
            // - Web: edgeStatus (Stripe) is authoritative
            // - Native: RevenueCat entitlement ref is authoritative (once identified)
            const shouldPreventDowngrade =
              statusFromProfile === 'none' &&
              (
                edgeStatus === 'active' ||
                edgeStatus === 'trialing' ||
                (isNativePlatform && revenueCatEntitlementRef.current?.isPro)
              );

            if (shouldPreventDowngrade) {
              console.log('[SubscriptionContext] Preventing downgrade to none (stale profile read)');
            } else {
              setSubscriptionStatus(statusFromProfile, 'profile_read');
              setSubscriptionType(profile.subscription_type as 'monthly' | 'annual' | null);
              setSubscriptionEndDate(profile.subscription_end_date);
              setTrialEndDate(profile.trial_end_date);
              setIsSubscribed(statusFromProfile === 'active' || statusFromProfile === 'trialing');

              // If subscription is active and we're on native but RevenueCat didn't find it,
              // this is a Stripe subscriber on iOS (existing customer from before RevenueCat)
              if ((statusFromProfile === 'active' || statusFromProfile === 'trialing') &&
                  isNativePlatform &&
                  !edgeStatus) {
                console.log('[SubscriptionContext] Detected existing Stripe subscriber on iOS');
                setSubscriptionProvider('stripe');
              }
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
      revenueCatConfiguredRef.current = true;
      console.log('[RevenueCat] Configuration complete');

      // Get initial customer info (for anonymous user - DON'T check entitlements yet)
      // We'll only trust entitlements after identifying the user with their Supabase ID
      const { customerInfo } = await Purchases.getCustomerInfo();
      setCustomerInfo(customerInfo);
      console.log('[RevenueCat] Anonymous customer info loaded - NOT trusting entitlements yet');

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
  // IMPORTANT: Returns subscription status to avoid race conditions
  const identifyRevenueCatUser = useCallback(
    async (userId: string): Promise<{ isPro: boolean; isTrialing: boolean }> => {
      if (!isNativePlatform || !revenueCatConfiguredRef.current) {
        return { isPro: false, isTrialing: false };
      }

      try {
        console.log('[RevenueCat] Identifying user:', userId);
        const { customerInfo } = await Purchases.logIn({ appUserID: userId });
        setCustomerInfo(customerInfo);

        // Mark identified synchronously FIRST (state updates are async)
        revenueCatIdentifiedRef.current = true;
        revenueCatAppUserIdRef.current = userId;
        setRevenueCatIdentified(true);

        const isPro = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
        const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
        const isInTrial = isTrialPeriodType(entitlement?.periodType);

        revenueCatEntitlementRef.current = { isPro, isTrialing: !!(isPro && isInTrial) };

        console.log('[RevenueCat] User identified. isPro:', isPro, 'isInTrial:', isInTrial);

        if (isPro) {
          setIsSubscribed(true);
          setSubscriptionStatus(isInTrial ? 'trialing' : 'active', 'rc_identify');
          setSubscriptionProvider('revenuecat');

          // Determine subscription type
          const activeSubscriptions = customerInfo.activeSubscriptions || [];
          if (activeSubscriptions.some((s: string) => s.includes('annual'))) {
            setSubscriptionType('annual');
          } else if (activeSubscriptions.some((s: string) => s.includes('monthly'))) {
            setSubscriptionType('monthly');
          }

          if (entitlement?.expirationDate) {
            setSubscriptionEndDate(entitlement.expirationDate);
            setTrialEndDate(isInTrial ? entitlement.expirationDate : null);
          }

          return { isPro: true, isTrialing: !!isInTrial };
        }

        // Identified but no entitlement: don't force "none" here (could be a legacy Stripe subscriber on iOS)
        return { isPro: false, isTrialing: false };
      } catch (error) {
        console.error('[RevenueCat] Identify error:', error);
        revenueCatEntitlementRef.current = { isPro: false, isTrialing: false };
        return { isPro: false, isTrialing: false };
      }
    },
    [isNativePlatform]
  );

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
      const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
      const isInTrial = isTrialPeriodType(entitlement?.periodType);

      // After a purchase, we can trust entitlements for this user.
      revenueCatIdentifiedRef.current = true;
      setRevenueCatIdentified(true);
      revenueCatEntitlementRef.current = { isPro, isTrialing: !!(isPro && isInTrial) };

      console.log('[RevenueCat] Purchase complete. isPro:', isPro, 'entitlements:', Object.keys(customerInfo.entitlements.active));

      if (isPro) {
        setIsSubscribed(true);
        setSubscriptionStatus(isInTrial ? 'trialing' : 'active', 'rc_purchase');
        setSubscriptionProvider('revenuecat'); // Track that this subscription is from RevenueCat

        // Set subscription type based on package purchased
        if (packageToPurchase.identifier === '$rc_annual' || packageToPurchase.product.identifier.includes('annual')) {
          setSubscriptionType('annual');
        } else {
          setSubscriptionType('monthly');
        }

        if (entitlement?.expirationDate) {
          setSubscriptionEndDate(entitlement.expirationDate);
        }

        if (isInTrial && entitlement?.expirationDate) {
          setTrialEndDate(entitlement.expirationDate);
        }
      }

      return { success: true };
    } catch (error: any) {
      console.error('[RevenueCat] Purchase error:', error);

      // Check for user cancellation - RevenueCat uses different error codes
      if (
        error.code === 'PURCHASE_CANCELLED' ||
        error.code === 1 ||
        error.message?.includes('cancel') ||
        error.userCancelled
      ) {
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
      // Ensure RevenueCat is initialized and the user is identified (prevents sandbox entitlement leakage).
      if (!revenueCatConfiguredRef.current) {
        await initRevenueCat();
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user && revenueCatConfiguredRef.current) {
        const needsIdentify =
          !revenueCatIdentifiedRef.current ||
          revenueCatAppUserIdRef.current !== user.id;

        if (needsIdentify) {
          await identifyRevenueCatUser(user.id);
        }
      }

      console.log('[RevenueCat] Restoring purchases...');
      const { customerInfo } = await Purchases.restorePurchases();
      setCustomerInfo(customerInfo);

      const isPro = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
      const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
      const isInTrial = isTrialPeriodType(entitlement?.periodType);

      revenueCatEntitlementRef.current = { isPro, isTrialing: !!(isPro && isInTrial) };

      console.log('[RevenueCat] Restore complete. isPro:', isPro, 'entitlements:', Object.keys(customerInfo.entitlements.active));

      if (isPro) {
        setIsSubscribed(true);
        setSubscriptionStatus(isInTrial ? 'trialing' : 'active', 'rc_restore');
        setSubscriptionProvider('revenuecat'); // Track that this subscription is from RevenueCat

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
        setSubscriptionStatus('none', 'rc_restore_no_sub');
      }

      return { success: true, isPro };
    } catch (error) {
      console.error('[RevenueCat] Restore error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Restore failed' };
    }
  }, [isNativePlatform, identifyRevenueCatUser, initRevenueCat]);

  // Logout from RevenueCat
  const logoutRevenueCat = useCallback(async () => {
    if (!isNativePlatform || !revenueCatConfiguredRef.current) return;

    try {
      console.log('[RevenueCat] Logging out');
      await Purchases.logOut();
      setCustomerInfo(null);
      setRevenueCatIdentified(false); // Reset identified state on logout
      revenueCatIdentifiedRef.current = false;
      revenueCatAppUserIdRef.current = null;
      revenueCatEntitlementRef.current = null;
    } catch (error) {
      console.error('[RevenueCat] Logout error:', error);
    }
  }, [isNativePlatform]);

  // Main initialization effect
  useEffect(() => {
    const initialize = async () => {
      // Initialize RevenueCat first on native and WAIT for it to complete
      if (isNativePlatform) {
        await initRevenueCat();

        // If the user is already signed in (cold start), identify immediately before refreshing.
        const { data: { user } } = await supabase.auth.getUser();
        if (user && revenueCatConfiguredRef.current) {
          await identifyRevenueCatUser(user.id);
        }
      }

      // Only refresh after RevenueCat is ready (on native) so we don't skip the RC check
      refreshSubscription('context_init');
    };

    initialize();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[SubscriptionContext] Auth event:', event);

      if (session?.user) {
        // Clear any stale banner dismissal from previous user session
        if (event === 'SIGNED_IN') {
          sessionStorage.removeItem('dismissedBanner');
        }

        // Native: ensure RevenueCat is initialized + user identified before refresh.
        // IMPORTANT: this must also run on INITIAL_SESSION (app cold start) and TOKEN_REFRESHED,
        // otherwise we can incorrectly fall back to profile.subscription_status='none' and show preview.
        if (isNativePlatform) {
          if (!revenueCatConfiguredRef.current) {
            await initRevenueCat();
          }

          if (revenueCatConfiguredRef.current) {
            const needsIdentify =
              !revenueCatIdentifiedRef.current ||
              revenueCatAppUserIdRef.current !== session.user.id;

            if (needsIdentify) {
              await identifyRevenueCatUser(session.user.id);
            }
          }
        }

        console.log('[SubscriptionContext] Session available, refreshing subscription...');
        refreshSubscription(`auth_${event.toLowerCase()}`);
      } else {
        // ... keep existing code (handled below)
        console.log('[SubscriptionContext] No session, resetting state');
        setIsSubscribed(false);
        setSubscriptionStatus('none', 'auth_logout');
        setSubscriptionProvider(null);
        setIsLoading(false);

        // Clear banner dismissal on logout so new users see the banner
        sessionStorage.removeItem('dismissedBanner');

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
        if (!isActive) return;

        console.log('[SubscriptionContext] App resumed...');
        addDiagnosticsLog('app_resume', subscriptionStatusRef.current, '...', 'App resumed from background');

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Ensure RC init even if resume happens very early
          if (!revenueCatConfiguredRef.current) {
            await initRevenueCat();
          }

          if (revenueCatConfiguredRef.current) {
            // Screenshot on iOS can cause a very quick background/foreground toggle.
            // If we already had an active entitlement in-memory, keep it stable and don't re-log-in.
            const cached = revenueCatEntitlementRef.current;
            if (cached?.isPro) {
              setIsSubscribed(true);
              setSubscriptionStatus(cached.isTrialing ? 'trialing' : 'active', 'app_resume_rc_cached');
              setSubscriptionProvider('revenuecat');
              setLastRefreshTrigger('app_resume_rc_cached');
              return;
            }

            const needsIdentify =
              !revenueCatIdentifiedRef.current ||
              revenueCatAppUserIdRef.current !== user.id;

            let isPro = false;
            let isTrialing = false;

            if (needsIdentify) {
              const result = await identifyRevenueCatUser(user.id);
              isPro = result.isPro;
              isTrialing = result.isTrialing;
            } else {
              const { customerInfo } = await Purchases.getCustomerInfo();
              setCustomerInfo(customerInfo);
              const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
              isPro = !!entitlement;
              isTrialing = isTrialPeriodType(entitlement?.periodType);
              revenueCatEntitlementRef.current = { isPro, isTrialing };
            }

            // If RevenueCat confirms user is subscribed, update state from RC and SKIP the full refresh
            // (full refresh can trigger stale profile reads that incorrectly downgrade to preview)
            if (isPro) {
              console.log('[SubscriptionContext] App resumed - RevenueCat confirms subscription, updating state from RC');
              setIsSubscribed(true);
              setSubscriptionStatus(isTrialing ? 'trialing' : 'active', needsIdentify ? 'app_resume_rc_confirm' : 'app_resume_rc_info');
              setSubscriptionProvider('revenuecat');
              setLastRefreshTrigger(needsIdentify ? 'app_resume_rc_confirm' : 'app_resume_rc_info');
              return;
            }
          }
        }

        console.log('[SubscriptionContext] App resumed, calling refreshSubscription...');
        refreshSubscription('app_resume');
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
        subscriptionProvider,
        // Diagnostics
        revenueCatAppUserId: revenueCatAppUserIdRef.current,
        revenueCatEntitlement: revenueCatEntitlementRef.current,
        lastStatusSource,
        lastRefreshTrigger,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};
