import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  refreshing: boolean;
  threshold?: number;
}

export function PullToRefreshIndicator({ 
  pullDistance, 
  refreshing, 
  threshold = 60 
}: PullToRefreshIndicatorProps) {
  if (pullDistance <= 0 && !refreshing) return null;

  const progress = Math.min(pullDistance / (threshold * 0.4), 1);
  const rotation = pullDistance * 3;
  const pastThreshold = pullDistance >= threshold * 0.4 || refreshing;

  return (
    <div 
      className="flex items-center justify-center overflow-hidden transition-[height] duration-200 ease-out"
      style={{ height: refreshing ? 40 : pullDistance > 0 ? Math.min(pullDistance, 50) : 0 }}
    >
      <div 
        className={cn(
          "flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200",
          pastThreshold ? "text-primary" : "text-muted-foreground"
        )}
        style={{ 
          opacity: refreshing ? 1 : progress,
          transform: refreshing ? undefined : `rotate(${rotation}deg) scale(${0.5 + progress * 0.5})`
        }}
      >
        <Loader2 
          className={cn(
            "w-5 h-5",
            refreshing && "animate-spin"
          )}
        />
      </div>
    </div>
  );
}
