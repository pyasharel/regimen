import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Sparkles, User, Bell, Palette, BarChart3, Download, HelpCircle, LogOut, Moon, Sun, Laptop } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomNavigation } from "@/components/BottomNavigation";
import { useTheme } from "@/components/ThemeProvider";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const SettingsScreen = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [showThemeDialog, setShowThemeDialog] = useState(false);
  
  // TODO: Replace with actual premium status check
  const isPremium = false;

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Failed to sign out");
    } else {
      toast.success("Signed out successfully");
      navigate("/auth");
    }
  };

  const settingsSections = [
    {
      icon: User,
      label: "Account",
      description: "Email, password, delete account",
      onClick: () => navigate("/settings/account"),
    },
    {
      icon: Palette,
      label: "Display",
      description: "Theme and measurement units",
      onClick: () => navigate("/settings/display"),
    },
    {
      icon: Download,
      label: "Data",
      description: "Export or clear your data",
      onClick: () => navigate("/settings/data"),
    },
    {
      icon: HelpCircle,
      label: "Help & Support",
      description: "FAQ and contact support",
      onClick: () => navigate("/settings/help"),
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/95 backdrop-blur-sm px-4 py-4">
        <button onClick={() => navigate("/today")} className="rounded-lg p-2 hover:bg-muted transition-colors">
          <X className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold">Settings</h1>
        <div className="w-9" /> {/* Spacer */}
      </header>

      <div className="p-4 space-y-4">
        {/* Premium Banner - Only show if user is NOT premium */}
        {!isPremium && (
          <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-secondary p-6 shadow-[var(--shadow-premium)]">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white">Unlock Premium</h2>
                <ul className="mt-3 space-y-2 text-sm text-white/90">
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-white" />
                    Custom notification times
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-white" />
                    Advanced scheduling
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-white" />
                    AI photo analysis
                  </li>
                </ul>
                <Button 
                  variant="secondary" 
                  className="mt-4 bg-white text-primary hover:bg-white/90"
                  size="sm"
                >
                  Start 14-Day Free Trial
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Settings List */}
        <div className="space-y-2">
          {settingsSections.map((section) => (
            <button
              key={section.label}
              onClick={section.onClick}
              className="w-full rounded-xl border border-border bg-card p-4 text-left transition-all hover:bg-card/80 hover:shadow-lg"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <section.icon className="h-5 w-5 text-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{section.label}</h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">{section.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Sign Out Button */}
        <Button 
          onClick={handleSignOut}
          variant="ghost" 
          className="w-full text-destructive hover:text-destructive/80 gap-2"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>

      <BottomNavigation />

      {/* Theme Dialog */}
      <Dialog open={showThemeDialog} onOpenChange={setShowThemeDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Choose Theme</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 pt-4">
            <button
              onClick={() => {
                setTheme("light");
                setShowThemeDialog(false);
              }}
              className={`w-full rounded-lg border p-4 text-left transition-all hover:bg-muted ${
                theme === "light" ? "border-primary bg-primary/10" : "border-border"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <Sun className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold">Light</div>
                  <div className="text-xs text-muted-foreground">Bright and clean</div>
                </div>
              </div>
            </button>

            <button
              onClick={() => {
                setTheme("dark");
                setShowThemeDialog(false);
              }}
              className={`w-full rounded-lg border p-4 text-left transition-all hover:bg-muted ${
                theme === "dark" ? "border-primary bg-primary/10" : "border-border"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <Moon className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold">Dark</div>
                  <div className="text-xs text-muted-foreground">Easy on the eyes</div>
                </div>
              </div>
            </button>

            <button
              onClick={() => {
                setTheme("system");
                setShowThemeDialog(false);
              }}
              className={`w-full rounded-lg border p-4 text-left transition-all hover:bg-muted ${
                theme === "system" ? "border-primary bg-primary/10" : "border-border"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <Laptop className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold">System</div>
                  <div className="text-xs text-muted-foreground">Match device settings</div>
                </div>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
