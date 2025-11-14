import { useState, useEffect } from 'react';
import { X, Bell, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { cn } from '@/lib/utils';

type BannerType = 
  | 'enable-notifications'
  | 'photo-feature';

interface BannerConfig {
  id: BannerType;
  title: string;
  description: string;
  icon: any;
  action: string;
  link: string;
  shouldShow: () => boolean;
}

export const TodayBanner = () => {
  const navigate = useNavigate();
  const { isSubscribed } = useSubscription();
  const [currentBanner, setCurrentBanner] = useState<BannerConfig | null>(null);
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    // Load dismissed banners from localStorage
    const dismissedBanners = JSON.parse(localStorage.getItem('dismissedBanners') || '[]');
    setDismissed(dismissedBanners);

    // Check various conditions to determine which banner to show
    const signupDate = localStorage.getItem('signupDate');
    const notificationPermissionAsked = localStorage.getItem('notificationPermissionAsked');
    const notificationPermissionDenied = localStorage.getItem('notificationPermissionDenied') === 'true';
    const hasUploadedPhoto = localStorage.getItem('hasUploadedPhoto') === 'true';
    
    const daysSinceSignup = signupDate 
      ? (() => {
          const signupTime = new Date(signupDate).getTime();
          return isNaN(signupTime) ? 0 : Math.floor((Date.now() - signupTime) / (1000 * 60 * 60 * 24));
        })()
      : 0;
    
    const daysSinceNotificationDenial = notificationPermissionAsked && notificationPermissionDenied
      ? (() => {
          const askedTime = new Date(notificationPermissionAsked).getTime();
          return isNaN(askedTime) ? 0 : Math.floor((Date.now() - askedTime) / (1000 * 60 * 60 * 24));
        })()
      : 0;

    const banners: BannerConfig[] = [
      {
        id: 'enable-notifications',
        title: 'Never Miss a Dose',
        description: 'Enable notifications to stay on track with your regimen',
        icon: Bell,
        action: 'Enable Notifications',
        link: '/settings/notifications',
        shouldShow: () => 
          !isSubscribed &&
          notificationPermissionDenied && 
          daysSinceNotificationDenial >= 14 &&
          !dismissedBanners.includes('enable-notifications')
      },
      {
        id: 'photo-feature',
        title: 'Track Your Progress',
        description: 'Upload photos to see your transformation over time',
        icon: Camera,
        action: 'Learn More',
        link: '/progress',
        shouldShow: () => 
          isSubscribed &&
          !hasUploadedPhoto && 
          daysSinceSignup >= 7 &&
          !dismissedBanners.includes('photo-feature')
      }
    ];

    // Find the first banner that should be shown
    const bannerToShow = banners.find(b => b.shouldShow());
    setCurrentBanner(bannerToShow || null);
  }, [isSubscribed]);

  const handleDismiss = () => {
    if (!currentBanner) return;
    
    const updatedDismissed = [...dismissed, currentBanner.id];
    setDismissed(updatedDismissed);
    localStorage.setItem('dismissedBanners', JSON.stringify(updatedDismissed));
    setCurrentBanner(null);
  };

  const handleAction = () => {
    if (!currentBanner) return;
    navigate(currentBanner.link);
  };

  if (!currentBanner) return null;

  const Icon = currentBanner.icon;

  return (
    <div className="px-4 mb-4 animate-in slide-in-from-top-2 duration-300">
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Icon className="h-5 w-5 text-primary" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground mb-1">
              {currentBanner.title}
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              {currentBanner.description}
            </p>
            
            <button
              onClick={handleAction}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium",
                "bg-primary text-primary-foreground",
                "hover:bg-primary/90 transition-colors",
                "active:scale-95 transition-transform"
              )}
            >
              {currentBanner.action}
            </button>
          </div>

          <button
            onClick={handleDismiss}
            className="flex-shrink-0 -mr-1 -mt-1 p-1.5 rounded-full hover:bg-muted/50 transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
};
