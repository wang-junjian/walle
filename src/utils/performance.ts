/**
 * Performance monitoring utilities for API and component performance tracking
 */

export interface PerformanceMetrics {
  startTime: number;
  endTime?: number;
  duration?: number;
  memoryUsage?: number;
  apiCalls?: number;
}

export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics> = new Map();

  /**
   * Start tracking performance for a specific operation
   */
  start(operationId: string): void {
    this.metrics.set(operationId, {
      startTime: performance.now(),
      memoryUsage: this.getMemoryUsage(),
    });
  }

  /**
   * End tracking and calculate duration
   */
  end(operationId: string): PerformanceMetrics | null {
    const metric = this.metrics.get(operationId);
    if (!metric) return null;

    const endTime = performance.now();
    const updatedMetric = {
      ...metric,
      endTime,
      duration: endTime - metric.startTime,
    };

    this.metrics.set(operationId, updatedMetric);
    return updatedMetric;
  }

  /**
   * Get metrics for a specific operation
   */
  getMetrics(operationId: string): PerformanceMetrics | null {
    return this.metrics.get(operationId) || null;
  }

  /**
   * Get all tracked metrics
   */
  getAllMetrics(): Record<string, PerformanceMetrics> {
    return Object.fromEntries(this.metrics);
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
  }

  /**
   * Get memory usage (browser only)
   */
  private getMemoryUsage(): number {
    if (typeof window !== 'undefined' && 'memory' in performance) {
      return (performance as any).memory?.usedJSHeapSize || 0;
    }
    return 0;
  }

  /**
   * Log performance metrics to console (development only)
   */
  logMetrics(operationId: string): void {
    if (process.env.NODE_ENV === 'development') {
      const metrics = this.getMetrics(operationId);
      if (metrics) {
        console.group(`🔍 Performance Metrics: ${operationId}`);
        console.log(`⏱️ Duration: ${metrics.duration?.toFixed(2)}ms`);
        console.log(`🧠 Memory: ${(metrics.memoryUsage || 0) / 1024 / 1024}MB`);
        console.groupEnd();
      }
    }
  }
}

// Singleton instance for global usage
export const performanceMonitor = new PerformanceMonitor();

/**
 * Decorator for automatic performance tracking
 */
export function trackPerformance(operationName?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const operationId = operationName || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      performanceMonitor.start(operationId);
      try {
        const result = await originalMethod.apply(this, args);
        performanceMonitor.end(operationId);
        performanceMonitor.logMetrics(operationId);
        return result;
      } catch (error) {
        performanceMonitor.end(operationId);
        performanceMonitor.logMetrics(operationId);
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Simple performance timing utility
 */
export const timing = {
  start: (label: string) => {
    if (process.env.NODE_ENV === 'development') {
      performance.mark(`${label}-start`);
    }
  },
  
  end: (label: string) => {
    if (process.env.NODE_ENV === 'development') {
      performance.mark(`${label}-end`);
      performance.measure(label, `${label}-start`, `${label}-end`);
      
      const measure = performance.getEntriesByName(label, 'measure')[0];
      console.log(`⏱️ ${label}: ${measure.duration.toFixed(2)}ms`);
    }
  },
};

/**
 * Track API response metrics
 */
export interface APIMetrics {
  url: string;
  method: string;
  duration: number;
  status: number;
  size?: number;
  error?: string;
}

export const trackAPICall = async (
  url: string,
  fetchFn: () => Promise<Response>
): Promise<{ response: Response; metrics: APIMetrics }> => {
  const startTime = performance.now();
  
  try {
    const response = await fetchFn();
    const endTime = performance.now();
    
    const metrics: APIMetrics = {
      url,
      method: 'POST', // Assuming most are POST for chat API
      duration: endTime - startTime,
      status: response.status,
      size: response.headers.get('content-length') 
        ? parseInt(response.headers.get('content-length')!) 
        : undefined,
    };

    if (process.env.NODE_ENV === 'development') {
      console.log('📊 API Call Metrics:', metrics);
    }

    return { response, metrics };
  } catch (error) {
    const endTime = performance.now();
    const metrics: APIMetrics = {
      url,
      method: 'POST',
      duration: endTime - startTime,
      status: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    if (process.env.NODE_ENV === 'development') {
      console.error('📊 API Call Error:', metrics);
    }

    throw error;
  }
};
