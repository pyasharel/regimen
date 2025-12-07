import { createContext, useContext, useEffect, useState } from "react";
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: "dark",
  setTheme: () => null,
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

export function ThemeProvider({
  children,
  defaultTheme = "dark",
  storageKey = "ui-theme",
  ...props
}: ThemeProviderProps) {
  // Start with default theme, then load from storage
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load theme from persistent storage on mount
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

  const value = {
    theme,
    setTheme,
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