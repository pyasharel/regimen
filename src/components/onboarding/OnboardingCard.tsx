import { ReactNode } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OnboardingCardProps {
  children: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
  showCheckmark?: boolean;
  accentBorder?: boolean;
  delay?: number; // Animation delay in ms
}

export function OnboardingCard({
  children,
  selected = false,
  onClick,
  className,
  showCheckmark = true,
  accentBorder = false,
  delay = 0,
}: OnboardingCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        // Base styles
        "relative w-full text-left rounded-xl p-4 transition-all duration-200",
        "border-2 bg-white shadow-sm",
        "animate-in fade-in slide-in-from-bottom-4",
        // States
        selected
          ? "border-primary bg-primary/5"
          : "border-transparent hover:border-border hover:shadow-md",
        // Active state
        "active:scale-[0.98]",
        className
      )}
      style={{
        animationDelay: `${delay}ms`,
        animationFillMode: 'backwards',
      }}
    >
      {/* Left accent border - now coral with proper inset */}
      {accentBorder && (
        <div
          className={cn(
            "absolute left-3 top-3 bottom-3 w-1 rounded-full transition-colors",
            selected ? "bg-primary" : "bg-border"
          )}
        />
      )}

      {/* Content */}
      <div className={cn(accentBorder && "pl-4")}>
        {children}
      </div>

      {/* Checkmark */}
      {showCheckmark && selected && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center animate-in zoom-in-50">
            <Check className="h-4 w-4 text-white" />
          </div>
        </div>
      )}
    </button>
  );
}
