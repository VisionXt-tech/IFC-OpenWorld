/**
 * Local Storage Hook
 *
 * Provides a React hook for persisting state to localStorage
 * with automatic serialization/deserialization and SSR support.
 */

import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/utils/logger';

/**
 * Hook to persist state in localStorage
 *
 * @param key - localStorage key
 * @param initialValue - Initial value if not in storage
 * @returns [value, setValue, removeValue]
 *
 * @example
 * ```tsx
 * function Component() {
 *   const [theme, setTheme, removeTheme] = useLocalStorage('theme', 'light');
 *
 *   return (
 *     <button onClick={() => setTheme('dark')}>
 *       Switch to Dark
 *     </button>
 *   );
 * }
 * ```
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(() => {
    // SSR guard
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      logger.error(`[LocalStorage] Error reading ${key}:`, error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that persists to localStorage
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        // Allow value to be a function (same API as useState)
        const valueToStore = value instanceof Function ? value(storedValue) : value;

        // Save state
        setStoredValue(valueToStore);

        // Save to localStorage
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
          logger.debug(`[LocalStorage] Saved ${key}:`, valueToStore);
        }
      } catch (error) {
        logger.error(`[LocalStorage] Error saving ${key}:`, error);
      }
    },
    [key, storedValue]
  );

  // Remove value from localStorage
  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue);

      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
        logger.debug(`[LocalStorage] Removed ${key}`);
      }
    } catch (error) {
      logger.error(`[LocalStorage] Error removing ${key}:`, error);
    }
  }, [key, initialValue]);

  // Sync with storage events (when changed in another tab)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(JSON.parse(e.newValue) as T);
          logger.debug(`[LocalStorage] Synced ${key} from another tab`);
        } catch (error) {
          logger.error(`[LocalStorage] Error syncing ${key}:`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  return [storedValue, setValue, removeValue];
}

/**
 * Hook to persist object in localStorage with partial updates
 *
 * @param key - localStorage key
 * @param initialValue - Initial object value
 * @returns [value, updateValue, removeValue]
 *
 * @example
 * ```tsx
 * function Component() {
 *   const [settings, updateSettings] = useLocalStorageObject('settings', {
 *     theme: 'light',
 *     language: 'en'
 *   });
 *
 *   return (
 *     <button onClick={() => updateSettings({ theme: 'dark' })}>
 *       Switch Theme
 *     </button>
 *   );
 * }
 * ```
 */
export function useLocalStorageObject<T extends Record<string, unknown>>(
  key: string,
  initialValue: T
): [T, (updates: Partial<T>) => void, () => void] {
  const [value, setValue, removeValue] = useLocalStorage<T>(key, initialValue);

  const updateValue = useCallback(
    (updates: Partial<T>) => {
      setValue((prev) => ({ ...prev, ...updates }));
    },
    [setValue]
  );

  return [value, updateValue, removeValue];
}

/**
 * Hook to track if localStorage is available
 *
 * @returns boolean indicating localStorage availability
 */
export function useLocalStorageAvailable(): boolean {
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    try {
      const testKey = '__localStorage_test__';
      window.localStorage.setItem(testKey, 'test');
      window.localStorage.removeItem(testKey);
      setIsAvailable(true);
    } catch (error) {
      setIsAvailable(false);
      logger.warn('[LocalStorage] Not available:', error);
    }
  }, []);

  return isAvailable;
}
