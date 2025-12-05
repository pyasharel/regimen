import { useNavigate, useLocation } from "react-router-dom";
import { Home, Layers, TrendingUp, Settings, BarChart3 } from "lucide-react";
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import { useState } from "react";

export const BottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [tappedTab, setTappedTab] = useState<string | null>(null);

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

  const handleNavigation = (path: string, name: string) => {
    triggerHaptic();
    setTappedTab(name);
    setTimeout(() => setTappedTab(null), 200);
    navigate(path);
  };

  // Calculate active tab index for pill position
  const activeIndex = tabs.findIndex(tab => location.pathname === tab.path || location.pathname.startsWith(tab.path + '/'));
  const tabWidth = 100 / tabs.length;

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-border bg-card/95 backdrop-blur-md z-50 pt-2" style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}>
      {/* Active indicator pill */}
      <div 
        className="absolute top-0 h-[3px] bg-primary rounded-full transition-all duration-300 ease-out"
        style={{ 
          width: `${tabWidth * 0.5}%`,
          left: `${activeIndex * tabWidth + tabWidth * 0.25}%`,
          opacity: activeIndex >= 0 ? 1 : 0,
        }}
      />
      
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path || location.pathname.startsWith(tab.path + '/');
          const isTapped = tappedTab === tab.name;
          const Icon = tab.icon;
          
          return (
            <button
              key={tab.name}
              onClick={() => handleNavigation(tab.path, tab.name)}
              className={`flex flex-col items-center gap-1 py-2 px-4 transition-all duration-200 relative ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <div className={`transition-transform duration-200 ${isTapped ? 'scale-90' : 'scale-100'} ${isActive && !isTapped ? 'animate-nav-bounce' : ''}`}>
                <Icon className={`h-5 w-5 transition-all duration-200 ${isActive ? 'stroke-[2.5px]' : 'stroke-[1.5px]'}`} />
              </div>
              <span className={`text-[11px] transition-all duration-200 ${isActive ? 'font-semibold opacity-100' : 'font-medium opacity-70'}`}>
                {tab.name}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
