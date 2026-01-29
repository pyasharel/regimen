# Memory: style/theme-persistence-strategy
Updated: 2026-01-29

To prevent theme 'flashes' or resets during cold boots, the app bootstraps the theme from Capacitor Preferences in main.tsx before the React root renders. ThemeProvider also reads from localStorage synchronously for instant initial paint. This dual-sync strategy ensures the stored theme (light/dark and design variant) persists across cold starts and background/foreground transitions on native platforms.

## Critical: Theme Bootstrap Timeout

The `bootstrapTheme()` function in main.tsx has a **500ms timeout** to prevent slow Capacitor Preferences reads from blocking app startup. This is critical because:

1. iOS cold starts after theme changes can cause Capacitor storage to be slow to respond
2. If `bootstrapTheme()` blocks indefinitely, the entire app boot is delayed
3. This can cause Splash.tsx to timeout with "slow connection" errors even though the session is valid

The timeout falls back to localStorage values (which ThemeProvider syncs on every theme change) to ensure the app boots quickly even if Capacitor Preferences is slow.

## Storage Sync Strategy

When a theme is changed:
1. ThemeProvider updates state immediately (React state)
2. ThemeProvider writes to BOTH localStorage AND Capacitor Preferences (async)
3. On next cold boot, main.tsx reads from Capacitor Preferences with timeout, falls back to localStorage
4. ThemeProvider syncs Capacitor → localStorage on mount if there's a mismatch
