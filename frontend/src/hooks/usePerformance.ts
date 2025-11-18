/**
 * Performance Monitoring Hooks
 *
 * Provides hooks for measuring and tracking component performance,
 * render times, and user interactions.
 */

import { useEffect, useRef, useCallback } from 'react';
import { logger } from '@/utils/logger';

/**
 * Performance mark interface
 */
interface PerformanceMark {
  name: string;
  startTime: number;
  duration?: number;
}

/**
 * Hook to measure component render time
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   useRenderTime('MyComponent');
 *   return <div>Content</div>;
 * }
 * ```
 */
export function useRenderTime(componentName: string, logThreshold = 16): void {
  const renderCount = useRef(0);
  const mountTime = useRef<number>(0);

  useEffect(() => {
    renderCount.current += 1;

    if (renderCount.current === 1) {
      // First render (mount)
      mountTime.current = performance.now();
      logger.debug(`[Performance] ${componentName} mounted`);
    } else {
      // Re-render
      const renderTime = performance.now() - mountTime.current;

      if (renderTime > logThreshold) {
        logger.warn(
          `[Performance] ${componentName} slow render #${renderCount.current}: ${renderTime.toFixed(2)}ms`
        );
      } else {
        logger.debug(
          `[Performance] ${componentName} render #${renderCount.current}: ${renderTime.toFixed(2)}ms`
        );
      }

      mountTime.current = performance.now();
    }

    return () => {
      if (renderCount.current === 1) {
        logger.debug(`[Performance] ${componentName} unmounted after ${renderCount.current} renders`);
      }
    };
  });
}

/**
 * Hook to measure async operation duration
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const measureAsync = useAsyncMeasure();
 *
 *   const handleClick = async () => {
 *     await measureAsync('fetchData', async () => {
 *       const data = await fetchData();
 *       return data;
 *     });
 *   };
 * }
 * ```
 */
export function useAsyncMeasure() {
  return useCallback(async <T,>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> => {
    const startTime = performance.now();

    try {
      const result = await operation();
      const duration = performance.now() - startTime;

      logger.debug(`[Performance] ${operationName} completed in ${duration.toFixed(2)}ms`);

      // Send to analytics if available
      if (window.gtag) {
        window.gtag('event', 'timing_complete', {
          name: operationName,
          value: Math.round(duration),
          event_category: 'Performance',
        });
      }

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      logger.error(`[Performance] ${operationName} failed after ${duration.toFixed(2)}ms:`, error);
      throw error;
    }
  }, []);
}

/**
 * Hook to track user interactions
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const trackInteraction = useInteractionTracking();
 *
 *   const handleClick = () => {
 *     trackInteraction('button_click', { button: 'submit' });
 *   };
 * }
 * ```
 */
export function useInteractionTracking() {
  return useCallback((
    eventName: string,
    properties?: Record<string, unknown>
  ): void => {
    logger.debug(`[Interaction] ${eventName}`, properties);

    // Google Analytics
    if (window.gtag) {
      window.gtag('event', eventName, properties);
    }

    // PostHog
    if (window.posthog) {
      window.posthog.capture(eventName, properties);
    }

    // Custom analytics
    if (window.analytics) {
      window.analytics.track(eventName, properties);
    }
  }, []);
}

/**
 * Hook to measure and track Web Vitals
 *
 * @example
 * ```tsx
 * function App() {
 *   useWebVitals();
 *   return <div>App</div>;
 * }
 * ```
 */
export function useWebVitals(): void {
  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') return;

    // Track First Contentful Paint (FCP)
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          logger.info(`[WebVitals] FCP: ${entry.startTime.toFixed(2)}ms`);

          if (window.gtag) {
            window.gtag('event', 'web_vitals', {
              metric: 'FCP',
              value: Math.round(entry.startTime),
            });
          }
        }
      }
    });

    try {
      observer.observe({ entryTypes: ['paint'] });
    } catch (error) {
      logger.warn('[WebVitals] PerformanceObserver not supported');
    }

    // Track Largest Contentful Paint (LCP)
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];

      if (lastEntry) {
        logger.info(`[WebVitals] LCP: ${lastEntry.startTime.toFixed(2)}ms`);

        if (window.gtag) {
          window.gtag('event', 'web_vitals', {
            metric: 'LCP',
            value: Math.round(lastEntry.startTime),
          });
        }
      }
    });

    try {
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (error) {
      logger.warn('[WebVitals] LCP not supported');
    }

    return () => {
      observer.disconnect();
      lcpObserver.disconnect();
    };
  }, []);
}

/**
 * Hook to track memory usage
 *
 * @example
 * ```tsx
 * function App() {
 *   const memoryUsage = useMemoryMonitor();
 *   console.log('Memory:', memoryUsage);
 * }
 * ```
 */
export function useMemoryMonitor(intervalMs = 10000): {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
} | null {
  const memoryRef = useRef<{
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  } | null>(null);

  useEffect(() => {
    // Check if memory API is available
    if (!performance.memory) {
      logger.warn('[Memory] Performance.memory API not available');
      return;
    }

    const checkMemory = () => {
      if (performance.memory) {
        const memory = {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
        };

        memoryRef.current = memory;

        const usedMB = (memory.usedJSHeapSize / 1024 / 1024).toFixed(2);
        const totalMB = (memory.totalJSHeapSize / 1024 / 1024).toFixed(2);
        const limitMB = (memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2);

        logger.debug(
          `[Memory] Used: ${usedMB}MB / Total: ${totalMB}MB / Limit: ${limitMB}MB`
        );

        // Warn if memory usage is high
        const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
        if (usagePercent > 80) {
          logger.warn(`[Memory] High memory usage: ${usagePercent.toFixed(2)}%`);
        }
      }
    };

    checkMemory();
    const interval = setInterval(checkMemory, intervalMs);

    return () => clearInterval(interval);
  }, [intervalMs]);

  return memoryRef.current;
}

/**
 * Hook to create performance marks and measures
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { mark, measure } = usePerformanceMark();
 *
 *   useEffect(() => {
 *     mark('data-fetch-start');
 *     fetchData().then(() => {
 *       mark('data-fetch-end');
 *       measure('data-fetch', 'data-fetch-start', 'data-fetch-end');
 *     });
 *   }, []);
 * }
 * ```
 */
export function usePerformanceMark() {
  const marks = useRef<Map<string, number>>(new Map());

  const mark = useCallback((name: string): void => {
    const time = performance.now();
    marks.current.set(name, time);

    try {
      performance.mark(name);
    } catch (error) {
      logger.debug('[Performance] Mark not supported:', error);
    }

    logger.debug(`[Performance] Mark: ${name} at ${time.toFixed(2)}ms`);
  }, []);

  const measure = useCallback((
    name: string,
    startMark: string,
    endMark: string
  ): number | null => {
    const startTime = marks.current.get(startMark);
    const endTime = marks.current.get(endMark);

    if (!startTime || !endTime) {
      logger.warn(`[Performance] Missing marks for measure: ${name}`);
      return null;
    }

    const duration = endTime - startTime;

    try {
      performance.measure(name, startMark, endMark);
    } catch (error) {
      logger.debug('[Performance] Measure not supported:', error);
    }

    logger.info(`[Performance] Measure: ${name} = ${duration.toFixed(2)}ms`);

    return duration;
  }, []);

  const clearMarks = useCallback((): void => {
    marks.current.clear();

    try {
      performance.clearMarks();
      performance.clearMeasures();
    } catch (error) {
      logger.debug('[Performance] Clear not supported:', error);
    }
  }, []);

  return { mark, measure, clearMarks };
}

/**
 * Augment window object for analytics
 */
declare global {
  interface Window {
    gtag?: (command: string, eventName: string, params?: Record<string, unknown>) => void;
    posthog?: {
      capture: (eventName: string, properties?: Record<string, unknown>) => void;
    };
    analytics?: {
      track: (eventName: string, properties?: Record<string, unknown>) => void;
    };
  }

  interface Performance {
    memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  }
}
