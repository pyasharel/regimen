import { X } from 'lucide-react';
import { useState } from 'react';

interface PreviewModeBannerProps {
  onUpgrade: () => void;
}

export const PreviewModeBanner = ({ onUpgrade }: PreviewModeBannerProps) => {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  return (
    <div className="bg-white/80 dark:bg-white/5 backdrop-blur-sm border-b border-border/50 px-4 py-3">
      <div className="flex items-center justify-between gap-4 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0 w-1 h-8 bg-[#8B5CF6] rounded-full" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-foreground/90">
              Preview Mode
            </p>
            <p className="text-[12px] text-muted-foreground truncate">
              <button
                onClick={onUpgrade}
                className="text-[#8B5CF6] hover:text-[#7C3AED] font-medium transition-colors"
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
  );
};
