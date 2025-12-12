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
      {/* Layer 1: Interactive navigation bar - fixed 56px height */}
      <div className="flex items-center justify-around h-14">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          const Icon = tab.icon;
          
          return (
            <button
              key={tab.name}
              onClick={() => handleNavigation(tab.path)}
              className={`flex flex-col items-center justify-center gap-1 py-2 px-3 transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <span className="text-[11px] font-medium leading-none">{tab.name}</span>
            </button>
          );
        })}
      </div>
      
      {/* Layer 2: Safe area filler - background only, no interactive content */}
      <div 
        className="bg-destructive"
        style={{ height: 'env(safe-area-inset-bottom, 0px)' }}
      />
    </nav>
  );
};
