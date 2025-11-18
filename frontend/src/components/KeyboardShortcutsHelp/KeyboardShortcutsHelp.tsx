/**
 * Keyboard Shortcuts Help Modal
 *
 * Displays all available keyboard shortcuts in a modal
 */

import { Modal } from '@/components/Modal';
import { getShortcutsHelp } from '@/utils/keyboardShortcuts';
import './KeyboardShortcutsHelp.css';

export interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsHelp({ isOpen, onClose }: KeyboardShortcutsHelpProps) {
  const shortcuts = getShortcutsHelp();

  // Group shortcuts by category (extracted from ID prefix)
  const groupedShortcuts = shortcuts.reduce((groups, shortcut) => {
    const category = shortcut.id.split('.')[0] || 'general';
    const categoryName = category.charAt(0).toUpperCase() + category.slice(1);

    if (!groups[categoryName]) {
      groups[categoryName] = [];
    }
    groups[categoryName].push(shortcut);
    return groups;
  }, {} as Record<string, typeof shortcuts>);

  const formatKeys = (shortcut: typeof shortcuts[0]): string => {
    const parts: string[] = [];
    if (shortcut.ctrl) parts.push('Ctrl');
    if (shortcut.shift) parts.push('Shift');
    if (shortcut.alt) parts.push('Alt');
    if (shortcut.meta) parts.push('⌘');

    // Capitalize single letters for display
    const key = shortcut.key.length === 1 ? shortcut.key.toUpperCase() : shortcut.key;
    parts.push(key);

    return parts.join(' + ');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Keyboard Shortcuts" size="lg">
      <div className="shortcuts-help">
        <p className="shortcuts-intro">
          Use these keyboard shortcuts to navigate and control the application more efficiently.
        </p>

        {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
          <div key={category} className="shortcuts-category">
            <h3 className="shortcuts-category-title">{category}</h3>
            <div className="shortcuts-list">
              {categoryShortcuts.map((shortcut) => (
                <div key={shortcut.id} className="shortcut-item">
                  <div className="shortcut-keys">
                    {formatKeys(shortcut).split(' + ').map((key, idx, arr) => (
                      <span key={idx}>
                        <kbd className="shortcut-key">{key}</kbd>
                        {idx < arr.length - 1 && <span className="shortcut-plus">+</span>}
                      </span>
                    ))}
                  </div>
                  <div className="shortcut-description">{shortcut.description}</div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {shortcuts.length === 0 && (
          <div className="shortcuts-empty">
            <p>No keyboard shortcuts are currently registered.</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
