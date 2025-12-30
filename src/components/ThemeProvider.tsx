import { createContext, useContext, useEffect, useState } from "react";
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

type Theme = "dark" | "light" | "system";
type DesignVariant = "classic" | "soft";

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
  designVariant: "classic",
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

export function ThemeProvider({
  children,
  defaultTheme = "dark",
  storageKey = "ui-theme",
  ...props
}: ThemeProviderProps) {
  // Start with default theme, then load from storage
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [designVariant, setDesignVariantState] = useState<DesignVariant>("classic");
  const [isLoaded, setIsLoaded] = useState(false);

  // Load theme and design variant from persistent storage on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const stored = await getStoredTheme(storageKey);
        if (stored) {
          setThemeState(stored);
        } else {
          // No stored theme, save the default
          await setStoredTheme(storageKey, defaultTheme);
        }
        
        // Load design variant
        const variantKey = `${storageKey}-variant`;
        const storedVariant = await getStoredVariant(variantKey);
        if (storedVariant === 'soft' || storedVariant === 'classic') {
          setDesignVariantState(storedVariant);
        }
      } catch (error) {
        console.error('Error loading theme from storage:', error);
      } finally {
        setIsLoaded(true);
      }
    };
    
    loadTheme();
  }, [storageKey, defaultTheme]);

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
    root.classList.remove("design-classic", "design-soft");
    root.classList.add(`design-${designVariant}`);
  }, [designVariant]);

  const setTheme = async (newTheme: Theme) => {
    try {
      await setStoredTheme(storageKey, newTheme);
      setThemeState(newTheme);
    } catch (error) {
      console.error('Error saving theme to storage:', error);
      // Still update the state even if storage fails
      setThemeState(newTheme);
    }
  };

  const setDesignVariant = async (newVariant: DesignVariant) => {
    try {
      const variantKey = `${storageKey}-variant`;
      await setStoredVariant(variantKey, newVariant);
      setDesignVariantState(newVariant);
    } catch (error) {
      console.error('Error saving design variant to storage:', error);
      setDesignVariantState(newVariant);
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