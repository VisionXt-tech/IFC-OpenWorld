/**
 * Frontend Logger Utility
 *
 * Provides conditional logging based on debug mode.
 * Only logs in development or when debug flag is enabled.
 */

import { config } from '@/config';

class Logger {
  private isDebug: boolean;

  constructor() {
    this.isDebug = config.features.debug || import.meta.env.MODE === 'development';
  }

  debug(...args: unknown[]): void {
    if (this.isDebug) {
      console.log('[DEBUG]', ...args);
    }
  }

  info(...args: unknown[]): void {
    if (this.isDebug) {
      console.info('[INFO]', ...args);
    }
  }

  warn(...args: unknown[]): void {
    // Always show warnings
    console.warn('[WARN]', ...args);
  }

  error(...args: unknown[]): void {
    // Always show errors
    console.error('[ERROR]', ...args);
  }
}

export const logger = new Logger();
