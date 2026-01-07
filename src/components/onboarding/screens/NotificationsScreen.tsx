import { OnboardingButton } from '../OnboardingButton';
import { Bell } from 'lucide-react';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';

interface NotificationsScreenProps {
  medicationName?: string;
  onEnable: () => void;
  onSkip: () => void;
}

export function NotificationsScreen({ medicationName, onEnable, onSkip }: NotificationsScreenProps) {
  const handleEnable = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        const permission = await LocalNotifications.requestPermissions();
        if (permission.display === 'granted') {
          toast.success('Notifications enabled!');
        }
      }
      onEnable();
    } catch (error) {
      console.error('[Notifications] Error:', error);
      onEnable();
    }
  };

  const notificationText = medicationName 
    ? `Time for your ${medicationName} dose`
    : 'Time for your morning dose';

  return (
    <div className="flex-1 flex flex-col">
      {/* Content positioned ~38% from top */}
      <div className="pt-[18vh] flex flex-col items-center">
        {/* Single simplified headline */}
        <h1 
          className="text-2xl font-bold text-[#333333] mb-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500"
        >
          Get a reminder when it's time for your next dose
        </h1>

        {/* Mock notification - with subtle pop-in animation */}
        <div 
          className="w-full max-w-[300px] bg-white rounded-2xl shadow-lg p-4"
          style={{ 
            animation: 'notification-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s backwards'
          }}
        >
          <style>{`
            @keyframes notification-pop {
              0% {
                opacity: 0;
                transform: scale(0.8) translateY(20px);
              }
              70% {
                transform: scale(1.02) translateY(-2px);
              }
              100% {
                opacity: 1;
                transform: scale(1) translateY(0);
              }
            }
          `}</style>
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-[#333333] text-sm">Regimen</p>
              <p className="text-[#666666] text-sm mt-0.5">
                {notificationText}
              </p>
              <p className="text-xs text-[#999999] mt-1">now</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTAs */}
      <div className="mt-auto space-y-3">
        <OnboardingButton onClick={handleEnable}>
          Enable Reminders
        </OnboardingButton>
        
        <button
          onClick={onSkip}
          className="w-full text-center text-[#999999] text-sm py-2 hover:text-[#666666] transition-colors"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
