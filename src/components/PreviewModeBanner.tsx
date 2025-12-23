import { X } from 'lucide-react';
import { useState } from 'react';

interface PreviewModeBannerProps {
  onUpgrade: () => void;
}

export const PreviewModeBanner = ({ onUpgrade }: PreviewModeBannerProps) => {
  const [isDismissed, setIsDismissed] = useState(false);

  // Always render safe-top container even when dismissed to prevent notch bleeding
  if (isDismissed) return <div className="safe-top" />;

  const handleSubscribeClick = () => {
    if (onUpgrade) {
      onUpgrade();
    }
  };

  return (
    <div className="safe-top">
      <div className="bg-background border-b border-border/60 px-4 h-14 flex items-center">
        <div className="flex items-center justify-between gap-4 max-w-4xl mx-auto w-full">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0 w-1 h-8 bg-secondary rounded-full" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-foreground/90">
                Preview Mode
              </p>
              <p className="text-[12px] text-muted-foreground truncate">
                <button
                  onClick={handleSubscribeClick}
                  className="text-secondary hover:text-secondary/90 font-medium transition-colors"
                >
                  Subscribe
                </button>
                {' '}for unlimited access
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsDismissed(true)}
            className="flex-shrink-0 w-6 h-6 rounded-md hover:bg-muted/80 flex items-center justify-center transition-colors text-muted-foreground/50 hover:text-muted-foreground"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
