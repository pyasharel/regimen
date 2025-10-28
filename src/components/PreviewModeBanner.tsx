import { X } from 'lucide-react';
import { useState } from 'react';

interface PreviewModeBannerProps {
  onUpgrade: () => void;
}

export const PreviewModeBanner = ({ onUpgrade }: PreviewModeBannerProps) => {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  return (
    <div className="bg-gradient-to-r from-[#FFF5F3] to-[#FFF0EE] dark:from-[#FF6F61]/5 dark:to-[#FF6F61]/10 border-b border-[#FFD4CF] dark:border-[#FF6F61]/20 px-4 py-3.5">
      <div className="flex items-center justify-between gap-3 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 flex-1">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#FF6F61]/10 flex items-center justify-center">
            <span className="text-lg">👀</span>
          </div>
          <div className="flex-1">
            <p className="text-[14px] font-medium text-[#1A1A1A] dark:text-white">
              Preview Mode
            </p>
            <p className="text-[13px] text-[#6B6B6B] dark:text-gray-400">
              Add 1 compound to try the app.{' '}
              <button
                onClick={onUpgrade}
                className="text-[#FF6F61] hover:text-[#E55A50] font-semibold underline decoration-[#FF6F61]/30 hover:decoration-[#FF6F61] transition-colors"
              >
                Subscribe for unlimited
              </button>
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsDismissed(true)}
          className="flex-shrink-0 w-6 h-6 rounded-full hover:bg-[#FF6F61]/10 dark:hover:bg-[#FF6F61]/20 flex items-center justify-center transition-colors text-[#8A8A8A] hover:text-[#FF6F61]"
          aria-label="Dismiss banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
