import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useWeeklyDigest } from "@/hooks/useWeeklyDigest";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useAppStateSync } from "@/hooks/useAppStateSync";
import { WeeklyDigestModal } from "@/components/WeeklyDigestModalCalendar";
import { SubscriptionProvider, useSubscription } from "@/contexts/SubscriptionContext";
import { SubscriptionBanners } from "@/components/subscription/SubscriptionBanners";
import { DevSubscriptionToggle } from "@/components/DevSubscriptionToggle";
import { Onboarding } from "./components/Onboarding";
import { TodayScreen } from "./components/TodayScreen";
import { AddCompoundScreen } from "./components/AddCompoundScreen";
import { MyStackScreen } from "./components/MyStackScreen";
import { ProgressScreen } from "./components/ProgressScreen";
import { InsightsScreen } from "./components/InsightsScreenComplex";
import { SettingsScreen } from "./components/SettingsScreen";
import PhotoCompareScreen from "./components/PhotoCompareScreen";
import { AccountSettings } from "./components/settings/AccountSettings";
import { NotificationsSettings } from "./components/settings/NotificationsSettings";
import { DisplaySettings } from "./components/settings/DisplaySettings";
import { DataSettings } from "./components/settings/DataSettings";
import { HelpSettings } from "./components/settings/HelpSettings";
import { TermsSettings } from "./components/settings/TermsSettings";
import { PrivacySettings } from "./components/settings/PrivacySettings";
import { HealthSyncSettings } from "./components/settings/HealthSyncSettings";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { SubscriptionTest } from "./pages/SubscriptionTest";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Splash from "./pages/Splash";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  const { isOpen, weekData, closeDigest } = useWeeklyDigest();
  const { setMockState, subscriptionStatus } = useSubscription();

  return (
    <>
      <AnalyticsWrapper />
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <SubscriptionBanners subscriptionStatus={subscriptionStatus} />
        <DevSubscriptionToggle onMockStateChange={setMockState} />
        {isOpen && weekData && (
          <WeeklyDigestModal open={isOpen} onClose={closeDigest} weekData={weekData} />
        )}
        <Routes>
            <Route path="/" element={<Splash />} />
            <Route path="/landing" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
            <Route path="/today" element={<ProtectedRoute><TodayScreen /></ProtectedRoute>} />
            <Route path="/add-compound" element={<ProtectedRoute><AddCompoundScreen /></ProtectedRoute>} />
            <Route path="/stack" element={<ProtectedRoute><MyStackScreen /></ProtectedRoute>} />
            <Route path="/progress" element={<ProtectedRoute><ProgressScreen /></ProtectedRoute>} />
            <Route path="/progress/insights" element={<ProtectedRoute><InsightsScreen /></ProtectedRoute>} />
            <Route path="/progress/compare" element={<ProtectedRoute><PhotoCompareScreen /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsScreen /></ProtectedRoute>} />
            <Route path="/settings/account" element={<ProtectedRoute><AccountSettings /></ProtectedRoute>} />
            <Route path="/settings/notifications" element={<ProtectedRoute><NotificationsSettings /></ProtectedRoute>} />
            <Route path="/settings/health-sync" element={<ProtectedRoute><HealthSyncSettings /></ProtectedRoute>} />
            <Route path="/settings/display" element={<ProtectedRoute><DisplaySettings /></ProtectedRoute>} />
            <Route path="/settings/data" element={<ProtectedRoute><DataSettings /></ProtectedRoute>} />
            <Route path="/settings/help" element={<ProtectedRoute><HelpSettings /></ProtectedRoute>} />
            <Route path="/settings/terms" element={<ProtectedRoute><TermsSettings /></ProtectedRoute>} />
            <Route path="/settings/privacy" element={<ProtectedRoute><PrivacySettings /></ProtectedRoute>} />
            <Route path="/test-subscription" element={<ProtectedRoute><SubscriptionTest /></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
    </>
  );
};

const App = () => {
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
  return null;
};

export default App;
