/**
 * Focus Trap Utility
 *
 * Traps focus within a container element, preventing tab navigation
 * from escaping the container. Essential for modal accessibility.
 */

import { useEffect, RefObject } from 'react';

const FOCUSABLE_ELEMENTS = [
  'a[href]',
  'area[href]',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[contenteditable]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Get all focusable elements within a container
 */
function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const elements = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_ELEMENTS));
  return elements.filter((el) => {
    // Filter out invisible elements
    return !!(
      el.offsetWidth ||
      el.offsetHeight ||
      el.getClientRects().length
    );
  });
}

/**
 * Creates a focus trap within the specified container
 *
 * @param container - The container element to trap focus within
 * @returns Cleanup function to remove the focus trap
 */
export function createFocusTrap(container: HTMLElement): () => void {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    const focusableElements = getFocusableElements(container);
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Shift + Tab: moving backwards
    if (e.shiftKey) {
      if (document.activeElement === firstElement && lastElement) {
        e.preventDefault();
        lastElement.focus();
      }
    }
    // Tab: moving forwards
    else {
      if (document.activeElement === lastElement && firstElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  };

  // Add listener
  container.addEventListener('keydown', handleKeyDown);

  // Focus first element
  const focusableElements = getFocusableElements(container);
  if (focusableElements.length > 0) {
    // Focus the first button or the first focusable element
    const firstButton = focusableElements.find((el) => el.tagName === 'BUTTON');
    const elementToFocus = firstButton || focusableElements[0];
    if (elementToFocus) {
      elementToFocus.focus();
    }
  }

  // Return cleanup function
  return () => {
    container.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * React hook for focus trap
 *
 * @param containerRef - Ref to the container element
 * @param isActive - Whether the focus trap is active
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement>,
  isActive: boolean
): void {
  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const cleanup = createFocusTrap(containerRef.current);
    return cleanup;
  }, [containerRef, isActive]);
}

// Export for direct usage
export { getFocusableElements };
