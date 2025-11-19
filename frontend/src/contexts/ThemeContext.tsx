/**
 * Theme System
 *
 * Provides dark/light theme support with system preference detection,
 * localStorage persistence, and smooth transitions.
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { logger } from '@/utils/logger';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

/**
 * Get system theme preference
 */
function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';

  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return isDark ? 'dark' : 'light';
}

/**
 * Theme Provider Component
 */
export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'app-theme',
}: ThemeProviderProps) {
  const [theme, setThemeState] = useLocalStorage<Theme>(storageKey, defaultTheme);
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme());

  // Resolve theme (handle 'system' option)
  const resolvedTheme: ResolvedTheme = theme === 'system' ? systemTheme : theme;

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      const newSystemTheme = e.matches ? 'dark' : 'light';
      setSystemTheme(newSystemTheme);
      logger.debug('[Theme] System theme changed:', newSystemTheme);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => { mediaQuery.removeEventListener('change', handleChange); };
  }, []);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;

    // Remove old theme classes
    root.classList.remove('light', 'dark');

    // Add new theme class
    root.classList.add(resolvedTheme);

    // Set color-scheme for native browser elements
    root.style.colorScheme = resolvedTheme;

    logger.debug('[Theme] Applied theme:', resolvedTheme, '(from', theme, ')');
  }, [resolvedTheme, theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    logger.info('[Theme] Theme changed to:', newTheme);
  };

  const toggleTheme = () => {
    const newTheme = resolvedTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to use theme
 */
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error('useTheme must be used within ThemeProvider');
  }

  return context;
}

/**
 * Theme Toggle Button Component
 */
export function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="theme-toggle"
      aria-label="Toggle theme"
      title={`Switch to ${resolvedTheme === 'light' ? 'dark' : 'light'} mode`}
    >
      {resolvedTheme === 'light' ? (
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M10 3V1M10 19V17M17 10H19M1 10H3M15.657 4.343L17.071 2.929M2.929 17.071L4.343 15.657M15.657 15.657L17.071 17.071M2.929 2.929L4.343 4.343"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="10" cy="10" r="4" fill="currentColor" />
        </svg>
      ) : (
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"
            fill="currentColor"
          />
        </svg>
      )}
    </button>
  );
}

/**
 * Theme Selector Component
 */
export function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="theme-selector">
      <label htmlFor="theme-select">Theme:</label>
      <select
        id="theme-select"
        value={theme}
        onChange={(e) => { setTheme(e.target.value as Theme); }}
        className="theme-select"
      >
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="system">System</option>
      </select>
    </div>
  );
}
