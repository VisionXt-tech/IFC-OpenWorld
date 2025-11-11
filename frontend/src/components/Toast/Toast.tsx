import { useEffect } from 'react';
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
 * Elegant notification system with animations
 */
function Toast({ message, type = 'info', duration = 3000, onClose, icon }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

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
    <div className={`toast toast--${type} animate-slide-in-right`} role="alert">
      <div className="toast__icon">{getIcon()}</div>
      <div className="toast__content">
        <p className="toast__message">{message}</p>
      </div>
      <button
        className="toast__close"
        onClick={onClose}
        aria-label="Close notification"
        type="button"
      >
        ✕
      </button>
    </div>
  );
}

export default Toast;
