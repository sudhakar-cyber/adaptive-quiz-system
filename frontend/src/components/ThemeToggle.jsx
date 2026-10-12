import React, { useState, useEffect } from 'react';
import { SunIcon, MoonIcon } from './Icons';

/**
 * Custom hook to manage Dark / Light theme across LearnSmart dashboards
 */
export const useTheme = () => {
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('learnsmart_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      // Default to light or system preference
      return 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-theme', theme);
      document.body.setAttribute('data-theme', theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark-theme');
        document.body.classList.add('dark-theme');
      } else {
        document.documentElement.classList.remove('dark-theme');
        document.body.classList.remove('dark-theme');
      }
      localStorage.setItem('learnsmart_theme', theme);
    } catch (e) {
      console.warn('Theme storage error:', e);
    }

    const handleThemeEvent = (e) => {
      if (e.detail?.theme && e.detail.theme !== theme) {
        setTheme(e.detail.theme);
      }
    };

    const handleStorage = (e) => {
      if (e.key === 'learnsmart_theme' && e.newValue && e.newValue !== theme) {
        setTheme(e.newValue);
      }
    };

    window.addEventListener('learnsmart_theme_changed', handleThemeEvent);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('learnsmart_theme_changed', handleThemeEvent);
      window.removeEventListener('storage', handleStorage);
    };
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    try {
      document.documentElement.setAttribute('data-theme', nextTheme);
      document.body.setAttribute('data-theme', nextTheme);
      if (nextTheme === 'dark') {
        document.documentElement.classList.add('dark-theme');
        document.body.classList.add('dark-theme');
      } else {
        document.documentElement.classList.remove('dark-theme');
        document.body.classList.remove('dark-theme');
      }
      localStorage.setItem('learnsmart_theme', nextTheme);
    } catch (e) {
      console.warn('Theme storage error:', e);
    }
    window.dispatchEvent(
      new CustomEvent('learnsmart_theme_changed', { detail: { theme: nextTheme } })
    );
  };

  return { theme, toggleTheme, isDark: theme === 'dark' };
};

/**
 * Universal ThemeToggle button with symbols (Sun/Moon) for all Dashboards
 */
export const ThemeToggle = ({ className = '', style = {} }) => {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <button
      type="button"
      className={`theme-toggle-btn ${isDark ? 'dark-active' : 'light-active'} ${className}`}
      onClick={toggleTheme}
      style={style}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      id="theme-toggle-button"
    >
      <span className="theme-toggle-icon" aria-hidden="true">
        {isDark ? (
          <SunIcon size={17} color="#FBBF24" />
        ) : (
          <MoonIcon size={17} color="#475569" />
        )}
      </span>
      <span className="theme-toggle-text">
        {isDark ? 'Light' : 'Dark'}
      </span>
    </button>
  );
};

export default ThemeToggle;
