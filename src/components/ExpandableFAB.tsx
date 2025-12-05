import { useState, useEffect, useRef } from "react";
import { Plus, Pill, ClipboardList, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

interface ExpandableFABProps {
  onAddMedication: () => void;
  onLogToday: () => void;
}

export const ExpandableFAB = ({ onAddMedication, onLogToday }: ExpandableFABProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const triggerHaptic = async (style: 'light' | 'medium' | 'heavy' = 'light') => {
    if (Capacitor.isNativePlatform()) {
      try {
        const impactStyle = style === 'light' ? ImpactStyle.Light : 
                           style === 'medium' ? ImpactStyle.Medium : ImpactStyle.Heavy;
        await Haptics.impact({ style: impactStyle });
      } catch (e) {
        // Haptics not available
      }
    }
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExpanded]);

  const handleMainClick = () => {
    triggerHaptic('light');
    setIsExpanded(!isExpanded);
  };

  const handleAddMedication = () => {
    triggerHaptic('medium');
    setIsExpanded(false);
    onAddMedication();
  };

  const handleLogToday = () => {
    triggerHaptic('medium');
    setIsExpanded(false);
    onLogToday();
  };

  return (
    <div 
      ref={containerRef}
      className="fixed right-5 flex flex-col items-end gap-3"
      style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}
    >
      {/* Expanded menu items */}
      <div className={cn(
        "flex flex-col gap-3 transition-all duration-200",
        isExpanded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      )}>
        {/* Log Today option */}
        <button
          onClick={handleLogToday}
          className="flex items-center gap-3 group"
        >
          <span className="px-3 py-2 bg-card/95 backdrop-blur-sm border border-border rounded-lg text-sm font-medium shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
            Log Today
          </span>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-coral shadow-lg transition-transform hover:scale-105 active:scale-95">
            <ClipboardList className="h-5 w-5 text-white" />
          </div>
        </button>

        {/* Add Medication option */}
        <button
          onClick={handleAddMedication}
          className="flex items-center gap-3 group"
        >
          <span className="px-3 py-2 bg-card/95 backdrop-blur-sm border border-border rounded-lg text-sm font-medium shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
            Add Medication
          </span>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary shadow-lg transition-transform hover:scale-105 active:scale-95">
            <Pill className="h-5 w-5 text-white" />
          </div>
        </button>
      </div>

      {/* Main FAB button */}
      <button
        onClick={handleMainClick}
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-full bg-primary ring-[3px] ring-white/80 dark:ring-black/80 transition-all hover:scale-105 active:scale-95 shadow-lg",
          isExpanded && "rotate-45"
        )}
      >
        <Plus className="h-6 w-6 text-white transition-transform" />
      </button>

      {/* Backdrop overlay when expanded */}
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-black/20 -z-10"
          onClick={() => setIsExpanded(false)}
        />
      )}
    </div>
  );
};
