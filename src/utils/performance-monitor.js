/**
 * Performance Monitor
 * Tracks and reports performance metrics for the extension
 */

export class PerformanceMonitor {
  constructor() {
    this.metrics = {
      highlightCreation: [],
      highlightRestoration: [],
      popupRender: [],
      storageOperations: []
    }
    this.enabled = false
  }

  /**
   * Enable performance monitoring
   */
  enable() {
    this.enabled = true
    console.log('[PerformanceMonitor] Monitoring enabled')
  }

  /**
   * Disable performance monitoring
   */
  disable() {
    this.enabled = false
    console.log('[PerformanceMonitor] Monitoring disabled')
  }

  /**
   * Start timing an operation
   */
  startTiming(operation) {
    if (!this.enabled) return null
    
    return {
      operation,
      startTime: performance.now(),
      startMemory: performance.memory ? performance.memory.usedJSHeapSize : null
    }
  }

  /**
   * End timing and record the result
   */
  endTiming(timing) {
    if (!this.enabled || !timing) return
    
    const endTime = performance.now()
    const duration = endTime - timing.startTime
    const endMemory = performance.memory ? performance.memory.usedJSHeapSize : null
    const memoryDelta = endMemory && timing.startMemory ? endMemory - timing.startMemory : null
    
    const metric = {
      timestamp: Date.now(),
      duration,
      memoryDelta
    }
    
    // Store metric
    if (!this.metrics[timing.operation]) {
      this.metrics[timing.operation] = []
    }
    this.metrics[timing.operation].push(metric)
    
    // Keep only last 100 metrics per operation
    if (this.metrics[timing.operation].length > 100) {
      this.metrics[timing.operation].shift()
    }
    
    return metric
  }

  /**
   * Measure a function's performance
   */
  async measure(operation, fn) {
    const timing = this.startTiming(operation)
    try {
      const result = await fn()
      const metric = this.endTiming(timing)
      if (metric && metric.duration > 50) {
        console.warn(`[PerformanceMonitor] Slow operation: ${operation} took ${metric.duration.toFixed(2)}ms`)
      }
      return result
    } catch (error) {
      this.endTiming(timing)
      throw error
    }
  }

  /**
   * Get performance report
   */
  getReport() {
    const report = {}
    
    Object.entries(this.metrics).forEach(([operation, metrics]) => {
      if (metrics.length === 0) return
      
      const durations = metrics.map(m => m.duration)
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length
      const maxDuration = Math.max(...durations)
      const minDuration = Math.min(...durations)
      
      report[operation] = {
        count: metrics.length,
        avgDuration: avgDuration.toFixed(2),
        minDuration: minDuration.toFixed(2),
        maxDuration: maxDuration.toFixed(2),
        lastDuration: durations[durations.length - 1].toFixed(2)
      }
    })
    
    return report
  }

  /**
   * Check if performance targets are met
   */
  checkPerformanceTargets() {
    const targets = {
      highlightCreation: 50, // < 50ms
      highlightRestoration: 5, // < 5ms per highlight
      popupRender: 100, // < 100ms
      storageOperations: 200 // < 200ms
    }
    
    const issues = []
    
    Object.entries(targets).forEach(([operation, targetMs]) => {
      const metrics = this.metrics[operation]
      if (!metrics || metrics.length === 0) return
      
      const avgDuration = metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length
      
      if (avgDuration > targetMs) {
        issues.push({
          operation,
          avgDuration: avgDuration.toFixed(2),
          target: targetMs,
          overBy: ((avgDuration - targetMs) / targetMs * 100).toFixed(0) + '%'
        })
      }
    })
    
    return issues
  }

  /**
   * Log performance report to console
   */
  logReport() {
    const report = this.getReport()
    const issues = this.checkPerformanceTargets()
    
    console.group('[PerformanceMonitor] Performance Report')
    console.table(report)
    
    if (issues.length > 0) {
      console.group('⚠️ Performance Issues')
      console.table(issues)
      console.groupEnd()
    } else {
      console.log('✅ All performance targets met!')
    }
    
    console.groupEnd()
  }

  /**
   * Clear all metrics
   */
  clear() {
    Object.keys(this.metrics).forEach(key => {
      this.metrics[key] = []
    })
    console.log('[PerformanceMonitor] Metrics cleared')
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor()

// Export for console access during development
if (process.env.NODE_ENV !== 'production') {
  window.__performanceMonitor = performanceMonitor
}