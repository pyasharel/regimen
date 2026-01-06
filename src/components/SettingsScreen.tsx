import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { User, Palette, Download, HelpCircle, LogOut, FileText, Lock, MessageSquare, Volume2, Bell, Ruler } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomNavigation } from "@/components/BottomNavigation";
import { useTheme } from "@/components/ThemeProvider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Capacitor } from '@capacitor/core';
import { useQueryClient } from "@tanstack/react-query";
import { SettingsSubscriptionSection } from "@/components/subscription/SettingsSubscriptionSection";
import { MainHeader } from "@/components/MainHeader";
import { SubscriptionDiagnostics } from "@/components/subscription/SubscriptionDiagnostics";

// Version info - pulled from central config
import { appVersion, appBuild } from '../../capacitor.config';

export const SettingsScreen = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const savedSound = localStorage.getItem('soundEnabled');
    setSoundEnabled(savedSound !== 'false');
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_url, full_name')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profile) {
        setAvatarUrl(profile.avatar_url);
        setUserName(profile.full_name || user.email?.split('@')[0] || 'User');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await queryClient.clear();

      // Clear onboarding state so fresh users get clean experience
      localStorage.removeItem('regimen_onboarding_state');

      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      toast.success("Signed out successfully");
      navigate("/auth", { replace: true });
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error("Failed to sign out");
    }
  };

  const handleResetOnboarding = () => {
    try {
      localStorage.removeItem('regimen_onboarding_state');
      toast.success('Onboarding reset');
      navigate('/onboarding', { replace: true });
    } catch (error) {
      console.error('Reset onboarding error:', error);
      toast.error('Failed to reset onboarding');
    }
  };

  const toggleSound = (checked: boolean) => {
    setSoundEnabled(checked);
    localStorage.setItem('soundEnabled', String(checked));
  };

  const handleSendFeedback = () => {
    const email = "support@helloregimen.com";
    const subject = "Feedback & Feature Requests - Regimen App";
    const body = "Hi there,\n\nI'd like to share feedback about the Regimen app:\n\n";
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const settingsSections = [
    {
      icon: User,
      label: "Account",
      description: "Email, password, delete account",
      onClick: () => navigate("/settings/account"),
    },
    {
      icon: Bell,
      label: "Notifications",
      description: "Manage your reminders",
      onClick: () => navigate("/settings/notifications"),
    },
    {
      icon: Ruler,
      label: "Body & Measurements",
      description: "Height, goal weight, units",
      onClick: () => navigate("/settings/display"),
    },
    {
      icon: Palette,
      label: "Theme",
      description: theme === "light" ? "Light" : theme === "dark" ? "Dark" : "System",
      onClick: () => {}, // Inline selection handled in render
      isInline: true,
    },
    {
      icon: Volume2,
      label: "Sound Effects",
      description: soundEnabled ? "Enabled" : "Disabled",
      onClick: () => {}, // Inline toggle handled in render
      isInline: true,
    },
    {
      icon: Download,
      label: "Data",
      description: "Export or clear your data",
      onClick: () => navigate("/settings/data"),
    },
  ];

  const legalSettings = [
    {
      icon: FileText,
      label: "Terms of Service",
      onClick: () => navigate("/settings/terms"),
    },
    {
      icon: Lock,
      label: "Privacy Policy",
      onClick: () => navigate("/settings/privacy"),
    },
  ];

  const supportSettings = [
    {
      icon: HelpCircle,
      label: "Help & Support",
      onClick: () => navigate("/settings/help"),
    },
    {
      icon: MessageSquare,
      label: "Feedback",
      onClick: handleSendFeedback,
    },
  ];

  return (
    <div className="fixed inset-0 bg-background flex flex-col app-top-padding">
      <div className="flex-1 min-h-0 scroll-container pb-24">
        {/* Header */}
        <MainHeader
          title="Settings"
          rightSlot={
            <Avatar 
              className="h-9 w-9 cursor-pointer" 
              onClick={() => navigate('/settings/account')}
            >
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback className="text-xs">
                {userName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          }
        />

        <div className="p-4 space-y-3 max-w-2xl mx-auto w-full">
        {/* Subscription Section - No outer wrapper, inner card has coral border */}
        <SettingsSubscriptionSection />

        {/* Main Settings List - Consistent spacing */}
        <div className="space-y-3 mt-3">
          {settingsSections.map((section) => (
            <div key={section.label}>
              {section.isInline && section.label === "Theme" ? (
                <div className="rounded-xl dark:border dark:border-border/50 bg-card p-4 shadow-[var(--shadow-card)]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <section.icon className="h-5 w-5 text-primary" />
                      </div>
                      <h3 className="font-semibold">{section.label}</h3>
                    </div>
                    <div className="flex gap-1 bg-muted rounded-lg p-1">
                      <button
                        onClick={() => setTheme("light")}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                          theme === "light" ? "bg-background shadow-sm" : "hover:bg-background/50"
                        }`}
                      >
                        Light
                      </button>
                      <button
                        onClick={() => setTheme("dark")}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                          theme === "dark" ? "bg-background shadow-sm" : "hover:bg-background/50"
                        }`}
                      >
                        Dark
                      </button>
                      <button
                        onClick={() => setTheme("system")}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                          theme === "system" ? "bg-background shadow-sm" : "hover:bg-background/50"
                        }`}
                      >
                        Auto
                      </button>
                    </div>
                  </div>
                </div>
              ) : section.isInline && section.label === "Sound Effects" ? (
                <div className="rounded-xl dark:border dark:border-border/50 bg-card p-4 shadow-[var(--shadow-card)]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <section.icon className="h-5 w-5 text-primary" />
                      </div>
                      <h3 className="font-semibold">{section.label}</h3>
                    </div>
                    <Switch
                      checked={soundEnabled}
                      onCheckedChange={toggleSound}
                    />
                  </div>
                </div>
              ) : (
                <button
                  onClick={section.onClick}
                  className="w-full rounded-xl dark:border dark:border-border/50 bg-card p-4 text-left transition-all hover:shadow-[var(--shadow-elevated)] shadow-[var(--shadow-card)]"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <section.icon className="h-5 w-5 text-primary" />
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

        {/* Legal - Combined into one expandable card */}
        <button
          onClick={() => navigate("/settings/terms")}
          className="w-full rounded-xl dark:border dark:border-border/50 bg-card p-4 text-left transition-all hover:shadow-[var(--shadow-elevated)] shadow-[var(--shadow-card)]"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <span className="font-semibold">Legal</span>
              <p className="text-sm text-muted-foreground">Terms of Service & Privacy Policy</p>
            </div>
          </div>
        </button>

        {/* Support - Combined into one card */}
        <button
          onClick={() => navigate("/settings/help")}
          className="w-full rounded-xl dark:border dark:border-border/50 bg-card p-4 text-left transition-all hover:shadow-[var(--shadow-elevated)] shadow-[var(--shadow-card)]"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <HelpCircle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <span className="font-semibold">Support</span>
              <p className="text-sm text-muted-foreground">Help & Feedback</p>
            </div>
          </div>
        </button>

        {/* Sign Out Button */}
        <Button 
          onClick={handleSignOut}
          variant="ghost" 
          className="w-full text-destructive hover:text-destructive/80 hover:bg-destructive/10 gap-2"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>

        {(import.meta.env.DEV || window.location.hostname.includes('lovable') || window.location.hostname.includes('localhost')) && (
          <Button
            onClick={handleResetOnboarding}
            variant="outline"
            className="w-full"
          >
            Reset Onboarding (Testing)
          </Button>
        )}

        {/* Version Number - Long press to open diagnostics */}
        <div 
          className="text-center text-xs text-muted-foreground/60 mt-4 select-none cursor-pointer"
          onTouchStart={() => {
            longPressTimerRef.current = setTimeout(() => {
              setShowDiagnostics(true);
            }, 1500);
          }}
          onTouchEnd={() => {
            if (longPressTimerRef.current) {
              clearTimeout(longPressTimerRef.current);
              longPressTimerRef.current = null;
            }
          }}
          onMouseDown={() => {
            longPressTimerRef.current = setTimeout(() => {
              setShowDiagnostics(true);
            }, 1500);
          }}
          onMouseUp={() => {
            if (longPressTimerRef.current) {
              clearTimeout(longPressTimerRef.current);
              longPressTimerRef.current = null;
            }
          }}
          onMouseLeave={() => {
            if (longPressTimerRef.current) {
              clearTimeout(longPressTimerRef.current);
              longPressTimerRef.current = null;
            }
          }}
        >
          Version {appVersion} {Capacitor.isNativePlatform() && `(Build ${appBuild})`}
        </div>
        </div>
      </div>
      
      {/* Hidden Diagnostics Modal */}
      <SubscriptionDiagnostics 
        open={showDiagnostics} 
        onOpenChange={setShowDiagnostics} 
      />
      {/* End of scroll-container */}

      <BottomNavigation />
    </div>
  );
};
