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
  const groupedShortcuts = getShortcutsHelp();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Keyboard Shortcuts" size="lg">
      <div className="shortcuts-help">
        <p className="shortcuts-intro">
          Use these keyboard shortcuts to navigate and control the application more efficiently.
        </p>

        {groupedShortcuts.map(({ category, shortcuts }) => (
          <div key={category} className="shortcuts-category">
            <h3 className="shortcuts-category-title">{category}</h3>
            <div className="shortcuts-list">
              {shortcuts.map((shortcut, idx) => (
                <div key={`${category}-${idx}`} className="shortcut-item">
                  <div className="shortcut-keys">
                    {shortcut.keys.split(' + ').map((key, keyIdx, arr) => (
                      <span key={keyIdx}>
                        <kbd className="shortcut-key">{key}</kbd>
                        {keyIdx < arr.length - 1 && <span className="shortcut-plus">+</span>}
                      </span>
                    ))}
                  </div>
                  <div className="shortcut-description">{shortcut.description}</div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {groupedShortcuts.length === 0 && (
          <div className="shortcuts-empty">
            <p>No keyboard shortcuts are currently registered.</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
