import { X } from 'lucide-react';
import { useState } from 'react';

interface PreviewModeBannerProps {
  onUpgrade: () => void;
}

export const PreviewModeBanner = ({ onUpgrade }: PreviewModeBannerProps) => {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  return (
    <div className="bg-[#FFF9E6] dark:bg-[#FFF9E6] border-b border-[#FDE68A] px-4 py-3 flex items-center gap-3">
      <span className="text-2xl">👀</span>
      <p className="flex-1 text-[14px] text-[#92400E]">
        Preview Mode: Add 1 compound to try the app.{' '}
        <button
          onClick={onUpgrade}
          className="font-semibold underline hover:opacity-80"
        >
          Subscribe for unlimited compounds.
        </button>
      </p>
      <button
        onClick={() => setIsDismissed(true)}
        className="text-[#92400E] hover:opacity-80"
      >
        <X size={18} />
      </button>
    </div>
  );
};
