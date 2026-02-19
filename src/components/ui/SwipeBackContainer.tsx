import { useSwipeBack } from "@/hooks/useSwipeBack";
import { ReactNode } from "react";

interface SwipeBackContainerProps {
  children: ReactNode;
  className?: string;
}

/**
 * Wraps a screen with native-feeling swipe-back gesture support.
 * The page physically follows the finger as you drag from the left edge,
 * then slides off to the right or snaps back depending on the threshold.
 */
export const SwipeBackContainer = ({ children, className = "" }: SwipeBackContainerProps) => {
  const { translateX, transition } = useSwipeBack();

  return (
    <div
      className={className}
      style={{
        transform: translateX > 0 ? `translateX(${translateX}px)` : undefined,
        transition: transition !== 'none' ? transition : undefined,
        willChange: translateX > 0 ? 'transform' : undefined,
      }}
    >
      {children}
    </div>
  );
};
