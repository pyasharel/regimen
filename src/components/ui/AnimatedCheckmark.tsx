import { useReducedMotion } from '@/hooks/useReducedMotion';

interface AnimatedCheckmarkProps {
  isAnimating?: boolean;
  className?: string;
  size?: number;
}

/**
 * Animated SVG checkmark with draw-in animation.
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
          animation: shouldAnimate ? 'checkmark-draw 0.25s ease-out forwards' : 'none',
        }}
      />
    </svg>
  );
};

export default AnimatedCheckmark;
