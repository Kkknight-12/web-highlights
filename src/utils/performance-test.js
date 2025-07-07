/**
 * Performance Testing Utilities
 * Tools for testing extension performance with large numbers of highlights
 */

export class PerformanceTester {
  constructor() {
    this.results = {
      highlightCreation: [],
      pageLoad: [],
      popupOpen: [],
      memoryUsage: []
    }
  }

  /**
   * Generate test data for performance testing
   */
  async generateTestHighlights(count = 100) {
    console.log(`[PerformanceTester] Generating ${count} test highlights...`)
    
    const startTime = performance.now()
    const highlights = []
    
    // Get all text nodes on the page
    const textNodes = this.getAllTextNodes()
    if (textNodes.length === 0) {
      console.error('[PerformanceTester] No text nodes found on page')
      return
    }
    
    // Generate highlights from random text selections
    for (let i = 0; i < count; i++) {
      const highlight = this.createRandomHighlight(textNodes, i)
      if (highlight) {
        highlights.push(highlight)
      }
    }
    
    const endTime = performance.now()
    console.log(`[PerformanceTester] Generated ${highlights.length} highlights in ${endTime - startTime}ms`)
    
    return highlights
  }

  /**
   * Get all text nodes on the page
   */
  getAllTextNodes() {
    const textNodes = []
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // Skip empty text nodes and script/style content
          if (!node.textContent.trim()) return NodeFilter.FILTER_REJECT
          const parent = node.parentElement
          if (!parent) return NodeFilter.FILTER_REJECT
          const tagName = parent.tagName.toLowerCase()
          if (tagName === 'script' || tagName === 'style' || tagName === 'noscript') {
            return NodeFilter.FILTER_REJECT
          }
          return NodeFilter.FILTER_ACCEPT
        }
      }
    )
    
    let node
    while (node = walker.nextNode()) {
      textNodes.push(node)
    }
    
    return textNodes
  }

  /**
   * Create a random highlight from available text nodes
   */
  createRandomHighlight(textNodes, index) {
    if (textNodes.length === 0) return null
    
    // Pick a random text node
    const randomNode = textNodes[Math.floor(Math.random() * textNodes.length)]
    const text = randomNode.textContent
    
    // Pick a random substring (5-50 characters)
    const minLength = 5
    const maxLength = Math.min(50, text.length)
    
    if (text.length < minLength) return null
    
    const length = Math.floor(Math.random() * (maxLength - minLength)) + minLength
    const startIndex = Math.floor(Math.random() * (text.length - length))
    const selectedText = text.substring(startIndex, startIndex + length).trim()
    
    if (!selectedText) return null
    
    // Create highlight data
    const colors = ['yellow', 'green', 'blue', 'pink']
    const color = colors[Math.floor(Math.random() * colors.length)]
    
    return {
      id: `test-highlight-${Date.now()}-${index}`,
      text: selectedText,
      color: color,
      url: window.location.href,
      timestamp: Date.now(),
      note: Math.random() > 0.7 ? `Test note ${index}` : '', // 30% chance of having a note
      context: {
        before: text.substring(Math.max(0, startIndex - 20), startIndex),
        after: text.substring(startIndex + length, Math.min(text.length, startIndex + length + 20))
      }
    }
  }

  /**
   * Measure highlight creation performance
   */
  async measureHighlightCreation(highlightEngine, count = 10) {
    console.log(`[PerformanceTester] Measuring highlight creation performance (${count} highlights)...`)
    
    const results = []
    const testHighlights = await this.generateTestHighlights(count)
    
    for (const highlight of testHighlights) {
      const startTime = performance.now()
      
      try {
        // Simulate text selection and highlight creation
        const selection = this.createSelection(highlight.text)
        if (selection) {
          await highlightEngine.createHighlight(highlight.text, highlight.color, selection)
        }
      } catch (error) {
        console.error('[PerformanceTester] Error creating highlight:', error)
      }
      
      const endTime = performance.now()
      const duration = endTime - startTime
      results.push(duration)
      
      // Small delay between highlights to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 10))
    }
    
    const avgTime = results.reduce((a, b) => a + b, 0) / results.length
    const maxTime = Math.max(...results)
    const minTime = Math.min(...results)
    
    console.log(`[PerformanceTester] Highlight creation results:`)
    console.log(`  Average: ${avgTime.toFixed(2)}ms`)
    console.log(`  Min: ${minTime.toFixed(2)}ms`)
    console.log(`  Max: ${maxTime.toFixed(2)}ms`)
    
    return { avgTime, minTime, maxTime, results }
  }

  /**
   * Create a text selection programmatically
   */
  createSelection(searchText) {
    // Find the text in the document
    const textNodes = this.getAllTextNodes()
    
    for (const node of textNodes) {
      const index = node.textContent.indexOf(searchText)
      if (index !== -1) {
        const range = document.createRange()
        range.setStart(node, index)
        range.setEnd(node, index + searchText.length)
        
        const selection = window.getSelection()
        selection.removeAllRanges()
        selection.addRange(range)
        
        return selection
      }
    }
    
    return null
  }

  /**
   * Measure page load performance with existing highlights
   */
  async measurePageLoadTime() {
    console.log('[PerformanceTester] Measuring page load time...')
    
    // This would need to be measured from the extension's initialization
    // We can estimate it by measuring highlight restoration time
    const startTime = performance.now()
    
    // Wait for highlights to be restored
    await new Promise(resolve => {
      const checkHighlights = setInterval(() => {
        const highlights = document.querySelectorAll('.web-highlighter-highlight')
        if (highlights.length > 0) {
          clearInterval(checkHighlights)
          resolve()
        }
      }, 100)
      
      // Timeout after 5 seconds
      setTimeout(() => {
        clearInterval(checkHighlights)
        resolve()
      }, 5000)
    })
    
    const endTime = performance.now()
    const loadTime = endTime - startTime
    
    console.log(`[PerformanceTester] Page load time: ${loadTime.toFixed(2)}ms`)
    return loadTime
  }

  /**
   * Measure memory usage
   */
  async measureMemoryUsage() {
    if (!performance.memory) {
      console.warn('[PerformanceTester] Memory API not available')
      return null
    }
    
    const memoryInfo = {
      usedJSHeapSize: (performance.memory.usedJSHeapSize / 1048576).toFixed(2) + ' MB',
      totalJSHeapSize: (performance.memory.totalJSHeapSize / 1048576).toFixed(2) + ' MB',
      jsHeapSizeLimit: (performance.memory.jsHeapSizeLimit / 1048576).toFixed(2) + ' MB'
    }
    
    console.log('[PerformanceTester] Memory usage:', memoryInfo)
    return memoryInfo
  }

  /**
   * Run comprehensive performance test
   */
  async runPerformanceTest(highlightEngine) {
    console.log('[PerformanceTester] Starting comprehensive performance test...')
    
    const report = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      tests: {}
    }
    
    // Test 1: Create 100 highlights
    console.log('\n=== Test 1: Creating 100 highlights ===')
    report.tests.highlightCreation100 = await this.measureHighlightCreation(highlightEngine, 100)
    
    // Test 2: Memory usage after creating highlights
    console.log('\n=== Test 2: Memory usage ===')
    report.tests.memoryAfterCreation = await this.measureMemoryUsage()
    
    // Test 3: Count total highlights
    const totalHighlights = document.querySelectorAll('.web-highlighter-highlight').length
    console.log(`\n=== Total highlights on page: ${totalHighlights} ===`)
    report.tests.totalHighlights = totalHighlights
    
    // Test 4: Measure popup open time (simulated)
    console.log('\n=== Test 4: Popup performance ===')
    const popupStartTime = performance.now()
    // Simulate popup data gathering
    const highlights = await chrome.storage.local.get(null)
    const popupEndTime = performance.now()
    report.tests.popupDataGathering = popupEndTime - popupStartTime
    console.log(`Popup data gathering: ${report.tests.popupDataGathering.toFixed(2)}ms`)
    
    console.log('\n[PerformanceTester] Performance test complete!')
    console.log('Full report:', report)
    
    return report
  }

  /**
   * Test performance on heavy websites
   */
  getHeavyTestSites() {
    return [
      { name: 'Reddit', url: 'https://www.reddit.com' },
      { name: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Main_Page' },
      { name: 'Medium', url: 'https://medium.com' },
      { name: 'GitHub', url: 'https://github.com' },
      { name: 'Stack Overflow', url: 'https://stackoverflow.com' }
    ]
  }
}

// Export for use in console
window.PerformanceTester = PerformanceTester