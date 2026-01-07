import { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OnboardingLayoutProps {
  children: ReactNode;
  progress: number;
  showBack?: boolean;
  onBack?: () => void;
  className?: string;
  showProgress?: boolean;
}

export function OnboardingLayout({
  children,
  progress,
  showBack = true,
  onBack,
  className,
  showProgress = true,
}: OnboardingLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5]">
      {/* Header with progress bar - extra top padding for iOS status bar */}
      <div className="px-4 pt-14 pb-4">
        {/* Back button row */}
        <div className="h-10 flex items-center">
          {showBack && onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1 text-[#666666] hover:text-[#333333] transition-colors -ml-1"
            >
              <ChevronLeft className="h-5 w-5" />
              <span className="text-sm font-medium">Back</span>
            </button>
          )}
        </div>

        {/* Progress bar */}
        {showProgress && (
          <div className="h-1 bg-[#E5E5E5] rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Content area */}
      <div className={cn(
        "flex-1 flex flex-col px-6 pb-8",
        className
      )}>
        {children}
      </div>
    </div>
  );
}
