import { cn } from "@/lib/utils";

interface SwipeBackOverlayProps {
  active: boolean;
  translateX: number;
}

export const SwipeBackOverlay = ({ active, translateX }: SwipeBackOverlayProps) => {
  if (!active) return null;

  const progress = Math.min(translateX / 80, 1); // 0-1 based on threshold

  return (
    <>
      {/* Scrim overlay */}
      <div
        className="fixed inset-0 z-[9999] pointer-events-none"
        style={{
          backgroundColor: `rgba(0, 0, 0, ${progress * 0.15})`,
        }}
      />
      {/* Left edge indicator */}
      <div
        className="fixed top-0 bottom-0 left-0 z-[10000] pointer-events-none"
        style={{
          width: `${Math.min(translateX, 40)}px`,
          background: `linear-gradient(to right, hsl(var(--primary) / ${progress * 0.3}), transparent)`,
          transition: active ? 'none' : 'all 0.2s ease-out',
        }}
      />
      {/* Arrow chevron */}
      <div
        className="fixed top-1/2 -translate-y-1/2 z-[10000] pointer-events-none"
        style={{
          left: `${Math.min(translateX * 0.3, 24)}px`,
          opacity: progress,
          transition: active ? 'none' : 'all 0.2s ease-out',
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-primary"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </div>
    </>
  );
};
