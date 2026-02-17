import { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Purchases, LOG_LEVEL, CustomerInfo, PurchasesOfferings, PurchasesPackage } from '@revenuecat/purchases-capacitor';
import { getStoredAttribution } from '@/utils/attribution';
import { appVersion } from '../../capacitor.config';
import { getUserIdWithFallback } from '@/utils/safeAuth';

// Partner promotional offer parameters (from signed offer generation)
export interface PromotionalOfferParams {
  productIdentifier: string;
  offerIdentifier: string;
  keyIdentifier: string;
  nonce: string;
  signature: string;
  timestamp: number;
}
import { addDiagnosticsLog } from '@/components/subscription/SubscriptionDiagnostics';
import { persistentStorage, CachedEntitlement, CACHED_ENTITLEMENT_MAX_AGE_MS } from '@/utils/persistentStorage';

// RevenueCat configuration - platform-specific API keys
const REVENUECAT_IOS_KEY = 'appl_uddMVGVjstgaIPpqOpueAFpZWmJ';
const REVENUECAT_ANDROID_KEY = 'goog_jLMtYIMmEzqQDnGVmsjMpRdwfot';
const ENTITLEMENT_ID = 'Regimen Premium';

// Helper to get platform-specific RevenueCat API key
const getRevenueCatApiKey = () => {
  return Capacitor.getPlatform() === 'android' 
    ? REVENUECAT_ANDROID_KEY 
    : REVENUECAT_IOS_KEY;
};

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
  canEditCompound: () => Promise<boolean>;
  markPreviewCompoundAdded: () => Promise<void>;
  getCompoundCount: () => Promise<number>;
  previewModeCompoundAdded: boolean;
  setMockState: (state: 'none' | 'preview' | 'trialing' | 'active' | 'past_due' | 'canceled') => void;
  // RevenueCat-specific
  offerings: PurchasesOfferings | null;
  purchasePackage: (pkg: PurchasesPackage, promotionalOffer?: PromotionalOfferParams, googleSubscriptionOption?: any) => Promise<{ success: boolean; cancelled?: boolean; error?: string }>;
  restorePurchases: () => Promise<{ success: boolean; isPro?: boolean; error?: string }>;
  isNativePlatform: boolean;
  // Tracks which payment provider the subscription came from
  subscriptionProvider: 'stripe' | 'revenuecat' | null;

  // Free compound gating: the oldest compound is the "free" one
  freeCompoundId: string | null;
  isFreeCompound: (compoundId: string) => boolean;
  refreshFreeCompound: () => void;

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
  
  // Free compound gating: track the oldest compound ID
  const [freeCompoundId, setFreeCompoundId] = useState<string | null>(null);
  const [freeCompoundRefreshKey, setFreeCompoundRefreshKey] = useState(0);
  
  const isFreeCompound = useCallback((compoundId: string) => {
    if (!freeCompoundId) return true; // No data yet, allow
    return compoundId === freeCompoundId;
  }, [freeCompoundId]);
  
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
  // Used to ignore one-off transient “not subscribed” results on iOS resume (e.g., screenshot background/foreground)
  const revenueCatNegativeStreakRef = useRef(0);
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
  // Watchdog timer ID
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Maximum time to allow refresh to run before forcing isLoading=false
  // Reduced from 8s to 5s for faster recovery on cold starts
  const REFRESH_WATCHDOG_MS = 5000;

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

    // Start watchdog timer - if refresh hangs, force isLoading to false
    if (watchdogRef.current) {
      clearTimeout(watchdogRef.current);
    }
    watchdogRef.current = setTimeout(() => {
      console.warn('[SubscriptionContext] ⏰ Watchdog triggered - forcing isLoading=false');
      setIsLoading(false);
      refreshingRef.current = false;
    }, REFRESH_WATCHDOG_MS);

    // Track edge-function status so we don't overwrite it with a stale profile read.
    let edgeStatus: 'none' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'paused' | null = null;

    try {
      // Use getUserIdWithFallback to avoid hanging on iOS resume
      // This uses cached session first, then falls back to getUser with timeout
      const userId = await getUserIdWithFallback(3000);
      console.log('[SubscriptionContext] ⏱️ getUserIdWithFallback took:', Date.now() - startTime, 'ms');
      
      if (!userId) {
        setIsSubscribed(false);
        setSubscriptionStatus('none', 'refresh_no_user');
        setIsLoading(false);
        return;
      }

      // REMOVED: supabase.auth.getUser() call - it causes auth lock contention on cold start
      // We already have the userId from getUserIdWithFallback, that's all we need
      // The user object in state is only used for the ID, so create a minimal one
      const user: User = { id: userId } as User;
      setUser(user);

      // Native: always ensure RevenueCat is initialized + logged in as the current backend user
      // BEFORE doing any entitlement checks or profile reads.
      if (isNativePlatform) {
        if (!revenueCatConfiguredRef.current) {
          console.log('[SubscriptionContext] Native platform - initializing RevenueCat before entitlement check...');
          await initRevenueCat();
        }

        if (revenueCatConfiguredRef.current) {
          const needsIdentify =
            !revenueCatIdentifiedRef.current ||
            revenueCatAppUserIdRef.current !== userId;

          if (needsIdentify) {
            console.log('[SubscriptionContext] Native platform - identifying RevenueCat user before entitlement check...', {
              currentAppUserId: revenueCatAppUserIdRef.current,
              targetUserId: userId,
            });
            await identifyRevenueCatUser(userId);
          }
        }
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
            setSubscriptionProvider('revenuecat');
            edgeStatus = isInTrial ? 'trialing' : 'active'; // Prevent downgrade from profile read

            // Try to determine subscription type from active subscriptions
            const activeSubscriptions = customerInfo.activeSubscriptions || [];
            let subType: 'monthly' | 'annual' | null = null;
            if (activeSubscriptions.some((s: string) => s.includes('annual'))) {
              subType = 'annual';
              setSubscriptionType('annual');
            } else if (activeSubscriptions.some((s: string) => s.includes('monthly'))) {
              subType = 'monthly';
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

            // 💾 Save to persistent cache
            await saveEntitlementToCache(userId, true, !!isInTrial, subType, entitlement?.expirationDate ?? null);
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
        .select('subscription_status, subscription_type, subscription_end_date, trial_end_date, preview_mode_compound_added, beta_access_end_date, is_lifetime_access')
        .eq('user_id', userId)
        .maybeSingle();
      console.log('[SubscriptionContext] ⏱️ profile fetch took:', Date.now() - profileStart, 'ms');
      console.log('[SubscriptionContext] ⏱️ Total refresh took:', Date.now() - startTime, 'ms');

      if (profileError) {
        console.error('[SubscriptionContext] Profile fetch error:', profileError);
      }

      if (profile) {
        console.log('[SubscriptionContext] Profile data:', profile);
        
        // Check for lifetime VIP access first (highest priority)
        const hasLifetimeAccess = profile.is_lifetime_access === true;
        
        // Check for active beta access
        const betaAccessEndDate = profile.beta_access_end_date ? new Date(profile.beta_access_end_date) : null;
        const hasBetaAccess = betaAccessEndDate && betaAccessEndDate > new Date();
        
        if (hasLifetimeAccess) {
          console.log('[SubscriptionContext] Lifetime VIP access detected');
          setIsSubscribed(true);
          setSubscriptionStatus('active', 'lifetime_access');
          setSubscriptionType(null); // Lifetime users don't have a subscription type
          setSubscriptionEndDate(null); // No end date for lifetime
          setTrialEndDate(null);
        } else if (hasBetaAccess) {
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
      // Clear watchdog since we're completing normally
      if (watchdogRef.current) {
        clearTimeout(watchdogRef.current);
        watchdogRef.current = null;
      }
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

    // SIMPLE RULE: Only allow if user has 0 compounds
    // Once they have ANY compound (from onboarding or manual), block additions
    // This enforces the "1 total compound free" rule
    if (count === 0) {
      console.log('[canAddCompound] ✅ First compound allowed (no compounds)');
      return true;
    }

    console.log('[canAddCompound] ❌ Blocked - already has compound(s)');
    return false;
  };

  // Check if user can edit a compound
  // Rules: Allow if subscribed OR if they only have 1 compound
  const canEditCompound = async (): Promise<boolean> => {
    console.log('[canEditCompound] Checking...', { isSubscribed });
    
    if (isSubscribed) {
      console.log('[canEditCompound] ✅ Subscribed - can edit');
      return true;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('[canEditCompound] ❌ No user');
      return false;
    }

    const { count, error } = await supabase
      .from('compounds')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    console.log('[canEditCompound] Compound count:', count);

    if (error) {
      console.error('[canEditCompound] Error:', error);
      return false;
    }

    // Allow editing if they only have 1 compound (preview mode)
    if (count === 1) {
      console.log('[canEditCompound] ✅ Single compound - can edit');
      return true;
    }

    console.log('[canEditCompound] ❌ Blocked - multiple compounds require subscription');
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

  // Refresh free compound ID manually (call after adding a compound)
  const refreshFreeCompound = useCallback(() => {
    setFreeCompoundRefreshKey(k => k + 1);
  }, []);

  // Fetch the oldest compound ID (the "free" compound) whenever subscription or refresh key changes
  useEffect(() => {
    const fetchFreeCompound = async () => {
      const userId = await getUserIdWithFallback(3000);
      if (!userId) return;
      try {
        const { data } = await supabase
          .from('compounds')
          .select('id')
          .eq('user_id', userId)
          .eq('is_active', true)
          .order('created_at', { ascending: true })
          .limit(1);
        if (data && data.length > 0) {
          setFreeCompoundId(data[0].id);
        } else {
          setFreeCompoundId(null);
        }
      } catch (e) {
        console.warn('[SubscriptionContext] Failed to fetch free compound:', e);
      }
    };
    fetchFreeCompound();
  }, [isSubscribed, subscriptionStatus, freeCompoundRefreshKey]);



  // Helper to save entitlement to persistent storage
  const saveEntitlementToCache = useCallback(async (
    userId: string,
    isPro: boolean,
    isTrialing: boolean,
    subType: 'monthly' | 'annual' | null,
    expirationDate: string | null
  ) => {
    if (!isNativePlatform) return;
    
    const cache: CachedEntitlement = {
      userId,
      isPro,
      isTrialing,
      subscriptionType: subType,
      expirationDate,
      timestamp: Date.now(),
    };
    
    await persistentStorage.setJSON('cachedEntitlement', cache);
    console.log('[SubscriptionContext] 💾 Saved entitlement to cache:', cache);
  }, [isNativePlatform]);

  // Helper to load entitlement from persistent storage
  const loadEntitlementFromCache = useCallback(async (currentUserId: string): Promise<CachedEntitlement | null> => {
    if (!isNativePlatform) return null;
    
    const cache = await persistentStorage.getJSON<CachedEntitlement>('cachedEntitlement');
    
    if (!cache) {
      console.log('[SubscriptionContext] 📭 No cached entitlement found');
      return null;
    }
    
    // Validate cache: must be for same user and not expired
    if (cache.userId !== currentUserId) {
      console.log('[SubscriptionContext] 🚫 Cached entitlement for different user, ignoring');
      await persistentStorage.remove('cachedEntitlement');
      return null;
    }
    
    const age = Date.now() - cache.timestamp;
    if (age > CACHED_ENTITLEMENT_MAX_AGE_MS) {
      console.log('[SubscriptionContext] ⏰ Cached entitlement expired (age:', Math.round(age / 1000 / 60), 'minutes)');
      // Don't delete - we might still use it if RevenueCat fails
      return null;
    }
    
    console.log('[SubscriptionContext] ✅ Loaded valid cached entitlement:', cache);
    return cache;
  }, [isNativePlatform]);

  // Helper to clear entitlement cache (only when definitively not pro)
  const clearEntitlementCache = useCallback(async () => {
    if (!isNativePlatform) return;
    await persistentStorage.remove('cachedEntitlement');
    console.log('[SubscriptionContext] 🗑️ Cleared entitlement cache');
  }, [isNativePlatform]);

  // Apply cached entitlement to state
  const applyCachedEntitlement = useCallback((cache: CachedEntitlement, source: string) => {
    console.log('[SubscriptionContext] 📦 Applying cached entitlement from:', source);
    setIsSubscribed(true);
    setSubscriptionStatus(cache.isTrialing ? 'trialing' : 'active', source);
    setSubscriptionProvider('revenuecat');
    setSubscriptionType(cache.subscriptionType);
    if (cache.expirationDate) {
      setSubscriptionEndDate(cache.expirationDate);
      if (cache.isTrialing) {
        setTrialEndDate(cache.expirationDate);
      }
    }
    revenueCatEntitlementRef.current = { isPro: cache.isPro, isTrialing: cache.isTrialing };
  }, [setSubscriptionStatus]);

  // Initialize RevenueCat (native only)
  const initRevenueCat = useCallback(async () => {
    if (!isNativePlatform) {
      console.log('[RevenueCat] Web platform, skipping initialization');
      return;
    }

    try {
      const apiKey = getRevenueCatApiKey();
      console.log('[RevenueCat] Initializing with platform:', Capacitor.getPlatform());
      await Purchases.setLogLevel({ level: LOG_LEVEL.WARN });
      await Purchases.configure({ apiKey });
      setRevenueCatConfigured(true);
      revenueCatConfiguredRef.current = true;
      console.log('[RevenueCat] Configuration complete');
      
      // Enable Apple Search Ads attribution token collection (iOS only)
      // This allows RevenueCat to automatically collect ASA attribution data
      if (Capacitor.getPlatform() === 'ios') {
        try {
          await Purchases.enableAdServicesAttributionTokenCollection();
          console.log('[RevenueCat] AdServices attribution token collection enabled');
        } catch (adServicesError) {
          console.warn('[RevenueCat] Could not enable AdServices attribution:', adServicesError);
        }
      }

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

        // Enrich RevenueCat with user details (name, email, UTM attributes)
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, created_at, onboarding_completed, experience_level, path_type')
            .eq('user_id', userId)
            .single();
          
          const { data: { user } } = await supabase.auth.getUser();
          
          // Set display name and email in RevenueCat
          if (profile?.full_name) {
            await Purchases.setDisplayName({ displayName: profile.full_name });
            console.log('[RevenueCat] Display name set:', profile.full_name);
          }
          if (user?.email) {
            await Purchases.setEmail({ email: user.email });
            console.log('[RevenueCat] Email set');
          }
          
          // Also set attribution as custom attributes
          const attribution = getStoredAttribution();
          if (attribution?.utm_source) {
            await Purchases.setAttributes({
              utm_source: attribution.utm_source,
              utm_medium: attribution.utm_medium || '',
              utm_campaign: attribution.utm_campaign || '',
            });
            console.log('[RevenueCat] UTM attributes set');
          }
          
          // Set platform and app version for cross-platform tracking
          const platform = Capacitor.getPlatform();
          await Purchases.setAttributes({
            platform: platform,
            app_version: appVersion,
          });
          console.log('[RevenueCat] Platform and app_version set:', platform, appVersion);
          
          // Set country/locale for geo tracking
          // IMPORTANT: Use 'country_code' NOT '$countryCode' - the $ prefix is reserved by RevenueCat
          // Primary: IP geolocation for accurate country. Fallback: navigator.language (unreliable for country)
          try {
            const locale = navigator.language || 'en-US';
            let countryCode = locale.split('-')[1] || 'Unknown';
            
            // Try IP-based geolocation first (more accurate than device locale)
            try {
              const geoController = new AbortController();
              const geoTimeout = setTimeout(() => geoController.abort(), 3000);
              const geoRes = await fetch('https://ipapi.co/json/', { signal: geoController.signal });
              clearTimeout(geoTimeout);
              if (geoRes.ok) {
                const geoData = await geoRes.json();
                if (geoData.country_code) {
                  countryCode = geoData.country_code;
                  console.log('[RevenueCat] IP geolocation country:', countryCode);
                }
              }
            } catch (geoErr) {
              console.warn('[RevenueCat] IP geolocation failed, using locale fallback:', geoErr);
            }
            
            await Purchases.setAttributes({
              country_code: countryCode,
              locale: locale,
            });
            console.log('[RevenueCat] Country/locale set:', countryCode, locale);
            
            // Also update the profile with accurate country
            try {
              const { data: { user: currentUser } } = await supabase.auth.getUser();
              if (currentUser) {
                await supabase.from('profiles').update({ 
                  country_code: countryCode, 
                  detected_locale: locale 
                }).eq('user_id', currentUser.id);
              }
            } catch (profileErr) {
              console.warn('[RevenueCat] Could not update profile country:', profileErr);
            }
          } catch (localeError) {
            console.warn('[RevenueCat] Could not set country/locale:', localeError);
          }
          
          // Sync comprehensive engagement attributes to RevenueCat
          try {
            const engagementAttrs: Record<string, string> = {};
            
            // Profile-based attributes
            if (profile) {
              // Signup date for cohort analysis
              if (profile.created_at) {
                const signupDate = profile.created_at.split('T')[0]; // YYYY-MM-DD
                engagementAttrs.signup_date = signupDate;
                
                // Calculate days since signup
                const signupTime = new Date(profile.created_at).getTime();
                const daysSinceSignup = Math.floor((Date.now() - signupTime) / (1000 * 60 * 60 * 24));
                engagementAttrs.days_since_signup = String(daysSinceSignup);
              }
              
              // Onboarding completion status
              if (profile.onboarding_completed !== null) {
                engagementAttrs.onboarding_completed = String(profile.onboarding_completed);
              }
              
              // User segmentation attributes
              if (profile.experience_level) {
                engagementAttrs.experience_level = profile.experience_level;
              }
              if (profile.path_type) {
                engagementAttrs.path_type = profile.path_type;
              }
            }
            
            // Session count from localStorage (tracks how often they return)
            const sessionCount = localStorage.getItem('regimen_session_count');
            if (sessionCount) {
              engagementAttrs.total_sessions = sessionCount;
            }
            
            // Set profile-based attributes
            if (Object.keys(engagementAttrs).length > 0) {
              await Purchases.setAttributes(engagementAttrs);
              console.log('[RevenueCat] Engagement attributes set:', engagementAttrs);
            }
            
            // Compound count (requires separate query)
            const { count: compoundsCount } = await supabase
              .from('compounds')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', userId);
            
            await Purchases.setAttributes({
              compounds_count: String(compoundsCount || 0),
            });
            console.log('[RevenueCat] compounds_count set:', compoundsCount);
            
            // Total doses logged (engagement depth)
            const { count: dosesCount } = await supabase
              .from('doses')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', userId)
              .eq('taken', true);
            
            await Purchases.setAttributes({
              total_doses_logged: String(dosesCount || 0),
            });
            console.log('[RevenueCat] total_doses_logged set:', dosesCount);
            
          } catch (engagementError) {
            console.warn('[RevenueCat] Could not set engagement attributes:', engagementError);
            // Don't fail the identify flow if engagement sync fails
          }
        } catch (enrichError) {
          console.warn('[RevenueCat] Failed to enrich user details:', enrichError);
          // Don't fail the whole identify flow if enrichment fails
        }

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
          let subType: 'monthly' | 'annual' | null = null;
          if (activeSubscriptions.some((s: string) => s.includes('annual'))) {
            subType = 'annual';
            setSubscriptionType('annual');
          } else if (activeSubscriptions.some((s: string) => s.includes('monthly'))) {
            subType = 'monthly';
            setSubscriptionType('monthly');
          }

          if (entitlement?.expirationDate) {
            setSubscriptionEndDate(entitlement.expirationDate);
            setTrialEndDate(isInTrial ? entitlement.expirationDate : null);
          }

          // 💾 Save to persistent cache
          await saveEntitlementToCache(userId, true, !!isInTrial, subType, entitlement?.expirationDate ?? null);

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
    [isNativePlatform, saveEntitlementToCache]
  );

  // Purchase a package (optionally with a promotional offer for partner codes)
  const purchasePackage = useCallback(async (
    packageToPurchase: PurchasesPackage, 
    promotionalOffer?: PromotionalOfferParams,
    googleSubscriptionOption?: any
  ): Promise<{ success: boolean; cancelled?: boolean; error?: string }> => {
    if (!isNativePlatform) {
      return { success: false, error: 'Purchases only available on native platforms' };
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Please sign in again to subscribe.' };
      }

      // 🔑 CRITICAL: Ensure RevenueCat is logged in as the current backend user BEFORE purchasing.
      // Otherwise purchases are attributed to $RCAnonymousID and entitlement checks will look empty after reload.
      if (!revenueCatConfiguredRef.current) {
        await initRevenueCat();
      }

      if (revenueCatConfiguredRef.current) {
        const needsIdentify =
          !revenueCatIdentifiedRef.current ||
          revenueCatAppUserIdRef.current !== user.id;

        if (needsIdentify) {
          console.log('[RevenueCat] purchasePackage: identifying user before purchase...', {
            currentAppUserId: revenueCatAppUserIdRef.current,
            targetUserId: user.id,
          });
          const current = await identifyRevenueCatUser(user.id);

          // If they're already pro, don't start another purchase flow.
          if (current.isPro) {
            console.log('[RevenueCat] purchasePackage: user already has entitlement, skipping purchase');
            return { success: true };
          }
        }
      } else {
        console.warn('[RevenueCat] purchasePackage: RevenueCat not configured; purchase may proceed as anonymous');
      }

      let customerInfo: CustomerInfo;

      // If a promotional offer is provided (partner codes), use purchaseDiscountedPackage
      if (promotionalOffer) {
        console.log('[RevenueCat] Purchasing package with promotional offer:', {
          package: packageToPurchase.identifier,
          offerIdentifier: promotionalOffer.offerIdentifier
        });
        
        // Create the promotional offer object for RevenueCat
        const promoOffer = {
          identifier: promotionalOffer.offerIdentifier,
          keyIdentifier: promotionalOffer.keyIdentifier,
          nonce: promotionalOffer.nonce,
          signature: promotionalOffer.signature,
          timestamp: promotionalOffer.timestamp
        };
        
        // Use purchaseDiscountedPackage for promotional offers
        const result = await Purchases.purchaseDiscountedPackage({ 
          aPackage: packageToPurchase,
          discount: promoOffer
        });
        customerInfo = result.customerInfo;
      } else if (googleSubscriptionOption && Capacitor.getPlatform() === 'android') {
        // Google Play developer-determined offer (partner promo codes)
        console.log('[RevenueCat] Purchasing with Google subscription option:', googleSubscriptionOption);
        const result = await Purchases.purchaseSubscriptionOption({ subscriptionOption: googleSubscriptionOption });
        customerInfo = result.customerInfo;
      } else {
        console.log('[RevenueCat] Purchasing package:', packageToPurchase);
        const result = await Purchases.purchasePackage({ aPackage: packageToPurchase });
        customerInfo = result.customerInfo;
      }
      
      setCustomerInfo(customerInfo);

      const isPro = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
      const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
      const isInTrial = isTrialPeriodType(entitlement?.periodType);

      // After a purchase, we can trust entitlements for this user.
      revenueCatIdentifiedRef.current = true;
      revenueCatAppUserIdRef.current = user.id;
      setRevenueCatIdentified(true);
      revenueCatEntitlementRef.current = { isPro, isTrialing: !!(isPro && isInTrial) };

      console.log('[RevenueCat] Purchase complete. isPro:', isPro, 'entitlements:', Object.keys(customerInfo.entitlements.active), 'appUserId:', revenueCatAppUserIdRef.current);

      if (isPro) {
        setIsSubscribed(true);
        setSubscriptionStatus(isInTrial ? 'trialing' : 'active', 'rc_purchase');
        setSubscriptionProvider('revenuecat');

        // Set subscription type based on package purchased
        let subType: 'monthly' | 'annual' | null = null;
        if (packageToPurchase.identifier === '$rc_annual' || packageToPurchase.product.identifier.includes('annual')) {
          subType = 'annual';
          setSubscriptionType('annual');
        } else {
          subType = 'monthly';
          setSubscriptionType('monthly');
        }

        if (entitlement?.expirationDate) {
          setSubscriptionEndDate(entitlement.expirationDate);
        }

        if (isInTrial && entitlement?.expirationDate) {
          setTrialEndDate(entitlement.expirationDate);
        }

        // 💾 Save to persistent cache
        await saveEntitlementToCache(user.id, true, !!isInTrial, subType, entitlement?.expirationDate ?? null);
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
  }, [isNativePlatform, initRevenueCat, identifyRevenueCatUser, saveEntitlementToCache]);

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

      if (isPro && user) {
        setIsSubscribed(true);
        setSubscriptionStatus(isInTrial ? 'trialing' : 'active', 'rc_restore');
        setSubscriptionProvider('revenuecat');

        // Determine subscription type from active subscriptions
        const activeSubscriptions = customerInfo.activeSubscriptions || [];
        let subType: 'monthly' | 'annual' | null = null;
        if (activeSubscriptions.some((s: string) => s.includes('annual'))) {
          subType = 'annual';
          setSubscriptionType('annual');
        } else if (activeSubscriptions.some((s: string) => s.includes('monthly'))) {
          subType = 'monthly';
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

        // 💾 Save to persistent cache
        await saveEntitlementToCache(user.id, true, !!isInTrial, subType, entitlement?.expirationDate ?? null);
      } else {
        // No active subscription found - clear cache after explicit restore attempt
        setIsSubscribed(false);
        setSubscriptionStatus('none', 'rc_restore_no_sub');
        await clearEntitlementCache();
      }

      return { success: true, isPro };
    } catch (error) {
      console.error('[RevenueCat] Restore error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Restore failed' };
    }
  }, [isNativePlatform, identifyRevenueCatUser, initRevenueCat, saveEntitlementToCache, clearEntitlementCache]);

  // Logout from RevenueCat
  const logoutRevenueCat = useCallback(async () => {
    if (!isNativePlatform || !revenueCatConfiguredRef.current) return;

    try {
      console.log('[RevenueCat] Logging out');
      await Purchases.logOut();
      setCustomerInfo(null);
      setRevenueCatIdentified(false);
      revenueCatIdentifiedRef.current = false;
      revenueCatAppUserIdRef.current = null;
      revenueCatEntitlementRef.current = null;
      // 🗑️ Clear persistent cache on logout
      await clearEntitlementCache();
    } catch (error) {
      console.error('[RevenueCat] Logout error:', error);
    }
  }, [isNativePlatform, clearEntitlementCache]);

  // Main initialization effect
  useEffect(() => {
    const initialize = async () => {
      try {
        // BOOT GATE: On native, wait for ProtectedRoute hydration to complete first
        // This prevents auth lock contention between SubscriptionContext and ProtectedRoute
        if (isNativePlatform && !(window as any).__authHydrationComplete) {
          console.log('[SubscriptionContext] Waiting for auth hydration to complete...');
          await new Promise<void>(resolve => {
            // Check if already complete
            if ((window as any).__authHydrationComplete) {
              resolve();
              return;
            }
            
            // Listen for hydration complete event
            const handler = () => {
              window.removeEventListener('regimen:hydration-complete', handler);
              resolve();
            };
            window.addEventListener('regimen:hydration-complete', handler);
            
            // Timeout after 5 seconds to avoid indefinite blocking
            setTimeout(() => {
              window.removeEventListener('regimen:hydration-complete', handler);
              console.log('[SubscriptionContext] Boot gate timeout - proceeding anyway');
              resolve();
            }, 5000);
          });
          console.log('[SubscriptionContext] Auth hydration complete, proceeding with init');
        }

        // On native, avoid awaiting a potentially hanging supabase.auth.getUser() during cold start.
        // Use cached session first + a timed fallback.
        const userId = isNativePlatform ? await getUserIdWithFallback(3000) : null;

        // On native: check persistent cache FIRST (survives webview reloads/screenshots)
        if (isNativePlatform) {
          if (userId) {
            // 📦 Try to restore from persistent cache immediately
            const cachedEntitlement = await loadEntitlementFromCache(userId);
            if (cachedEntitlement?.isPro) {
              console.log('[SubscriptionContext] 🚀 Restoring subscription from persistent cache on init');
              applyCachedEntitlement(cachedEntitlement, 'persistent_cache_init');
              setIsLoading(false);
              addDiagnosticsLog(
                'persistent_cache_init',
                'none',
                cachedEntitlement.isTrialing ? 'trialing' : 'active',
                'Restored from persistent cache'
              );

              // Continue to verify with RevenueCat in background (don't block UI)
              (async () => {
                await initRevenueCat();
                if (revenueCatConfiguredRef.current) {
                  await identifyRevenueCatUser(userId);
                }
              })();
              return; // Skip full refresh, cache is trusted
            }
          }

          // No valid cache, do normal init
          await initRevenueCat();

          if (userId && revenueCatConfiguredRef.current) {
            await identifyRevenueCatUser(userId);
          }
        }

        // Only refresh after RevenueCat is ready (on native) so we don't skip the RC check
        refreshSubscription('context_init');
      } catch (err) {
        console.error('[SubscriptionContext] Initialization failed:', err);
        // Never block the app indefinitely on subscription init.
        setIsLoading(false);
      }
    };

    initialize();

    // Listen for auth changes - FIRE-AND-FORGET pattern
    // CRITICAL: Never await async operations in onAuthStateChange to prevent auth lock contention
    // This allows ProtectedRoute's hydration to complete without being blocked by subscription refresh
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[SubscriptionContext] Auth event:', event);

      // Synchronous state update - safe in callback
      setUser(session?.user ?? null);

      if (session?.user) {
        // Clear any stale banner dismissal from previous user session
        if (event === 'SIGNED_IN') {
          sessionStorage.removeItem('dismissedBanner');
        }

        // DEFER all async work to next tick - prevents auth lock contention
        // This is the key fix: refreshSubscription is called AFTER the auth callback returns
        setTimeout(() => {
          console.log('[SubscriptionContext] (deferred) Session available, refreshing subscription...');
          
          // Native: ensure RevenueCat is initialized + user identified before refresh.
          // Wrapped in async IIFE since we can't await in setTimeout directly
          (async () => {
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
            
            refreshSubscription(`auth_${event.toLowerCase()}`);
          })();
        }, 0);
      } else {
        // Logged out - synchronous state reset (safe in callback)
        console.log('[SubscriptionContext] No session, resetting state');
        setIsSubscribed(false);
        setSubscriptionStatus('none', 'auth_logout');
        setSubscriptionProvider(null);
        setIsLoading(false);

        // Clear banner dismissal on logout so new users see the banner
        sessionStorage.removeItem('dismissedBanner');

        // Defer RevenueCat logout to avoid any potential lock issues
        if (isNativePlatform) {
          setTimeout(() => logoutRevenueCat(), 0);
        }
      }
    });

    // Listen for app resume to refresh subscription (important for returning from purchases)
    // Add 800ms delay to stagger with other resume handlers and let auth/theme settle first
    const SUBSCRIPTION_RESUME_DELAY_MS = 800;
    let appStateListener: { remove: () => void } | undefined;
    if (isNativePlatform) {
      CapacitorApp.addListener('appStateChange', async ({ isActive }) => {
        if (!isActive) return;

        // Staggered delay to prevent race conditions with auth, theme, and other resume handlers
        await new Promise(resolve => setTimeout(resolve, SUBSCRIPTION_RESUME_DELAY_MS));

        console.log('[SubscriptionContext] App resumed (after delay)...');
        addDiagnosticsLog('app_resume', subscriptionStatusRef.current, '...', 'App resumed from background');

          const userId = await getUserIdWithFallback(3000);
          if (userId) {
          // 📦 FIRST: Check persistent cache (survives webview reloads like screenshots)
            const persistedCache = await loadEntitlementFromCache(userId);
          if (persistedCache?.isPro) {
            console.log('[SubscriptionContext] 🛡️ App resumed - restoring from persistent cache');
            applyCachedEntitlement(persistedCache, 'app_resume_persistent_cache');
            setLastRefreshTrigger('app_resume_persistent_cache');
            addDiagnosticsLog('app_resume_persistent_cache', subscriptionStatusRef.current, persistedCache.isTrialing ? 'trialing' : 'active', 'Restored from persistent cache on resume');
            
            // Verify with RevenueCat in background (don't block)
            (async () => {
              if (!revenueCatConfiguredRef.current) {
                await initRevenueCat();
              }
              if (revenueCatConfiguredRef.current) {
                  await identifyRevenueCatUser(userId);
              }
            })();
            return;
          }

          // Ensure RC init even if resume happens very early
          if (!revenueCatConfiguredRef.current) {
            await initRevenueCat();
          }

          if (revenueCatConfiguredRef.current) {
            // Screenshot on iOS can cause a very quick background/foreground toggle.
            // If we already had an active entitlement in-memory, keep it stable and don't re-log-in.
            const cached = revenueCatEntitlementRef.current;
            if (cached?.isPro) {
              revenueCatNegativeStreakRef.current = 0;
              setIsSubscribed(true);
              setSubscriptionStatus(cached.isTrialing ? 'trialing' : 'active', 'app_resume_rc_cached');
              setSubscriptionProvider('revenuecat');
              setLastRefreshTrigger('app_resume_rc_cached');
              return;
            }

            const needsIdentify =
              !revenueCatIdentifiedRef.current ||
                revenueCatAppUserIdRef.current !== userId;

            let isPro = false;
            let isTrialing = false;

            if (needsIdentify) {
                const result = await identifyRevenueCatUser(userId);
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
              revenueCatNegativeStreakRef.current = 0;
              console.log('[SubscriptionContext] App resumed - RevenueCat confirms subscription, updating state from RC');
              setIsSubscribed(true);
              setSubscriptionStatus(isTrialing ? 'trialing' : 'active', needsIdentify ? 'app_resume_rc_confirm' : 'app_resume_rc_info');
              setSubscriptionProvider('revenuecat');
              setLastRefreshTrigger(needsIdentify ? 'app_resume_rc_confirm' : 'app_resume_rc_info');
              return;
            }

            // If we were already showing active/trialing, treat a single “not pro” on resume as transient
            // (this is the screenshot bug pattern). Only allow falling through after 2 consecutive negatives.
            const prevStatus = subscriptionStatusRef.current;
            if (prevStatus === 'active' || prevStatus === 'trialing') {
              revenueCatNegativeStreakRef.current = Math.min(revenueCatNegativeStreakRef.current + 1, 3);
              if (revenueCatNegativeStreakRef.current < 2) {
                console.log('[SubscriptionContext] App resumed - transient RevenueCat miss, keeping existing status and skipping refresh');
                addDiagnosticsLog('app_resume_keep_active', prevStatus, prevStatus, `rcNegativeStreak=${revenueCatNegativeStreakRef.current}`);
                setLastRefreshTrigger('app_resume_keep_active');
                return;
              }
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
        canEditCompound,
        markPreviewCompoundAdded,
        getCompoundCount,
        setMockState,
        // RevenueCat
        offerings,
        purchasePackage,
        restorePurchases,
        isNativePlatform,
        subscriptionProvider,
        // Free compound gating
        freeCompoundId,
        isFreeCompound,
        refreshFreeCompound,
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
