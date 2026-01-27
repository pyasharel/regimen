import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Check, Gift, Copy } from 'lucide-react';
import { persistentStorage } from '@/utils/persistentStorage';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import logoIcon from '@/assets/logo-regimen-icon-final.png';

const STORAGE_KEYS = {
  DISMISSED_AT: 'testflight_modal_dismissed_at',
  DISMISS_COUNT: 'testflight_modal_dismiss_count',
  MIGRATED: 'testflight_modal_migrated',
};

// Promo code for beta testers
const BETA_PROMO_CODE = 'TRYREGIMEN';

// 7 days in milliseconds
const REMIND_LATER_DELAY_MS = 7 * 24 * 60 * 60 * 1000;

interface TestFlightMigrationModalProps {
  isTestFlight: boolean;
}

export const TestFlightMigrationModal = ({ isTestFlight }: TestFlightMigrationModalProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [codeCopied, setCodeCopied] = useState(false);
  const closeReasonRef = useRef<'none' | 'later' | 'migrate'>('none');

  const closeModal = (reason: 'later' | 'migrate') => {
    closeReasonRef.current = reason;
    setIsOpen(false);
  };

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

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(BETA_PROMO_CODE);
      setCodeCopied(true);
      
      if (Capacitor.isNativePlatform()) {
        await Haptics.impact({ style: ImpactStyle.Medium });
      }
      
      setTimeout(() => setCodeCopied(false), 2000);
    } catch (error) {
      console.error('[TestFlightModal] Error copying code:', error);
    }
  };

  const handleGotIt = async () => {
    closeModal('migrate');

    // Mark as migrated so we never show again
    try {
      await persistentStorage.setBoolean(STORAGE_KEYS.MIGRATED, true);
      console.log('[TestFlightModal] Marked as acknowledged');
    } catch (error) {
      console.error('[TestFlightModal] Error marking as acknowledged:', error);
    }
  };

  const handleMaybeLater = async () => {
    closeModal('later');

    try {
      const currentCount = (await persistentStorage.getNumber(STORAGE_KEYS.DISMISS_COUNT, 0)) || 0;
      await persistentStorage.setNumber(STORAGE_KEYS.DISMISS_COUNT, currentCount + 1);
      await persistentStorage.set(STORAGE_KEYS.DISMISSED_AT, new Date().toISOString());

      console.log('[TestFlightModal] Dismissed, count:', currentCount + 1);
    } catch (error) {
      console.error('[TestFlightModal] Error saving dismissal:', error);
    }
  };

  if (!isTestFlight || isChecking) {
    return null;
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (open) {
          setIsOpen(true);
          return;
        }

        const reason = closeReasonRef.current;
        closeReasonRef.current = 'none';

        // If the user tapped outside / dismissed without choosing, treat as "Maybe Later"
        if (reason === 'none') {
          void handleMaybeLater();
        }
      }}
    >
      <DialogContent className="max-w-[340px] rounded-3xl border-border/50 bg-card p-6" hideClose>
        <DialogHeader className="space-y-4">
          {/* Logo and warning icon */}
          <div className="flex justify-center">
            <div className="relative">
              <img 
                src={logoIcon} 
                alt="Regimen" 
                className="h-16 w-16 rounded-2xl"
              />
              <div className="absolute -top-1 -right-1 bg-amber-500 rounded-full p-1">
                <AlertTriangle className="h-3 w-3 text-white" />
              </div>
            </div>
          </div>
          
          <DialogTitle className="text-xl font-semibold text-center">
            Your TestFlight Version is Expiring
          </DialogTitle>
          
          <DialogDescription className="text-center text-muted-foreground text-sm leading-relaxed">
            This test version will stop working soon. Please search <span className="font-semibold text-foreground">"Regimen"</span> in the App Store to download the official version.
          </DialogDescription>
        </DialogHeader>
        
        {/* Thank you promo code */}
        <div className="mt-3 bg-primary/10 rounded-xl p-3 border border-primary/30">
          <div className="flex items-start gap-2">
            <Gift className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Thank you for beta testing!</span>
                {' '}Use this code in the App Store version for <span className="font-semibold text-primary">1 month FREE</span>:
              </p>
              <button
                onClick={handleCopyCode}
                className="mt-2 w-full flex items-center justify-center gap-2 bg-primary/20 hover:bg-primary/30 rounded-lg py-2 px-3 transition-colors"
              >
                <span className="font-mono font-bold text-foreground tracking-wider">{BETA_PROMO_CODE}</span>
                {codeCopied ? (
                  <Check className="h-4 w-4 text-primary" />
                ) : (
                  <Copy className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Important notice about TestFlight purchases */}
        <div className="mt-2 bg-amber-500/10 rounded-xl p-3 border border-amber-500/30">
          <p className="text-xs text-muted-foreground text-center">
            <span className="font-medium text-foreground">Note:</span>
            {' '}Any previous TestFlight purchases were for testing only — you were never charged.
          </p>
        </div>

        {/* Data reassurance */}
        <div className="mt-2 bg-muted/50 rounded-xl p-3 border border-border/30">
          <div className="flex items-start gap-2">
            <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Your data is safe.</span>
              {' '}Sign in with the same account and everything will be there.
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-4 space-y-2">
          <Button
            onClick={handleGotIt}
            className="w-full h-12 text-base font-medium rounded-xl"
          >
            Got It
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
