import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { useWeeklyDigest } from "@/hooks/useWeeklyDigest";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useAppStateSync } from "@/hooks/useAppStateSync";
import { WeeklyDigestModal } from "@/components/WeeklyDigestModalCalendar";
import { SubscriptionProvider, useSubscription } from "@/contexts/SubscriptionContext";
import { PaywallProvider, usePaywall } from "@/contexts/PaywallContext";
import { SubscriptionBanners } from "@/components/subscription/SubscriptionBanners";
import { SubscriptionPaywall } from "@/components/SubscriptionPaywall";
import { useState, useEffect, useRef } from "react";
import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { SplashScreen } from '@capacitor/splash-screen';
import { toast } from "sonner";
import { persistentStorage, PERSISTENT_STORAGE_KEYS } from "@/utils/persistentStorage";
import { Onboarding } from "./components/Onboarding";
import { OnboardingFlow } from "./components/onboarding/OnboardingFlow";
import { TodayScreen } from "./components/TodayScreen";
import { AddCompoundScreen } from "./components/AddCompoundScreen";
import { MyStackScreen } from "./components/MyStackScreen";
import { ProgressScreen } from "./components/ProgressScreen";
import { SettingsScreen } from "./components/SettingsScreen";
import PhotoCompareScreen from "./components/PhotoCompareScreen";
import { AccountSettings } from "./components/settings/AccountSettings";
import { NotificationsSettings } from "./components/settings/NotificationsSettings";
import { DisplaySettings } from "./components/settings/DisplaySettings";
import { DataSettings } from "./components/settings/DataSettings";
import { HelpSettings } from "./components/settings/HelpSettings";
import { TermsSettings } from "./components/settings/TermsSettings";
import { PrivacySettings } from "./components/settings/PrivacySettings";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { SubscriptionTest } from "./pages/SubscriptionTest";
import { CompoundDetailScreen } from "./components/CompoundDetailScreen";
import { CompoundDetailScreenV2 } from "./components/CompoundDetailScreenV2";
import Auth from "./pages/Auth";
import Splash from "./pages/Splash";
import NotFound from "./pages/NotFound";
import EmailTest from "./pages/EmailTest";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import WidgetPreview from "./pages/WidgetPreview";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import CheckoutCancel from "./pages/CheckoutCancel";

const queryClient = new QueryClient();

// AppContent component - must be rendered inside SubscriptionProvider AND PaywallProvider
const AppContent = () => {
  const { isOpen, weekData, closeDigest } = useWeeklyDigest();
  const { setMockState, subscriptionStatus } = useSubscription();
  const { openPaywall, isPaywallOpen, setPaywallOpen, paywallMessage, closePaywall } = usePaywall();

  return (
    <>
      <AnalyticsWrapper />
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <SubscriptionBanners 
          subscriptionStatus={subscriptionStatus}
          onUpgrade={() => openPaywall()}
        />
        {isOpen && weekData && (
          <WeeklyDigestModal open={isOpen} onClose={closeDigest} weekData={weekData} />
        )}
        <Routes>
            <Route path="/" element={<Splash />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={<OnboardingFlow />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/checkout/success" element={<CheckoutSuccess />} />
            <Route path="/checkout/cancel" element={<CheckoutCancel />} />
            <Route path="/today" element={<ProtectedRoute><TodayScreen /></ProtectedRoute>} />
            <Route path="/add-compound" element={<ProtectedRoute><AddCompoundScreen /></ProtectedRoute>} />
            <Route path="/stack" element={<ProtectedRoute><MyStackScreen /></ProtectedRoute>} />
            <Route path="/stack/:id" element={<ProtectedRoute><CompoundDetailScreen /></ProtectedRoute>} />
            <Route path="/stack-v2/:id" element={<ProtectedRoute><CompoundDetailScreenV2 /></ProtectedRoute>} />
            <Route path="/progress" element={<ProtectedRoute><ProgressScreen /></ProtectedRoute>} />
            <Route path="/progress/compare" element={<ProtectedRoute><PhotoCompareScreen /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsScreen /></ProtectedRoute>} />
            <Route path="/settings/account" element={<ProtectedRoute><AccountSettings /></ProtectedRoute>} />
            <Route path="/settings/notifications" element={<ProtectedRoute><NotificationsSettings /></ProtectedRoute>} />
            <Route path="/settings/display" element={<ProtectedRoute><DisplaySettings /></ProtectedRoute>} />
            <Route path="/settings/data" element={<ProtectedRoute><DataSettings /></ProtectedRoute>} />
            <Route path="/settings/help" element={<ProtectedRoute><HelpSettings /></ProtectedRoute>} />
            <Route path="/settings/terms" element={<ProtectedRoute><TermsSettings /></ProtectedRoute>} />
            <Route path="/settings/privacy" element={<ProtectedRoute><PrivacySettings /></ProtectedRoute>} />
            <Route path="/test-subscription" element={<ProtectedRoute><SubscriptionTest /></ProtectedRoute>} />
            <Route path="/email-test" element={<ProtectedRoute><EmailTest /></ProtectedRoute>} />
            <Route path="/widget-preview" element={<WidgetPreview />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
        
        {/* SINGLE GLOBAL PAYWALL - all screens use context to open this */}
        <SubscriptionPaywall 
          open={isPaywallOpen}
          onOpenChange={setPaywallOpen}
          onDismiss={closePaywall}
          message={paywallMessage}
        />
    </>
  );
};

const App = () => {
  const splashHidden = useRef(false);

  // Hide native splash screen once React is ready
  useEffect(() => {
    if (splashHidden.current) return;
    splashHidden.current = true;
    
    // Small delay to ensure first paint, then hide native splash
    requestAnimationFrame(() => {
      SplashScreen.hide().catch(() => {
        // Ignore errors on web where SplashScreen isn't available
      });
    });
  }, []);

  // Migrate localStorage to Capacitor Preferences on app start
  useEffect(() => {
    persistentStorage.migrateFromLocalStorage(PERSISTENT_STORAGE_KEYS);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SubscriptionProvider>
        <PaywallProvider>
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </PaywallProvider>
      </SubscriptionProvider>
    </QueryClientProvider>
  );
};

// Wrapper component to use hooks inside BrowserRouter
const AnalyticsWrapper = () => {
  useAnalytics();
  useAppStateSync(); // Auto-sync notifications when app resumes
  const navigate = useNavigate();
  const { refreshSubscription } = useSubscription();

  useEffect(() => {
    let listener: any;

    // Handle deep links from Stripe checkout
    const setupListener = async () => {
      listener = await CapacitorApp.addListener('appUrlOpen', async (event) => {
        const url = event.url;
        console.log('[DEEP-LINK] Received URL:', url);

        // Handle both universal links (https://getregimen.app/...) and custom scheme (regimen://...)
        let checkoutAction = null;
        let sessionId = null;

        if (url.includes('/checkout/success') || url.includes('checkout/success')) {
          checkoutAction = 'success';
          // Extract session_id if present
          try {
            const urlObj = new URL(url);
            sessionId = urlObj.searchParams.get('session_id');
          } catch (e) {
            console.warn('[DEEP-LINK] Could not parse URL for session_id', e);
          }
        } else if (url.includes('/checkout/cancel') || url.includes('checkout/cancel')) {
          checkoutAction = 'cancel';
        }

        // Handle checkout redirects
        if (checkoutAction) {
          console.log('[DEEP-LINK] Checkout action:', checkoutAction, 'Session ID:', sessionId);

          if (checkoutAction === 'success') {
            // Close the Stripe browser and return to the app UI
            try {
              await Browser.close();
            } catch (e) {
              console.warn('[DEEP-LINK] Failed to close Browser', e);
            }

            // Refresh subscription status after successful checkout
            toast.success('Payment successful! Activating subscription...');
            
            // Poll for subscription activation - Stripe webhooks may take a few seconds
            const pollSubscription = async (attempts = 0): Promise<void> => {
              console.log(`[DEEP-LINK] Polling subscription status, attempt ${attempts + 1}`);
              await refreshSubscription('deep_link_poll');
              
              // Check if subscription is now active
              // Give it up to 10 attempts (10 seconds total)
              if (attempts < 10) {
                setTimeout(() => pollSubscription(attempts + 1), 1000);
              } else {
                console.log('[DEEP-LINK] Finished polling, navigating to /today');
                navigate('/today');
              }
            };
            
            // Start polling after a brief delay for Stripe to process
            setTimeout(() => pollSubscription(), 2000);
          } else if (checkoutAction === 'cancel') {
            try {
              await Browser.close();
            } catch (e) {
              console.warn('[DEEP-LINK] Failed to close Browser on cancel', e);
            }

            toast.info('Checkout cancelled');
            navigate('/today');
          }
        }
      });
    };

    setupListener();

    return () => {
      if (listener) {
        listener.remove();
      }
    };
  }, [navigate, refreshSubscription]);

  return null;
};

export default App;
