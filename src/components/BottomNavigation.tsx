import { useNavigate, useLocation } from "react-router-dom";
import { Home, Layers, TrendingUp, Settings, BarChart3 } from "lucide-react";
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

export const BottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const triggerHaptic = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        await Haptics.impact({ style: ImpactStyle.Light });
      } else if ('vibrate' in navigator) {
        navigator.vibrate(30);
      }
    } catch (err) {
      console.log('Haptic failed:', err);
    }
  };

  const tabs = [
    { name: "Today", path: "/today", icon: Home },
    { name: "My Stack", path: "/stack", icon: Layers },
    { name: "Progress", path: "/progress", icon: TrendingUp },
    // { name: "Insights", path: "/insights", icon: BarChart3 }, // Hidden for beta
    { name: "Settings", path: "/settings", icon: Settings },
  ];

  const handleNavigation = (path: string) => {
    triggerHaptic();
    navigate(path);
  };

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 border-t border-border bg-card z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center justify-around h-14">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          const Icon = tab.icon;
          
          return (
            <button
              key={tab.name}
              onClick={() => handleNavigation(tab.path)}
              className={`flex flex-col items-center justify-center gap-0.5 h-full px-4 transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[11px] font-medium">{tab.name}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
