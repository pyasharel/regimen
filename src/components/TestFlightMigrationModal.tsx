import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { persistentStorage } from '@/utils/persistentStorage';
import logoIcon from '@/assets/logo-regimen-icon-final.png';

const STORAGE_KEYS = {
  DISMISSED_AT: 'testflight_modal_dismissed_at',
  DISMISS_COUNT: 'testflight_modal_dismiss_count',
  MIGRATED: 'testflight_modal_migrated',
};

// App Store ID for Regimen
const APP_STORE_ID = '6753005449';
const APP_STORE_URL_NATIVE = `itms-apps://apps.apple.com/app/id${APP_STORE_ID}`;
const APP_STORE_URL_WEB = `https://apps.apple.com/app/id${APP_STORE_ID}`;

// 7 days in milliseconds
const REMIND_LATER_DELAY_MS = 7 * 24 * 60 * 60 * 1000;

interface TestFlightMigrationModalProps {
  isTestFlight: boolean;
}

export const TestFlightMigrationModal = ({ isTestFlight }: TestFlightMigrationModalProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (!isTestFlight) {
      setIsChecking(false);
      return;
    }

    const checkShouldShow = async () => {
      try {
        // Check if user has already migrated
        const hasMigrated = await persistentStorage.getBoolean(STORAGE_KEYS.MIGRATED, false);
        if (hasMigrated) {
          console.log('[TestFlightModal] User has migrated, not showing');
          setIsChecking(false);
          return;
        }

        // Check dismiss count
        const dismissCount = await persistentStorage.getNumber(STORAGE_KEYS.DISMISS_COUNT, 0);
        if (dismissCount !== null && dismissCount >= 2) {
          console.log('[TestFlightModal] Dismissed twice, not showing again');
          setIsChecking(false);
          return;
        }

        // Check if we should wait before showing again
        const dismissedAtStr = await persistentStorage.get(STORAGE_KEYS.DISMISSED_AT);
        if (dismissedAtStr) {
          const dismissedAt = new Date(dismissedAtStr).getTime();
          const now = Date.now();
          if (now - dismissedAt < REMIND_LATER_DELAY_MS) {
            console.log('[TestFlightModal] Reminder delay not passed, not showing');
            setIsChecking(false);
            return;
          }
        }

        // Show the modal after a short delay
        console.log('[TestFlightModal] Showing migration modal');
        setTimeout(() => {
          setIsOpen(true);
        }, 2000);
      } catch (error) {
        console.error('[TestFlightModal] Error checking modal state:', error);
      } finally {
        setIsChecking(false);
      }
    };

    checkShouldShow();
  }, [isTestFlight]);

  const handleGetApp = async () => {
    try {
      // Mark as migrated so we never show again
      await persistentStorage.setBoolean(STORAGE_KEYS.MIGRATED, true);
      
      // Try native URL scheme first (iOS handles this automatically)
      if (Capacitor.isNativePlatform()) {
        window.location.href = APP_STORE_URL_NATIVE;
      } else {
        // Fallback for web preview
        await Browser.open({ url: APP_STORE_URL_WEB });
      }
      
      setIsOpen(false);
    } catch (error) {
      console.error('[TestFlightModal] Error opening App Store:', error);
      // Ultimate fallback: try HTTPS URL
      try {
        await Browser.open({ url: APP_STORE_URL_WEB });
      } catch (e) {
        console.error('[TestFlightModal] Fallback also failed:', e);
      }
    }
  };

  const handleMaybeLater = async () => {
    try {
      // Increment dismiss count
      const currentCount = await persistentStorage.getNumber(STORAGE_KEYS.DISMISS_COUNT, 0) || 0;
      await persistentStorage.setNumber(STORAGE_KEYS.DISMISS_COUNT, currentCount + 1);
      
      // Store dismissal time
      await persistentStorage.set(STORAGE_KEYS.DISMISSED_AT, new Date().toISOString());
      
      console.log('[TestFlightModal] Dismissed, count:', currentCount + 1);
      setIsOpen(false);
    } catch (error) {
      console.error('[TestFlightModal] Error saving dismissal:', error);
      setIsOpen(false);
    }
  };

  if (!isTestFlight || isChecking) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleMaybeLater()}>
      <DialogContent className="max-w-[340px] rounded-3xl border-border/50 bg-card p-6" hideClose>
        <DialogHeader className="space-y-4">
          {/* Logo and sparkle icon */}
          <div className="flex justify-center">
            <div className="relative">
              <img 
                src={logoIcon} 
                alt="Regimen" 
                className="h-16 w-16 rounded-2xl"
              />
              <div className="absolute -top-1 -right-1 bg-primary rounded-full p-1">
                <Sparkles className="h-3 w-3 text-primary-foreground" />
              </div>
            </div>
          </div>
          
          <DialogTitle className="text-xl font-semibold text-center">
            We're Live on the App Store! 🎉
          </DialogTitle>
          
          <DialogDescription className="text-center text-muted-foreground text-sm leading-relaxed">
            Regimen is now officially available. Download the App Store version for the best experience and automatic updates.
          </DialogDescription>
        </DialogHeader>
        
        {/* Reassurance message */}
        <div className="mt-2 bg-muted/50 rounded-xl p-3 border border-border/30">
          <p className="text-xs text-muted-foreground text-center">
            <span className="font-medium text-foreground">Your data is safe.</span>
            {' '}Sign in with the same account and all your compounds, doses, and progress will be there.
          </p>
        </div>

        {/* Action buttons */}
        <div className="mt-4 space-y-2">
          <Button
            onClick={handleGetApp}
            className="w-full h-12 text-base font-medium rounded-xl"
          >
            Get the Official App
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            onClick={handleMaybeLater}
            className="w-full h-10 text-sm text-muted-foreground hover:text-foreground"
          >
            Maybe Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
