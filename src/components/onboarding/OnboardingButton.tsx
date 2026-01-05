import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface OnboardingButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'text';
  className?: string;
  type?: 'button' | 'submit';
}

export function OnboardingButton({
  children,
  onClick,
  disabled = false,
  loading = false,
  variant = 'primary',
  className,
  type = 'button',
}: OnboardingButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        // Base styles
        "w-full py-4 px-6 rounded-xl font-semibold text-base transition-all duration-200",
        "active:scale-[0.98]",
        // Variants
        variant === 'primary' && [
          "bg-primary text-white",
          "hover:bg-primary/90",
          "disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed",
        ],
        variant === 'secondary' && [
          "bg-white text-[#333333] border-2 border-border",
          "hover:border-primary hover:text-primary",
          "disabled:opacity-50 disabled:cursor-not-allowed",
        ],
        variant === 'text' && [
          "text-[#666666] underline underline-offset-2",
          "hover:text-[#333333]",
          "disabled:opacity-50",
        ],
        className
      )}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading...</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}
