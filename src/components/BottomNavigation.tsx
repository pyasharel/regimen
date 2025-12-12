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
    <nav 
      className="fixed bottom-0 left-0 right-0 border-t border-border z-50"
      style={{ backgroundColor: "#1a1a1a" }}
    >
      {/* Interactive bar - DEBUG LAYER */}
      <div 
        className="flex items-center justify-around"
        style={{ 
          height: "56px",
          backgroundColor: "#00FF00", // bright green - should be exactly 56px tall
        }}
      >
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          const Icon = tab.icon;
          
          return (
            <button
              key={tab.name}
              onClick={() => handleNavigation(tab.path)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
                backgroundColor: "#0000FF", // blue - button area
                height: "48px", // explicit button height
                padding: "0 12px",
                border: "none",
                color: isActive ? "#FF6F61" : "#888888",
              }}
            >
              <Icon 
                style={{ 
                  width: "20px", 
                  height: "20px",
                  flexShrink: 0,
                  backgroundColor: "#FFFF00", // yellow - icon box
                }} 
              />
              <span 
                style={{ 
                  fontSize: "11px",
                  lineHeight: "1",
                  backgroundColor: "#FF00FF", // magenta - label box
                }}
              >
                {tab.name}
              </span>
            </button>
          );
        })}
      </div>
      
      {/* Safe area - DEBUG STRIP */}
      <div 
        style={{ 
          height: 'env(safe-area-inset-bottom, 0px)',
          backgroundColor: '#FF0000', // red - safe-area only
        }}
      />
    </nav>
  );
};
