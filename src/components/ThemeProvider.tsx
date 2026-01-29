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
  useEffect(() => {
    const syncWithCapacitor = async () => {
      try {
        // Check Capacitor Preferences (source of truth on native)
        const capacitorTheme = await getStoredTheme(storageKey);
        
        if (capacitorTheme && capacitorTheme !== theme) {
          // Capacitor has a different value, use it and sync localStorage
          setThemeState(capacitorTheme);
          try {
            localStorage.setItem(storageKey, capacitorTheme);
          } catch { /* ignore */ }
        } else if (!capacitorTheme && theme) {
          // No value in Capacitor, save current theme there
          await setStoredTheme(storageKey, theme);
        }
        
        // Sync design variant
        const variantKey = `${storageKey}-variant`;
        const capacitorVariant = await getStoredVariant(variantKey);
        
        if (capacitorVariant === 'refined' || capacitorVariant === 'classic') {
          if (capacitorVariant !== designVariant) {
            setDesignVariantState(capacitorVariant);
            try {
              localStorage.setItem(variantKey, capacitorVariant);
            } catch { /* ignore */ }
          }
        } else if (capacitorVariant === 'soft' || capacitorVariant === 'refined-v2') {
          // Migrate old variants
          setDesignVariantState('refined');
          await setStoredVariant(variantKey, 'refined');
          try {
            localStorage.setItem(variantKey, 'refined');
          } catch { /* ignore */ }
        } else if (!capacitorVariant) {
          // Save current variant to Capacitor
          await setStoredVariant(variantKey, designVariant);
        }
      } catch (error) {
        console.error('Error syncing theme with Capacitor:', error);
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