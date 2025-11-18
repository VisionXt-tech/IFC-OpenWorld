/**
 * ThemeToggle Component
 *
 * Button to toggle between light/dark/system theme
 */

import { useTheme } from '@/contexts/ThemeContext';
import './ThemeToggle.css';

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const handleToggle = () => {
    // Cycle through: light → dark → system
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  // Icon based on resolved theme
  const icon = resolvedTheme === 'dark' ? '🌙' : '☀️';
  const label = theme === 'system' ? 'System' : theme === 'dark' ? 'Dark' : 'Light';

  return (
    <button
      onClick={handleToggle}
      className="theme-toggle"
      aria-label={`Current theme: ${label}. Click to change theme`}
      title={`Theme: ${label} (Click to cycle)`}
    >
      <span className="theme-toggle-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="theme-toggle-label">{label}</span>
    </button>
  );
}
