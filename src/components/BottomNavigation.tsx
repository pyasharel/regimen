import { useNavigate, useLocation } from "react-router-dom";
import { Home, Layers, TrendingUp, Settings } from "lucide-react";
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
    { name: "Settings", path: "/settings", icon: Settings },
  ];

  const handleNavigation = (path: string) => {
    triggerHaptic();
    navigate(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-border bg-card z-50">
      <div 
        className="flex items-center justify-around px-2"
        style={{
          // Total height = content height (56px) + safe area
          height: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))',
          // Push content up by safe area amount, centering it in the visible 56px
          paddingBottom: 'env(safe-area-inset-bottom, 0px)'
        }}
      >
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          const Icon = tab.icon;
          
          return (
            <button
              key={tab.name}
              onClick={() => handleNavigation(tab.path)}
              className={`flex flex-col items-center justify-center gap-0.5 py-2 px-3 transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <span className="text-[11px] font-medium leading-tight">{tab.name}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
