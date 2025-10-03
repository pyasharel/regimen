import { useNavigate } from "react-router-dom";
import { X, Sparkles, User, Bell, Palette, BarChart3, Download, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const SettingsScreen = () => {
  const navigate = useNavigate();

  const settingsSections = [
    {
      icon: User,
      label: "Account",
      description: "Email, password, delete account",
      onClick: () => {},
    },
    {
      icon: Bell,
      label: "Notifications",
      description: "Manage reminders and alerts",
      onClick: () => {},
    },
    {
      icon: Palette,
      label: "Theme",
      description: "Light, Dark, or System",
      onClick: () => {},
    },
    {
      icon: BarChart3,
      label: "Tracking Categories",
      description: "Customize what you track",
      onClick: () => {},
    },
    {
      icon: Download,
      label: "Export Data",
      description: "Download your data as CSV/PDF",
      onClick: () => {},
    },
    {
      icon: HelpCircle,
      label: "Help & Support",
      description: "FAQ and contact support",
      onClick: () => {},
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
        {/* Premium Banner */}
        <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-secondary p-6 shadow-xl">
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
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-white" />
                  Export data
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
        <Button variant="ghost" className="w-full text-primary hover:text-primary/80">
          Sign Out
        </Button>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 flex h-16 items-center justify-around border-t border-border bg-card/95 backdrop-blur-sm">
        {[
          { name: "Today", path: "/today", active: false },
          { name: "My Stack", path: "/stack", active: false },
          { name: "Progress", path: "/progress", active: false },
          { name: "Settings", path: "/settings", active: true },
        ].map((tab) => (
          <button
            key={tab.name}
            onClick={() => navigate(tab.path)}
            className={`flex flex-col items-center gap-1 transition-colors ${
              tab.active ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className="h-1 w-1 rounded-full" />
            <span className="text-[11px] font-medium">{tab.name}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};
