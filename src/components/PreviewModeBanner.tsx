import { X } from 'lucide-react';

interface PreviewModeBannerProps {
  onUpgrade: () => void;
  onDismiss?: () => void;
  compoundCount?: number;
  freeCompoundName?: string;
}

export const PreviewModeBanner = ({ onUpgrade, onDismiss, compoundCount }: PreviewModeBannerProps) => {
  const handleSubscribeClick = () => {
    onUpgrade?.();
  };

  const title = 'Free Plan: Track 1 Compound';
  
  const subtitle = compoundCount && compoundCount > 1
    ? `to track all ${compoundCount} compounds`
    : compoundCount === 1
    ? 'for unlimited compounds'
    : 'Add your first compound to get started';
  
  const hasCompounds = compoundCount !== undefined && compoundCount > 0;

  return (
    <div className="safe-top">
      <div className="bg-background border-b border-border/60 px-4 py-2">
        <div className="flex items-center justify-between gap-4 max-w-4xl mx-auto w-full">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0 w-1 h-8 bg-secondary rounded-full" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-foreground/90">{title}</p>
              <p className="text-[12px] text-muted-foreground">
                {hasCompounds ? (
                  <>
                    <button
                      onClick={handleSubscribeClick}
                      className="text-secondary hover:text-secondary/90 font-medium transition-colors"
                    >
                      Subscribe
                    </button>{' '}
                    {subtitle}
                  </>
                ) : (
                  subtitle
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onDismiss}
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
