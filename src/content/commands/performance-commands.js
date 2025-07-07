/**
 * Performance Commands
 * Console commands for performance testing and monitoring
 */

import { performanceMonitor } from '../../utils/performance-monitor.js'
import { PerformanceTester } from '../../utils/performance-test.js'

// Make performance tools available in console
window.__performance = {
  // Enable/disable monitoring
  enable: () => {
    performanceMonitor.enable()
    console.log('Performance monitoring enabled. Create highlights to track performance.')
  },
  
  disable: () => {
    performanceMonitor.disable()
    console.log('Performance monitoring disabled.')
  },
  
  // Get performance report
  report: () => {
    performanceMonitor.logReport()
  },
  
  // Clear metrics
  clear: () => {
    performanceMonitor.clear()
  },
  
  // Run performance test
  test: async (highlightCount = 100) => {
    console.log(`Starting performance test with ${highlightCount} highlights...`)
    
    const tester = new PerformanceTester()
    const highlightEngine = window.__webHighlighterComponents?.highlightEngine
    
    if (!highlightEngine) {
      console.error('Highlight engine not found. Make sure extension is loaded.')
      return
    }
    
    // Enable monitoring for the test
    performanceMonitor.enable()
    
    // Run test
    const report = await tester.runPerformanceTest(highlightEngine)
    
    // Show monitoring report
    performanceMonitor.logReport()
    
    return report
  },
  
  // Generate test highlights without measuring
  generate: async (count = 10) => {
    const tester = new PerformanceTester()
    const highlights = await tester.generateTestHighlights(count)
    console.log(`Generated ${highlights.length} test highlights`)
    return highlights
  },
  
  // Check memory usage
  memory: () => {
    const tester = new PerformanceTester()
    return tester.measureMemoryUsage()
  }
}

// Instructions
console.log(`
🚀 Performance Tools Available:

__performance.enable()      - Start monitoring
__performance.disable()     - Stop monitoring
__performance.report()      - View performance metrics
__performance.clear()       - Clear metrics
__performance.test(100)     - Run performance test with 100 highlights
__performance.generate(50)  - Generate 50 test highlights
__performance.memory()      - Check memory usage

Example:
__performance.enable()
// Create some highlights manually...
__performance.report()
`)