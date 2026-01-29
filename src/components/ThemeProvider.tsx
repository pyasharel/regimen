import { createContext, useContext, useEffect, useState } from "react";
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

type Theme = "dark" | "light" | "system";
type DesignVariant = "classic" | "refined";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  designVariant: DesignVariant;
  setDesignVariant: (variant: DesignVariant) => void;
};

const initialState: ThemeProviderState = {
  theme: "dark",
  setTheme: () => null,
  designVariant: "refined",
  setDesignVariant: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

// Helper to get theme from storage (Capacitor Preferences for native, localStorage for web)
const getStoredTheme = async (storageKey: string): Promise<Theme | null> => {
  if (Capacitor.isNativePlatform()) {
    const { value } = await Preferences.get({ key: storageKey });
    return value as Theme | null;
  } else {
    return localStorage.getItem(storageKey) as Theme | null;
  }
};

// Helper to set theme in storage
const setStoredTheme = async (storageKey: string, theme: Theme): Promise<void> => {
  if (Capacitor.isNativePlatform()) {
    await Preferences.set({ key: storageKey, value: theme });
  } else {
    localStorage.setItem(storageKey, theme);
  }
};

// Helper to get design variant from storage
const getStoredVariant = async (storageKey: string): Promise<DesignVariant | null> => {
  if (Capacitor.isNativePlatform()) {
    const { value } = await Preferences.get({ key: storageKey });
    return value as DesignVariant | null;
  } else {
    return localStorage.getItem(storageKey) as DesignVariant | null;
  }
};

// Helper to set design variant in storage
const setStoredVariant = async (storageKey: string, variant: DesignVariant): Promise<void> => {
  if (Capacitor.isNativePlatform()) {
    await Preferences.set({ key: storageKey, value: variant });
  } else {
    localStorage.setItem(storageKey, variant);
  }
};

// Helper to get initial theme synchronously from localStorage (fallback for fast load)
const getInitialTheme = (storageKey: string, defaultTheme: Theme): Theme => {
  // Always try localStorage first for instant load (both web and native have localStorage)
  try {
    const localValue = localStorage.getItem(storageKey) as Theme | null;
    if (localValue && ['dark', 'light', 'system'].includes(localValue)) {
      return localValue;
    }
  } catch {
    // localStorage not available
  }
  return defaultTheme;
};

const getInitialVariant = (storageKey: string): DesignVariant => {
  try {
    const variantKey = `${storageKey}-variant`;
    const localValue = localStorage.getItem(variantKey) as DesignVariant | null;
    if (localValue === 'refined' || localValue === 'classic') {
      return localValue;
    }
  } catch {
    // localStorage not available
  }
  return 'refined';
};

export function ThemeProvider({
  children,
  defaultTheme = "dark",
  storageKey = "ui-theme",
  ...props
}: ThemeProviderProps) {
  // Start with theme from localStorage for instant load (no flash)
  const [theme, setThemeState] = useState<Theme>(() => getInitialTheme(storageKey, defaultTheme));
  const [designVariant, setDesignVariantState] = useState<DesignVariant>(() => getInitialVariant(storageKey));
  const [isLoaded, setIsLoaded] = useState(false);

  // Sync with Capacitor Preferences on mount (for native, ensure localStorage stays in sync)
  // Skip if main.tsx already bootstrapped the theme to avoid redundant reads
  useEffect(() => {
    const syncWithCapacitor = async () => {
      // Check if main.tsx already bootstrapped the theme (prevents double read on cold start)
      const alreadyBootstrapped = localStorage.getItem('theme_bootstrapped_session');
      if (alreadyBootstrapped) {
        console.log('[ThemeProvider] Theme already bootstrapped by main.tsx, skipping Capacitor sync');
        setIsLoaded(true);
        return;
      }

      try {
        // Add timeout to prevent unbounded Capacitor calls (match main.tsx pattern)
        const SYNC_TIMEOUT_MS = 500;
        
        const themeResult = await Promise.race([
          getStoredTheme(storageKey),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), SYNC_TIMEOUT_MS))
        ]);
        
        const variantKey = `${storageKey}-variant`;
        const variantResult = await Promise.race([
          getStoredVariant(variantKey),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), SYNC_TIMEOUT_MS))
        ]);
        
        // Only use Capacitor values if we got them before timeout
        if (themeResult && themeResult !== theme) {
          setThemeState(themeResult);
          try {
            localStorage.setItem(storageKey, themeResult);
          } catch { /* ignore */ }
        } else if (!themeResult && theme) {
          // Timeout or no value in Capacitor, save current theme there
          await setStoredTheme(storageKey, theme);
        }
        
        // Sync design variant
        if (variantResult === 'refined' || variantResult === 'classic') {
          if (variantResult !== designVariant) {
            setDesignVariantState(variantResult);
            try {
              localStorage.setItem(variantKey, variantResult);
            } catch { /* ignore */ }
          }
        } else if (variantResult === 'soft' || variantResult === 'refined-v2') {
          // Migrate old variants
          setDesignVariantState('refined');
          await setStoredVariant(variantKey, 'refined');
          try {
            localStorage.setItem(variantKey, 'refined');
          } catch { /* ignore */ }
        } else if (!variantResult) {
          // Save current variant to Capacitor
          await setStoredVariant(variantKey, designVariant);
        }
      } catch (error) {
        console.error('[ThemeProvider] Error syncing theme with Capacitor:', error);
      } finally {
        setIsLoaded(true);
      }
    };
    
    syncWithCapacitor();
  }, [storageKey]);

  // Apply theme to document
  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";

      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme]);

  // Apply design variant to document
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("design-classic", "design-refined");
    root.classList.add(`design-${designVariant}`);
  }, [designVariant]);

  const setTheme = async (newTheme: Theme) => {
    // Update state immediately for instant feedback
    setThemeState(newTheme);
    
    // Sync to both localStorage (for fast reload) and Capacitor Preferences
    try {
      localStorage.setItem(storageKey, newTheme);
    } catch { /* ignore */ }
    
    try {
      await setStoredTheme(storageKey, newTheme);
    } catch (error) {
      console.error('Error saving theme to Capacitor:', error);
    }
  };

  const setDesignVariant = async (newVariant: DesignVariant) => {
    const variantKey = `${storageKey}-variant`;
    
    // Update state immediately
    setDesignVariantState(newVariant);
    
    // Sync to both localStorage and Capacitor
    try {
      localStorage.setItem(variantKey, newVariant);
    } catch { /* ignore */ }
    
    try {
      await setStoredVariant(variantKey, newVariant);
    } catch (error) {
      console.error('Error saving design variant to Capacitor:', error);
    }
  };

  const value = {
    theme,
    setTheme,
    designVariant,
    setDesignVariant,
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};