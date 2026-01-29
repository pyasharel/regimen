import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

interface NotificationPromptBannerProps {
  onEnable: () => Promise<boolean>;
  onDismiss: () => void;
}

/**
 * Lightweight banner shown on Today screen for existing users
 * when iOS notification permission is 'prompt' after reinstall
 */
export function NotificationPromptBanner({ onEnable, onDismiss }: NotificationPromptBannerProps) {
  const [isEnabling, setIsEnabling] = useState(false);

  const handleEnable = async () => {
    setIsEnabling(true);
    try {
      const granted = await onEnable();
      if (granted) {
        toast.success("Notifications enabled!");
      } else {
        toast.info("You can enable notifications later in Settings");
      }
    } finally {
      setIsEnabling(false);
    }
  };

  return (
    <div className="mx-4 mb-4 rounded-xl border border-primary/20 bg-primary/5 p-4 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
          <Bell className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground text-sm">Enable Dose Reminders</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Get notified when it's time for your next dose
          </p>
          <div className="flex gap-2 mt-3">
            <Button 
              size="sm"
              onClick={handleEnable}
              disabled={isEnabling}
              className="h-8 px-3 text-xs"
            >
              {isEnabling ? "Enabling..." : "Enable"}
            </Button>
            <Button 
              size="sm"
              variant="ghost"
              onClick={onDismiss}
              className="h-8 px-3 text-xs text-muted-foreground"
            >
              Not now
            </Button>
          </div>
        </div>
        <button 
          onClick={onDismiss}
          className="text-muted-foreground hover:text-foreground transition-colors p-1 -mt-1 -mr-1"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
