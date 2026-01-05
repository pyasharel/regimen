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
    ? `Time for your ${medicationName} dose 💊`
    : 'Time for your morning dose 💊';

  return (
    <div className="flex-1 flex flex-col">
      {/* Content centered */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {/* Headline first */}
        <h1 
          className="text-2xl font-bold text-[#333333] mb-3 text-center animate-in fade-in slide-in-from-bottom-4 duration-500"
        >
          Reminders keep you on track
        </h1>

        {/* Body */}
        <p 
          className="text-lg text-[#666666] text-center max-w-[280px] mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500"
          style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}
        >
          Get a nudge when it's time for your next dose
        </p>

        {/* Mock notification - below headline */}
        <div 
          className="w-full max-w-[300px] bg-white rounded-2xl shadow-lg p-4 animate-in slide-in-from-bottom-4 duration-500"
          style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}
        >
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
      <div 
        className="space-y-3 animate-in fade-in duration-500"
        style={{ animationDelay: '400ms', animationFillMode: 'backwards' }}
      >
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
