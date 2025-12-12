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
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      borderTop: '1px solid hsl(var(--border))',
      backgroundColor: 'hsl(var(--card))',
      zIndex: 50
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        height: '56px',
        width: '100%',
        margin: 0,
        padding: 0
      }}>
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          const Icon = tab.icon;
          
          return (
            <button
              key={tab.name}
              onClick={() => handleNavigation(tab.path)}
              style={{
                all: 'unset', // Removes ALL default button styles
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                width: '80px',
                height: '56px', // Full height of container
                margin: 0,
                padding: 0,
                boxSizing: 'border-box',
                cursor: 'pointer',
                color: isActive ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                transition: 'color 0.2s'
              }}
            >
              <Icon style={{ 
                width: '20px', 
                height: '20px',
                flexShrink: 0,
                marginBottom: '2px'
              }} />
              <span style={{ 
                fontSize: '11px',
                fontWeight: 500,
                lineHeight: 1,
                marginTop: '2px'
              }}>
                {tab.name}
              </span>
            </button>
          );
        })}
      </div>
      
      <div style={{ 
        height: 'env(safe-area-inset-bottom, 0px)',
        backgroundColor: 'hsl(var(--card))'
      }} />
    </nav>
  );
};
