import { useState } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'iris.theme';

/**
 * Theme state for the dark/light toggle.
 * - `index.html` already applied the initial class to <html> before first
 *   paint (pre-empting a flash of the wrong theme).
 * - Persisted to localStorage; default follows the OS preference.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  );

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.classList.toggle('dark', next === 'dark');
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage unavailable — theme still applies for this session */
    }
    setTheme(next);
  };

  return { theme, toggle };
}
