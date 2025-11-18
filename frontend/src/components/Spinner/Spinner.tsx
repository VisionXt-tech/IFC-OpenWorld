/**
 * Spinner Component
 *
 * Loading spinner for async operations with customizable size and color
 */

import './Spinner.css';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'white' | 'danger' | 'success';
  label?: string;
  inline?: boolean;
}

export function Spinner({
  size = 'md',
  color = 'primary',
  label = 'Loading...',
  inline = false
}: SpinnerProps) {
  return (
    <div
      className={`spinner-container ${inline ? 'spinner-inline' : ''}`}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className={`spinner spinner-${size} spinner-${color}`}>
        <div className="spinner-circle"></div>
        <div className="spinner-circle"></div>
        <div className="spinner-circle"></div>
      </div>
      <span className="sr-only">{label}</span>
      {!inline && label && (
        <p className="spinner-label">{label}</p>
      )}
    </div>
  );
}

/**
 * Inline Spinner for buttons
 */
export function ButtonSpinner({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  return (
    <span className={`button-spinner button-spinner-${size}`} role="status" aria-label="Loading">
      <span className="spinner-dot"></span>
      <span className="spinner-dot"></span>
      <span className="spinner-dot"></span>
    </span>
  );
}
