import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, Sparkles, User, Palette, Download, Trash2, HelpCircle, LogOut, Scale, FileText, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomNavigation } from "@/components/BottomNavigation";
import { useTheme } from "@/components/ThemeProvider";
import { PremiumModal } from "@/components/PremiumModal";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const SettingsScreen = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [weightUnit, setWeightUnit] = useState<"lbs" | "kg">("lbs");
  
  // Test mode toggle for premium features
  const [testPremium, setTestPremium] = useState(false);
  const isPremium = testPremium; // In production, this would check actual subscription status

  // Load premium status from localStorage on mount
  useEffect(() => {
    const savedPremium = localStorage.getItem('testPremiumMode') === 'true';
    setTestPremium(savedPremium);
  }, []);

  const togglePremium = (checked: boolean) => {
    setTestPremium(checked);
    localStorage.setItem('testPremiumMode', String(checked));
    // Trigger storage event for other components
    window.dispatchEvent(new Event('storage'));
    toast.success(checked ? 'Premium mode enabled' : 'Premium mode disabled');
  };

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
      icon: Scale,
      label: "Measurement Units",
      description: weightUnit === "lbs" ? "Pounds (lbs)" : "Kilograms (kg)",
      onClick: () => {}, // Inline toggle handled in render
      isInline: true,
    },
    {
      icon: Palette,
      label: "Theme",
      description: theme === "light" ? "Light" : theme === "dark" ? "Dark" : "System",
      onClick: () => {}, // Inline selection handled in render
      isInline: true,
    },
    {
      icon: Download,
      label: "Data",
      description: "Export or clear your data",
      onClick: () => navigate("/settings/data"),
    },
    {
      icon: FileText,
      label: "Terms of Service",
      description: "Legal terms and conditions",
      onClick: () => navigate("/settings/terms"),
    },
    {
      icon: Lock,
      label: "Privacy Policy",
      description: "How we protect your data",
      onClick: () => navigate("/settings/privacy"),
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

      <div className="p-4 space-y-6 max-w-2xl mx-auto">
        {/* Test Mode Toggle - For Beta Testing */}
        <div className="p-4 rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="test-premium" className="font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Test Premium Mode
              </Label>
              <p className="text-sm text-muted-foreground">Enable premium features for testing</p>
            </div>
            <Switch
              id="test-premium"
              checked={testPremium}
              onCheckedChange={togglePremium}
            />
          </div>
        </div>

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
                  onClick={() => setShowPremiumModal(true)}
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
        <div className="space-y-3">
          {settingsSections.map((section) => (
            <div key={section.label}>
              {section.isInline && section.label === "Measurement Units" ? (
                <div className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
                  <div className="flex items-start gap-4 mb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <section.icon className="h-5 w-5 text-foreground" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{section.label}</h3>
                      <p className="text-sm text-muted-foreground">Your preferred units for weight tracking</p>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-14">
                    <button
                      onClick={() => setWeightUnit("lbs")}
                      className={`flex-1 rounded-lg border p-3 text-center text-sm font-medium transition-all ${
                        weightUnit === "lbs" ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
                      }`}
                    >
                      Pounds
                    </button>
                    <button
                      onClick={() => setWeightUnit("kg")}
                      className={`flex-1 rounded-lg border p-3 text-center text-sm font-medium transition-all ${
                        weightUnit === "kg" ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
                      }`}
                    >
                      Kilograms
                    </button>
                  </div>
                </div>
              ) : section.isInline && section.label === "Theme" ? (
                <div className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
                  <div className="flex items-start gap-4 mb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <section.icon className="h-5 w-5 text-foreground" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{section.label}</h3>
                      <p className="text-sm text-muted-foreground">Choose your preferred theme</p>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-14">
                    <button
                      onClick={() => setTheme("light")}
                      className={`flex-1 rounded-lg border p-3 text-center text-sm font-medium transition-all ${
                        theme === "light" ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
                      }`}
                    >
                      Light
                    </button>
                    <button
                      onClick={() => setTheme("dark")}
                      className={`flex-1 rounded-lg border p-3 text-center text-sm font-medium transition-all ${
                        theme === "dark" ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
                      }`}
                    >
                      Dark
                    </button>
                    <button
                      onClick={() => setTheme("system")}
                      className={`flex-1 rounded-lg border p-3 text-center text-sm font-medium transition-all ${
                        theme === "system" ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
                      }`}
                    >
                      System
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={section.onClick}
                  className="w-full rounded-xl border border-border bg-card p-4 text-left transition-all hover:shadow-[var(--shadow-elevated)] shadow-[var(--shadow-card)]"
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
              )}
            </div>
          ))}
        </div>

        {/* Sign Out Button */}
        <Button 
          onClick={handleSignOut}
          variant="ghost" 
          className="w-full text-destructive hover:text-destructive/80 hover:bg-destructive/10 gap-2"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>

      <BottomNavigation />
      
      <PremiumModal open={showPremiumModal} onOpenChange={setShowPremiumModal} />
    </div>
  );
};
