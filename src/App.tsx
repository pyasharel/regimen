import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Onboarding } from "./components/Onboarding";
import { TodayScreen } from "./components/TodayScreen";
import { AddCompoundScreen } from "./components/AddCompoundScreen";
import { MyStackScreen } from "./components/MyStackScreen";
import { SettingsScreen } from "./components/SettingsScreen";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Onboarding />} />
          <Route path="/today" element={<TodayScreen />} />
          <Route path="/add-compound" element={<AddCompoundScreen />} />
          <Route path="/stack" element={<MyStackScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
