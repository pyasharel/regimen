import { useTheme } from "@/components/ThemeProvider";
import { Palette } from "lucide-react";
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

export const DesignVariantToggle = () => {
  const { designVariant, setDesignVariant } = useTheme();

  const triggerHaptic = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await Haptics.impact({ style: ImpactStyle.Light });
      } catch (e) {
        // Haptics not available
      }
    }
  };

  const toggleVariant = () => {
    triggerHaptic();
    const newVariant = designVariant === 'classic' ? 'soft' : 'classic';
    setDesignVariant(newVariant);
  };

  return (
    <button
      onClick={toggleVariant}
      className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all
                 bg-muted/50 hover:bg-muted border border-border/50"
      aria-label={`Switch to ${designVariant === 'classic' ? 'Soft' : 'Classic'} design`}
    >
      <Palette className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">{designVariant === 'classic' ? 'Classic' : 'Soft'}</span>
    </button>
  );
};
