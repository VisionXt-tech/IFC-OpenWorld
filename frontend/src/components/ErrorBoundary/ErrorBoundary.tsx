import { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '@/utils/logger';
import './ErrorBoundary.css';

/**
 * Error Boundary Component
 *
 * Catches React errors in component tree and displays fallback UI.
 * Prevents entire app from crashing due to component errors.
 *
 * Usage:
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 */

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error details
    logger.error('[ErrorBoundary] Caught error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    // Update state with error info
    this.setState({
      errorInfo,
    });

    // Call optional error callback
    this.props.onError?.(error, errorInfo);

    // Send to error tracking service (e.g., Sentry)
    if (window.Sentry) {
      window.Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
          },
        },
      });
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <div className="error-icon">⚠️</div>
            <h1 className="error-title">Oops! Something went wrong</h1>
            <p className="error-message">
              We're sorry, but something unexpected happened. The application has encountered an error.
            </p>

            {this.state.error && (
              <details className="error-details">
                <summary>Error Details</summary>
                <div className="error-stack">
                  <strong>Error:</strong> {this.state.error.message}
                  <pre>{this.state.error.stack}</pre>
                </div>
                {this.state.errorInfo && (
                  <div className="error-component-stack">
                    <strong>Component Stack:</strong>
                    <pre>{this.state.errorInfo.componentStack}</pre>
                  </div>
                )}
              </details>
            )}

            <div className="error-actions">
              <button onClick={this.handleReset} className="btn btn-primary">
                Try Again
              </button>
              <button onClick={this.handleReload} className="btn btn-secondary">
                Reload Page
              </button>
            </div>

            <p className="error-support">
              If this problem persists, please contact support or{' '}
              <a href="https://github.com/VisionXt-tech/IFC-OpenWorld/issues" target="_blank" rel="noopener noreferrer">
                report an issue
              </a>
              .
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Augment window object for Sentry
 */
declare global {
  interface Window {
    Sentry?: {
      captureException: (error: Error, options?: { contexts?: { react?: { componentStack?: string } } }) => void;
    };
  }
}
