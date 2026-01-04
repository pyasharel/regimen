import { useReducedMotion } from '@/hooks/useReducedMotion';

interface AnimatedCheckmarkProps {
  isAnimating?: boolean;
  className?: string;
  size?: number;
}

/**
 * Animated SVG checkmark with draw-in animation and scale overshoot.
 * Respects reduced motion preferences.
 */
export const AnimatedCheckmark = ({ 
  isAnimating = false, 
  className = '',
  size = 24 
}: AnimatedCheckmarkProps) => {
  const prefersReducedMotion = useReducedMotion();
  
  // If reduced motion is preferred, skip animation
  const shouldAnimate = isAnimating && !prefersReducedMotion;
  
  return (
    <div
      style={{
        display: 'inline-flex',
        transform: shouldAnimate ? 'scale(1)' : undefined,
        animation: shouldAnimate ? 'checkmark-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
      }}
    >
      <svg
        className={`${className}`}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline 
          points="20 6 9 17 4 12"
          style={{
            strokeDasharray: 24,
            strokeDashoffset: shouldAnimate ? 0 : 0,
            animation: shouldAnimate ? 'checkmark-draw 0.3s ease-out forwards' : 'none',
          }}
        />
      </svg>
    </div>
  );
};

export default AnimatedCheckmark;
