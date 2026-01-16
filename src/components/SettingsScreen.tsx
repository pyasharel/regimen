import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { User, Palette, Download, HelpCircle, LogOut, Volume2, Bell, Ruler, Star, Share2, Heart } from "lucide-react";
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { InAppReview } from '@/plugins/InAppReviewPlugin';
import { Button } from "@/components/ui/button";
import { BottomNavigation } from "@/components/BottomNavigation";
import { useTheme } from "@/components/ThemeProvider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { trackSignOut, trackRatingRequested, trackFeedbackInitiated, trackShareAction, trackThemeChanged, trackSoundToggled } from "@/utils/analytics";
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
      trackSignOut();
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


  const toggleSound = (checked: boolean) => {
    setSoundEnabled(checked);
    localStorage.setItem('soundEnabled', String(checked));
    trackSoundToggled(checked);
  };

  const handleShareApp = async () => {
    trackShareAction('app');
    
    if (!Capacitor.isNativePlatform()) {
      toast.info('Sharing is available in the native app');
      return;
    }
    
    try {
      await Share.share({
        title: 'Check out Regimen',
        text: 'I use Regimen to track my health protocol. You should try it!',
        url: 'https://apps.apple.com/app/id6753005449',
        dialogTitle: 'Share Regimen',
      });
    } catch (error) {
      console.log('Share cancelled or failed:', error);
    }
  };

  const handleSendFeedback = () => {
    trackFeedbackInitiated();
    const email = "support@helloregimen.com";
    const subject = "Feedback & Feature Requests - Regimen App";
    const body = "Hi there,\n\nI'd like to share feedback about the Regimen app:\n\n";
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleRateApp = async () => {
    trackRatingRequested('settings');
    const isPluginAvailable = Capacitor.isPluginAvailable('InAppReview');
    
    if (Capacitor.isNativePlatform()) {
      if (!isPluginAvailable) {
        toast.error('Rating plugin not registered');
        return;
      }
      try {
        toast.info('Requesting rating prompt...', { duration: 2000 });
        await new Promise(resolve => setTimeout(resolve, 400));
        await InAppReview.requestReview();
      } catch (error) {
        toast.error('Rating prompt unavailable');
      }
    } else {
      toast.info('Rating is available in the native app');
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

  // legalSettings and supportSettings removed - consolidated into inline elements

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
                        onClick={() => { setTheme("light"); trackThemeChanged("light"); }}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                          theme === "light" ? "bg-background shadow-sm" : "hover:bg-background/50"
                        }`}
                      >
                        Light
                      </button>
                      <button
                        onClick={() => { setTheme("dark"); trackThemeChanged("dark"); }}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                          theme === "dark" ? "bg-background shadow-sm" : "hover:bg-background/50"
                        }`}
                      >
                        Dark
                      </button>
                      <button
                        onClick={() => { setTheme("system"); trackThemeChanged("system"); }}
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

        {/* Support */}
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

        {/* Spread the Word - Combined Share + Rate */}
        <div className="rounded-xl dark:border dark:border-border/50 bg-card p-4 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-4 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Heart className="h-5 w-5 text-primary" />
            </div>
            <div>
              <span className="font-semibold">Spread the Word</span>
              <p className="text-sm text-muted-foreground">Help others discover Regimen</p>
            </div>
          </div>
          <div className="flex gap-2 ml-14">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 gap-2"
              onClick={handleShareApp}
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 gap-2"
              onClick={handleRateApp}
            >
              <Star className="h-4 w-4" />
              Rate
            </Button>
          </div>
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

        {/* Footer: Legal Links + Version */}
        <div className="text-center mt-3 space-y-0.5">
          <div className="flex justify-center items-center gap-2 text-[10px] text-muted-foreground/50">
            <button 
              onClick={() => navigate("/settings/terms")}
              className="hover:text-muted-foreground transition-colors"
            >
              Terms
            </button>
            <span className="text-muted-foreground/30">·</span>
            <button 
              onClick={() => navigate("/settings/privacy")}
              className="hover:text-muted-foreground transition-colors"
            >
              Privacy
            </button>
          </div>
          <div 
            className="text-[10px] text-muted-foreground/40 select-none cursor-pointer"
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
