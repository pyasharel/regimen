import { useSubscription } from "@/contexts/SubscriptionContext";
import { usePaywall } from "@/contexts/PaywallContext";
import { X, AlertCircle, Info } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PreviewModeBanner } from "@/components/PreviewModeBanner";
import { useLocation } from "react-router-dom";
import { getUserIdWithFallback } from "@/utils/safeAuth";
import { Preferences } from "@capacitor/preferences";

interface SubscriptionBannersProps {
  subscriptionStatus: string;
  onUpgrade: () => void;
}

export const SubscriptionBanners = ({ subscriptionStatus, onUpgrade }: SubscriptionBannersProps) => {
  // Use centralized paywall state so ANY paywall (not just global) hides the banner
  const { isPaywallOpen } = usePaywall();
  // CRITICAL: All hooks must be called BEFORE any conditional returns
  const location = useLocation();
  const { subscriptionEndDate, isLoading, freeCompoundId } = useSubscription();
  const [compoundCount, setCompoundCount] = useState(0);
  const [freeCompoundName, setFreeCompoundName] = useState<string | undefined>();
  const [isMountReady, setIsMountReady] = useState(false);
  // Keep banner suppressed until native storage check resolves (async)
  const [nativePaidStatusChecked, setNativePaidStatusChecked] = useState(false);
  const [dismissed, setDismissed] = useState<string | null>(() => {
    const stored = localStorage.getItem('bannerDismissedUntil');
    if (stored) {
      try {
        const { banner, until } = JSON.parse(stored);
        if (until && Date.now() < until) return banner;
        localStorage.removeItem('bannerDismissedUntil');
      } catch {
        localStorage.removeItem('bannerDismissedUntil');
      }
    }
    return null;
  });

  // CRITICAL: Use Capacitor Preferences (native SharedPreferences on Android) — NOT localStorage.
  // Android WebView wipes localStorage under memory pressure between app sessions.
  // Capacitor Preferences survives process kills and is the only reliable persistent storage.
  const NATIVE_PAID_KEY = 'confirmedPaidStatusUntil';
  const hasSeenPaidStatus = useRef<boolean>(false);

  // On mount: async read from native storage. Keep banner suppressed until resolved.
  useEffect(() => {
    const checkNativeStorage = async () => {
      try {
        const { value } = await Preferences.get({ key: NATIVE_PAID_KEY });
        if (value && Date.now() < parseInt(value, 10)) {
          console.log('[BannerGuard v5] ✅ Native storage: confirmed paid — suppressing banner immediately');
          hasSeenPaidStatus.current = true;
        } else {
          if (value) await Preferences.remove({ key: NATIVE_PAID_KEY });
          console.log('[BannerGuard v5] Native storage: no valid paid flag found');
        }
      } catch (e) {
        console.warn('[BannerGuard v5] Native storage read failed (non-native env?):', e);
      } finally {
        setNativePaidStatusChecked(true);
      }
    };
    checkNativeStorage();
  }, []);

  // Fallback timer: if subscription still hasn't resolved, show banner after 3500ms
  useEffect(() => {
    const timer = setTimeout(() => setIsMountReady(true), 3500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const paidStatuses = ['active', 'trialing', 'lifetime'];
    const definitiveStatuses = [...paidStatuses, 'past_due', 'canceled'];
    
    console.log(`[BannerGuard v5] status="${subscriptionStatus}" isLoading=${isLoading} isPaid=${paidStatuses.includes(subscriptionStatus)} nativeChecked=${nativePaidStatusChecked} hasSeenPaid=${hasSeenPaidStatus.current}`);
    
    if (!isLoading && paidStatuses.includes(subscriptionStatus)) {
      console.log('[BannerGuard v5] Paid confirmed — writing to Capacitor Preferences (survives Android kills)');
      hasSeenPaidStatus.current = true;
      try { 
        const expiry = String(Date.now() + 7 * 24 * 60 * 60 * 1000);
        // Write to BOTH for redundancy: native survives kills, localStorage for fast sync reads
        Preferences.set({ key: NATIVE_PAID_KEY, value: expiry });
        localStorage.setItem(NATIVE_PAID_KEY, expiry);
      } catch {}
    }
    
    if (!isLoading && definitiveStatuses.includes(subscriptionStatus)) {
      console.log('[BannerGuard v4] Early unlock via definitive status:', subscriptionStatus);
      setIsMountReady(true);
    }
  }, [subscriptionStatus, isLoading]);

  // Fetch compound count and oldest compound name for contextual banner
  useEffect(() => {
    const fetchCompoundData = async () => {
      if (subscriptionStatus !== 'preview' && subscriptionStatus !== 'none') return;
      const userId = await getUserIdWithFallback(3000);
      if (!userId) return;
      try {
        const { data } = await supabase
          .from('compounds')
          .select('name')
          .eq('user_id', userId)
          .eq('is_active', true)
          .order('created_at', { ascending: true });
        setCompoundCount(data?.length ?? 0);
        if (data && data.length > 0) {
          setFreeCompoundName(data[0].name);
        } else {
          setFreeCompoundName(undefined);
        }
      } catch (e) {
        console.warn('[SubscriptionBanners] Failed to fetch compounds:', e);
      }
    };
    fetchCompoundData();
  }, [subscriptionStatus, freeCompoundId]);

  // Don't show any banners on auth, onboarding, or landing pages
  const hideOnRoutes = ['/', '/auth', '/landing', '/onboarding'];
  const isHiddenRoute = hideOnRoutes.includes(location.pathname);

  const shouldShowPastDue = subscriptionStatus === 'past_due' && dismissed !== 'past_due';
  const shouldShowCanceled = subscriptionStatus === 'canceled' && !!subscriptionEndDate && dismissed !== 'canceled';
  const shouldShowPreview = isMountReady && nativePaidStatusChecked && !isLoading && !hasSeenPaidStatus.current && (subscriptionStatus === 'preview' || subscriptionStatus === 'none') && dismissed !== 'preview';

  const shouldReserveBannerSpace = !isPaywallOpen && !isHiddenRoute && (shouldShowPastDue || shouldShowCanceled || shouldShowPreview);

  // Expose a single source of truth for screen top padding (fixed screens use .app-top-padding)
  useEffect(() => {
    const root = document.documentElement;
    const bannerHeight = 'calc(56px + env(safe-area-inset-top, 0px))';
    root.style.setProperty('--app-banner-height', shouldReserveBannerSpace ? bannerHeight : '0px');
    return () => root.style.setProperty('--app-banner-height', '0px');
  }, [shouldReserveBannerSpace]);

  if (isHiddenRoute) {
    return null;
  }

  // Don't show any banner when paywall is open - it's redundant and would overlap
  if (isPaywallOpen) {
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

  if (shouldShowPastDue) {
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
      <div className="fixed top-0 left-0 right-0 z-[100]">
        <div className="safe-top">
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
        </div>
      </div>
    );
  }

  if (shouldShowCanceled) {
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
        <div className="fixed top-0 left-0 right-0 z-[100]">
          <div className="safe-top">
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
          </div>
        </div>
      );
    }
  }

  if (shouldShowPreview) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[100]">
        <PreviewModeBanner
          onUpgrade={onUpgrade}
          onDismiss={() => {
            const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
            localStorage.setItem('bannerDismissedUntil', JSON.stringify({
              banner: 'preview',
              until: Date.now() + THREE_DAYS_MS
            }));
            setDismissed('preview');
          }}
          compoundCount={compoundCount}
          freeCompoundName={freeCompoundName}
        />
      </div>
    );
  }

  return null;
};
