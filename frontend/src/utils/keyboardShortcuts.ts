/**
 * Keyboard Shortcuts Manager
 *
 * Provides a centralized system for managing keyboard shortcuts
 * with conflict detection and user customization support.
 */

import { useEffect, useRef } from 'react';
import { logger } from '@/utils/logger';

/**
 * Keyboard shortcut configuration
 */
export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  description: string;
  handler: (event: KeyboardEvent) => void;
  preventDefault?: boolean;
  enabled?: boolean;
}

/**
 * Shortcut registry
 */
class ShortcutRegistry {
  private shortcuts: Map<string, KeyboardShortcut>;

  constructor() {
    this.shortcuts = new Map();
  }

  register(id: string, shortcut: KeyboardShortcut): void {
    this.shortcuts.set(id, shortcut);
    logger.debug(`[Shortcuts] Registered: ${id} (${this.getShortcutString(shortcut)})`);
  }

  unregister(id: string): void {
    this.shortcuts.delete(id);
    logger.debug(`[Shortcuts] Unregistered: ${id}`);
  }

  getAll(): Map<string, KeyboardShortcut> {
    return new Map(this.shortcuts);
  }

  get(id: string): KeyboardShortcut | undefined {
    return this.shortcuts.get(id);
  }

  getShortcutString(shortcut: KeyboardShortcut): string {
    const parts: string[] = [];

    if (shortcut.ctrl) parts.push('Ctrl');
    if (shortcut.shift) parts.push('Shift');
    if (shortcut.alt) parts.push('Alt');
    if (shortcut.meta) parts.push('⌘');

    parts.push(shortcut.key.toUpperCase());

    return parts.join('+');
  }
}

export const shortcutRegistry = new ShortcutRegistry();

/**
 * Hook to register keyboard shortcuts
 */
export function useKeyboardShortcut(
  id: string,
  shortcut: Omit<KeyboardShortcut, 'enabled'>,
  deps: unknown[] = []
): void {
  const handlerRef = useRef(shortcut.handler);

  // Update handler ref when it changes
  useEffect(() => {
    handlerRef.current = shortcut.handler;
  }, [shortcut.handler]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check modifiers
      const ctrlMatch = shortcut.ctrl ? event.ctrlKey : !event.ctrlKey;
      const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
      const altMatch = shortcut.alt ? event.altKey : !event.altKey;
      const metaMatch = shortcut.meta ? event.metaKey : !event.metaKey;

      // Check key
      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

      if (ctrlMatch && shiftMatch && altMatch && metaMatch && keyMatch) {
        if (shortcut.preventDefault !== false) {
          event.preventDefault();
        }

        handlerRef.current(event);
      }
    };

    // Register shortcut
    shortcutRegistry.register(id, { ...shortcut, handler: handlerRef.current, enabled: true });

    // Add event listener
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      shortcutRegistry.unregister(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, shortcut.key, shortcut.ctrl, shortcut.shift, shortcut.alt, shortcut.meta, ...deps]);
}

/**
 * Hook for multiple shortcuts
 */
export function useKeyboardShortcuts(shortcuts: Record<string, Omit<KeyboardShortcut, 'enabled'>>): void {
  Object.entries(shortcuts).forEach(([id, shortcut]) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useKeyboardShortcut(id, shortcut);
  });
}

/**
 * Predefined shortcut combinations
 */
export const Shortcuts = {
  SAVE: { key: 's', ctrl: true, description: 'Save' },
  CANCEL: { key: 'Escape', description: 'Cancel/Close' },
  SEARCH: { key: 'k', ctrl: true, description: 'Search' },
  HELP: { key: '?', shift: true, description: 'Show help' },
  UNDO: { key: 'z', ctrl: true, description: 'Undo' },
  REDO: { key: 'y', ctrl: true, description: 'Redo' },
  COPY: { key: 'c', ctrl: true, description: 'Copy' },
  PASTE: { key: 'v', ctrl: true, description: 'Paste' },
  SELECT_ALL: { key: 'a', ctrl: true, description: 'Select all' },
  REFRESH: { key: 'r', ctrl: true, description: 'Refresh' },
  NEW: { key: 'n', ctrl: true, description: 'New' },
  OPEN: { key: 'o', ctrl: true, description: 'Open' },
  CLOSE: { key: 'w', ctrl: true, description: 'Close' },
  QUIT: { key: 'q', ctrl: true, description: 'Quit' },
} as const;

/**
 * Get OS-specific modifier key name
 */
export function getModifierKeyName(): string {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPod|iPad/i.test(navigator.platform);
  return isMac ? '⌘' : 'Ctrl';
}

/**
 * Format shortcut for display
 */
export function formatShortcut(shortcut: Pick<KeyboardShortcut, 'key' | 'ctrl' | 'shift' | 'alt' | 'meta'>): string {
  const parts: string[] = [];

  if (shortcut.ctrl) parts.push(getModifierKeyName());
  if (shortcut.shift) parts.push('⇧');
  if (shortcut.alt) parts.push('Alt');
  if (shortcut.meta) parts.push('⌘');

  parts.push(shortcut.key.toUpperCase());

  return parts.join(' + ');
}

/**
 * Keyboard Shortcuts Help Modal Data
 */
export function getShortcutsHelp(): { category: string; shortcuts: { keys: string; description: string }[] }[] {
  const shortcuts = Array.from(shortcutRegistry.getAll().entries());

  // Group by category (extract from id)
  const grouped = shortcuts.reduce<Record<string, { keys: string; description: string }[]>>((acc, [id, shortcut]) => {
    const category = id.split('.')[0] || 'General';

    if (!acc[category]) {
      acc[category] = [];
    }

    acc[category].push({
      keys: shortcutRegistry.getShortcutString(shortcut),
      description: shortcut.description,
    });

    return acc;
  }, {});

  return Object.entries(grouped).map(([category, shortcuts]) => ({
    category,
    shortcuts,
  }));
}
