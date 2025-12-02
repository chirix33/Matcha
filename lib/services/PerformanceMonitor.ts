/**
 * Performance monitoring service for tracking API response times and identifying bottlenecks
 * Implements production-ready performance tracking for the matching pipeline
 */

interface MetricEntry {
  duration: number;
  timestamp: number;
  success: boolean;
  error?: string;
}

interface MetricStats {
  count: number;
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
  successRate: number;
}

export class PerformanceMonitor {
  private metrics: Map<string, MetricEntry[]> = new Map();
  private readonly MAX_METRICS_PER_KEY = 1000; // Keep last 1000 measurements per metric

  /**
   * Measure the execution time of an async operation
   */
  async measureAsync<T>(
    metricName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const start = performance.now();
    let success = true;
    let error: string | undefined;

    try {
      const result = await operation();
      return result;
    } catch (err) {
      success = false;
      error = err instanceof Error ? err.message : String(err);
      throw err;
    } finally {
      const duration = performance.now() - start;
      this.recordMetric(metricName, duration, success, error);
    }
  }

  /**
   * Record a metric manually
   */
  recordMetric(
    metricName: string,
    duration: number,
    success: boolean = true,
    error?: string
  ): void {
    if (!this.metrics.has(metricName)) {
      this.metrics.set(metricName, []);
    }

    const entries = this.metrics.get(metricName)!;
    entries.push({
      duration,
      timestamp: Date.now(),
      success,
      error,
    });

    // Keep only the most recent entries
    if (entries.length > this.MAX_METRICS_PER_KEY) {
      entries.shift();
    }
  }

  /**
   * Get statistics for a specific metric
   */
  getStats(metricName: string): MetricStats | null {
    const entries = this.metrics.get(metricName);
    if (!entries || entries.length === 0) {
      return null;
    }

    const durations = entries.map((e) => e.duration).sort((a, b) => a - b);
    const successCount = entries.filter((e) => e.success).length;

    return {
      count: entries.length,
      min: durations[0],
      max: durations[durations.length - 1],
      avg: durations.reduce((a, b) => a + b, 0) / durations.length,
      p50: durations[Math.floor(durations.length * 0.5)],
      p95: durations[Math.floor(durations.length * 0.95)],
      p99: durations[Math.floor(durations.length * 0.99)],
      successRate: successCount / entries.length,
    };
  }

  /**
   * Get all metric names
   */
  getMetricNames(): string[] {
    return Array.from(this.metrics.keys());
  }

  /**
   * Clear metrics for a specific key or all metrics
   */
  clearMetrics(metricName?: string): void {
    if (metricName) {
      this.metrics.delete(metricName);
    } else {
      this.metrics.clear();
    }
  }

  /**
   * Get summary of all metrics (useful for logging/debugging)
   */
  getSummary(): Record<string, MetricStats> {
    const summary: Record<string, MetricStats> = {};
    for (const name of this.metrics.keys()) {
      const stats = this.getStats(name);
      if (stats) {
        summary[name] = stats;
      }
    }
    return summary;
  }

  /**
   * Log performance summary to console (for debugging)
   */
  logSummary(): void {
    const summary = this.getSummary();
    console.log("[PerformanceMonitor] Performance Summary:");
    for (const [name, stats] of Object.entries(summary)) {
      console.log(
        `  ${name}: avg=${stats.avg.toFixed(2)}ms, p95=${stats.p95.toFixed(2)}ms, success=${(stats.successRate * 100).toFixed(1)}%`
      );
    }
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

