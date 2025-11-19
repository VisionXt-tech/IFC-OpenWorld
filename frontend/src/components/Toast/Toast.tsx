import { useEffect, useState } from 'react';
import './Toast.css';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
  icon?: string;
}

/**
 * Toast Notification Component
 * Elegant notification system with smooth slide-in/slide-out animations
 */
function Toast({ message, type = 'info', duration = 3000, onClose, icon }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Auto-dismiss after duration
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => {
      clearTimeout(timer);
    };
  }, [duration]);

  const handleClose = () => {
    setIsExiting(true);
    // Wait for exit animation to complete before removing from DOM
    setTimeout(() => {
      onClose();
    }, 250); // Match animation duration in CSS
  };

  const getIcon = () => {
    if (icon) return icon;

    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
      default:
        return 'ℹ';
    }
  };

  return (
    <div
      className={`toast toast--${type} ${isExiting ? 'toast--exiting' : 'toast--entering'}`}
      role="alert"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="toast__icon">{getIcon()}</div>
      <div className="toast__content">
        <p className="toast__message">{message}</p>
      </div>
      <button
        className="toast__close"
        onClick={handleClose}
        aria-label="Close notification"
        type="button"
      >
        ✕
      </button>
    </div>
  );
}

export default Toast;
