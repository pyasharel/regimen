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
import { SubscriptionBanners } from "@/components/subscription/SubscriptionBanners";
import { SubscriptionPaywall } from "@/components/SubscriptionPaywall";
import { useState, useEffect } from "react";
import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { toast } from "sonner";
import { persistentStorage, PERSISTENT_STORAGE_KEYS } from "@/utils/persistentStorage";
import { Onboarding } from "./components/Onboarding";
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

const AppContent = () => {
  const { isOpen, weekData, closeDigest } = useWeeklyDigest();
  const { setMockState, subscriptionStatus } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);

  return (
    <>
      <AnalyticsWrapper />
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <SubscriptionBanners 
          subscriptionStatus={subscriptionStatus}
          onUpgrade={() => setShowPaywall(true)}
        />
        {isOpen && weekData && (
          <WeeklyDigestModal open={isOpen} onClose={closeDigest} weekData={weekData} />
        )}
        <Routes>
            <Route path="/" element={<Splash />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/checkout/success" element={<CheckoutSuccess />} />
            <Route path="/checkout/cancel" element={<CheckoutCancel />} />
            <Route path="/today" element={<ProtectedRoute><TodayScreen /></ProtectedRoute>} />
            <Route path="/add-compound" element={<ProtectedRoute><AddCompoundScreen /></ProtectedRoute>} />
            <Route path="/stack" element={<ProtectedRoute><MyStackScreen /></ProtectedRoute>} />
            <Route path="/stack/:id" element={<ProtectedRoute><CompoundDetailScreen /></ProtectedRoute>} />
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
        
        <SubscriptionPaywall 
          open={showPaywall}
          onOpenChange={setShowPaywall}
        />
    </>
  );
};

const App = () => {
  // Migrate localStorage to Capacitor Preferences on app start
  useEffect(() => {
    persistentStorage.migrateFromLocalStorage(PERSISTENT_STORAGE_KEYS);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SubscriptionProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
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

        if (url.includes('/checkout/success')) {
          checkoutAction = 'success';
          // Extract session_id if present
          const urlObj = new URL(url);
          sessionId = urlObj.searchParams.get('session_id');
        } else if (url.includes('/checkout/cancel')) {
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
            
            // Give Stripe a moment to finalize the subscription
            setTimeout(async () => {
              await refreshSubscription();
              navigate('/today');
            }, 1500);
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
