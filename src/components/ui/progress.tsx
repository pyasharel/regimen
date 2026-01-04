import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "@/lib/utils";

interface ProgressProps extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  /** Whether to animate the progress bar fill on mount */
  animateOnMount?: boolean;
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, animateOnMount = false, ...props }, ref) => {
  const [hasAnimated, setHasAnimated] = React.useState(false);
  
  React.useEffect(() => {
    if (animateOnMount && !hasAnimated) {
      // Small delay to ensure the element is mounted before animating
      const timer = setTimeout(() => setHasAnimated(true), 50);
      return () => clearTimeout(timer);
    }
  }, [animateOnMount, hasAnimated]);
  
  const shouldAnimate = animateOnMount && hasAnimated;
  
  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn("relative h-4 w-full overflow-hidden rounded-full bg-muted", className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          "h-full flex-1 bg-primary transition-all",
          shouldAnimate && "animate-progress-fill"
        )}
        style={{ 
          width: `${value || 0}%`,
          animationDuration: shouldAnimate ? '0.6s' : undefined
        }}
      />
    </ProgressPrimitive.Root>
  );
});
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
